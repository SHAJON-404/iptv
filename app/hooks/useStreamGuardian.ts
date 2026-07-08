"use client";

import { useEffect, useRef, useCallback } from "react";
import type Hls from "hls.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StreamHealthData {
  /** Seconds of buffered content ahead of currentTime */
  bufferDepth: number;
  /** Gap in seconds between currentTime and the live edge (0 for VOD) */
  latencyGap: number;
  /** Ratio of dropped frames to total frames (0-1) */
  droppedFrameRate: number;
  /** Estimated download bandwidth in bits/s */
  estimatedBandwidth: number;
  /** JS heap size in MB (Chromium only, -1 if unavailable) */
  memoryUsageMB: number;
  /** Whether the stream is currently detected as stalled */
  isStalled: boolean;
  /** Cumulative stall detections since stream start */
  stallCount: number;
  /** Cumulative auto-recovery actions taken */
  recoveryCount: number;
  /** Cumulative auto-pause prevention events */
  autoPausePreventionCount: number;
  /** Cumulative live-edge seeks */
  liveEdgeSeekCount: number;
}

export interface GuardianActions {
  /** Seek to the live edge of the current stream */
  seekToLiveEdge: () => void;
  /** Force a recovery action (re-initialize stream) */
  forceRecovery: () => void;
  /** Trim excess buffer to free memory */
  trimBuffers: () => void;
}

interface UseStreamGuardianOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.RefObject<Hls | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shakaRef: React.RefObject<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mpegtsRef: React.RefObject<any>;
  /** Whether the player is currently in an active playback state */
  isActive: boolean;
  /** Whether Max Quality Mode is enabled (affects thresholds) */
  isMaxQuality: boolean;
  /** Callback to trigger stream re-initialization for recovery */
  onForceRecovery: () => void;
  /** Whether the user intentionally paused */
  isUserPaused: boolean;
}

// Chromium-specific performance.memory API
interface ChromiumPerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ChromiumPerformance extends Performance {
  memory?: ChromiumPerformanceMemory;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Interval at which the guardian runs health checks (ms) */
const GUARDIAN_INTERVAL_MS = 2000;

/** Number of consecutive stalled ticks before declaring a stall */
const STALL_TICK_THRESHOLD = 3; // 3 ticks × 2s = 6s of no progress

/** Maximum latency gap before auto-seeking to live edge (seconds) */
const MAX_LATENCY_GAP_NORMAL = 25;
const MAX_LATENCY_GAP_MAX_QUALITY = 45;

/** Dropped frame rate threshold that triggers a warning */
const DROPPED_FRAME_RATE_THRESHOLD = 0.05; // 5%

/** Memory threshold in MB above which buffer trimming is triggered */
const MEMORY_PRESSURE_THRESHOLD_MB = 1500; // 1.5 GB heap usage

/** Minimum buffer depth (seconds) below which we consider the buffer critically low */
const CRITICAL_BUFFER_DEPTH_S = 2;

/** How frequently to trim buffers under memory pressure (ticks) */
const MEMORY_TRIM_INTERVAL_TICKS = 15; // every 30s

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStreamGuardian(options: UseStreamGuardianOptions): {
  streamHealth: StreamHealthData;
  guardianActions: GuardianActions;
} {
  const {
    videoRef,
    hlsRef,
    shakaRef,
    mpegtsRef,
    isActive,
    isMaxQuality,
    onForceRecovery,
    isUserPaused,
  } = options;

  // ── Stream Health Ref (avoiding state triggers/re-renders) ──────────────────
  const streamHealthRef = useRef<StreamHealthData>({
    bufferDepth: 0,
    latencyGap: 0,
    droppedFrameRate: 0,
    estimatedBandwidth: 0,
    memoryUsageMB: -1,
    isStalled: false,
    stallCount: 0,
    recoveryCount: 0,
    autoPausePreventionCount: 0,
    liveEdgeSeekCount: 0,
  });

  // ── Refs for mutable state across intervals ───────────────────────────────
  const lastTimeRef = useRef<number>(0);
  const stallTicksRef = useRef<number>(0);
  const stallCountRef = useRef<number>(0);
  const recoveryCountRef = useRef<number>(0);
  const autoPauseCountRef = useRef<number>(0);
  const liveEdgeSeekCountRef = useRef<number>(0);
  const tickCountRef = useRef<number>(0);
  const lastDroppedFramesRef = useRef<number>(0);
  const lastTotalFramesRef = useRef<number>(0);
  const isActiveRef = useRef(isActive);
  const isMaxQualityRef = useRef(isMaxQuality);
  const isUserPausedRef = useRef(isUserPaused);
  const onForceRecoveryRef = useRef(onForceRecovery);

  // Keep refs in sync
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { isMaxQualityRef.current = isMaxQuality; }, [isMaxQuality]);
  useEffect(() => { isUserPausedRef.current = isUserPaused; }, [isUserPaused]);
  useEffect(() => { onForceRecoveryRef.current = onForceRecovery; }, [onForceRecovery]);

  // ── Reset counters when stream changes ────────────────────────────────────
  useEffect(() => {
    if (isActive) {
      lastTimeRef.current = 0;
      stallTicksRef.current = 0;
      stallCountRef.current = 0;
      recoveryCountRef.current = 0;
      autoPauseCountRef.current = 0;
      liveEdgeSeekCountRef.current = 0;
      tickCountRef.current = 0;
      lastDroppedFramesRef.current = 0;
      lastTotalFramesRef.current = 0;
    }
  }, [isActive]);

  // ── Guardian Actions ──────────────────────────────────────────────────────

  const seekToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      // HLS.js live edge
      const hls = hlsRef.current;
      if (hls) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const liveSyncPos = (hls as any).liveSyncPosition;
        if (typeof liveSyncPos === "number" && isFinite(liveSyncPos)) {
          video.currentTime = liveSyncPos;
          liveEdgeSeekCountRef.current += 1;
          console.log(`[StreamGuardian] Seeked to HLS live sync position: ${liveSyncPos.toFixed(1)}s`);
          return;
        }
      }

      // Shaka Player live edge
      const shaka = shakaRef.current;
      if (shaka) {
        try {
          const seekRange = shaka.seekRange();
          if (seekRange && typeof seekRange.end === "number") {
            // Seek to 2s behind end to avoid edge buffer issues
            const targetTime = Math.max(seekRange.end - 2, seekRange.start);
            video.currentTime = targetTime;
            liveEdgeSeekCountRef.current += 1;
            console.log(`[StreamGuardian] Seeked to Shaka live edge: ${targetTime.toFixed(1)}s`);
            return;
          }
        } catch { /* ignore */ }
      }

      // Fallback: use video.seekable range
      if (video.seekable && video.seekable.length > 0) {
        const end = video.seekable.end(video.seekable.length - 1);
        const targetTime = Math.max(end - 2, video.seekable.start(0));
        video.currentTime = targetTime;
        liveEdgeSeekCountRef.current += 1;
        console.log(`[StreamGuardian] Seeked to seekable edge: ${targetTime.toFixed(1)}s`);
      }
    } catch (err) {
      console.warn("[StreamGuardian] Failed to seek to live edge:", err);
    }
  }, [videoRef, hlsRef, shakaRef]);

  const forceRecovery = useCallback(() => {
    recoveryCountRef.current += 1;
    console.log(`[StreamGuardian] Force recovery triggered (total: ${recoveryCountRef.current})`);
    onForceRecoveryRef.current();
  }, []);

  const trimBuffers = useCallback(() => {
    try {
      // HLS.js: trigger buffer flushing by temporarily reducing back buffer
      const hls = hlsRef.current;
      if (hls) {
        const video = videoRef.current;
        if (video && video.currentTime > 30) {
          // Flush buffer behind current position
          hls.config.backBufferLength = 5;
          // Restore after a tick
          setTimeout(() => {
            if (hlsRef.current) {
              hlsRef.current.config.backBufferLength = isMaxQualityRef.current ? 90 : 30;
            }
          }, 3000);
          console.log("[StreamGuardian] Trimmed HLS back buffer to reduce memory pressure");
        }
        return;
      }

      // Shaka Player: configure reduced buffer behind
      const shaka = shakaRef.current;
      if (shaka) {
        shaka.configure({ streaming: { bufferBehind: 10 } });
        setTimeout(() => {
          if (shakaRef.current) {
            shakaRef.current.configure({
              streaming: { bufferBehind: isMaxQualityRef.current ? 120 : 60 },
            });
          }
        }, 3000);
        console.log("[StreamGuardian] Trimmed Shaka back buffer to reduce memory pressure");
      }
    } catch (err) {
      console.warn("[StreamGuardian] Failed to trim buffers:", err);
    }
  }, [hlsRef, shakaRef, videoRef]);

  // ── Auto-Pause Prevention ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    const handleUnexpectedPause = () => {
      // If user intentionally paused, do nothing
      if (isUserPausedRef.current) return;
      // If the player is not supposed to be active, ignore
      if (!isActiveRef.current) return;
      // Check if video has enough data and was playing
      if (video.readyState < 2) return;

      // This is an unexpected pause — auto-resume
      setTimeout(() => {
        if (!video.paused) return; // Already resumed
        if (isUserPausedRef.current) return; // User paused during delay
        if (!isActiveRef.current) return;

        video.play()
          .then(() => {
            autoPauseCountRef.current += 1;
            console.log(
              `[StreamGuardian] Auto-resumed from unexpected pause ` +
              `(total: ${autoPauseCountRef.current}, readyState: ${video.readyState})`
            );
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.warn("[StreamGuardian] Auto-resume failed:", err.message);
            }
          });
      }, 200);
    };

    video.addEventListener("pause", handleUnexpectedPause);
    return () => {
      video.removeEventListener("pause", handleUnexpectedPause);
    };
  }, [videoRef, isActive]);

  // ── Main Guardian Interval ────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      tickCountRef.current += 1;

      // ── 1. Buffer Depth ────────────────────────────────────────────────
      let bufferDepth = 0;
      try {
        const buffered = video.buffered;
        if (buffered && buffered.length > 0) {
          for (let i = 0; i < buffered.length; i++) {
            if (buffered.start(i) <= video.currentTime && buffered.end(i) > video.currentTime) {
              bufferDepth = buffered.end(i) - video.currentTime;
              break;
            }
          }
        }
      } catch { /* ignore */ }

      // ── 2. Stall Detection ─────────────────────────────────────────────
      const currentTime = video.currentTime;
      let isStalled = false;

      if (!video.paused && video.readyState >= 2) {
        if (currentTime === lastTimeRef.current && currentTime > 0) {
          stallTicksRef.current += 1;
        } else {
          stallTicksRef.current = 0;
        }

        if (stallTicksRef.current >= STALL_TICK_THRESHOLD) {
          isStalled = true;
          stallCountRef.current += 1;
          console.warn(
            `[StreamGuardian] Stream stall detected! ` +
            `(stalled at ${currentTime.toFixed(1)}s for ${stallTicksRef.current * 2}s, ` +
            `total stalls: ${stallCountRef.current}, buffer: ${bufferDepth.toFixed(1)}s)`
          );

          // Recovery action: try seeking forward slightly or to live edge
          if (bufferDepth > CRITICAL_BUFFER_DEPTH_S) {
            // Buffer exists but playback stalled — nudge forward
            try {
              video.currentTime = currentTime + 0.5;
              console.log("[StreamGuardian] Nudged currentTime forward by 0.5s");
            } catch { /* ignore */ }
          } else {
            // No buffer — seek to live edge
            seekToLiveEdge();
          }

          // If stalled for too long (>12s), trigger full recovery
          if (stallTicksRef.current >= STALL_TICK_THRESHOLD * 2) {
            stallTicksRef.current = 0;
            forceRecovery();
          }
        }
      } else {
        stallTicksRef.current = 0;
      }

      lastTimeRef.current = currentTime;

      // ── 3. Latency Gap (live edge drift detection) ─────────────────────
      let latencyGap = 0;
      const maxLatency = isMaxQualityRef.current
        ? MAX_LATENCY_GAP_MAX_QUALITY
        : MAX_LATENCY_GAP_NORMAL;

      try {
        const hls = hlsRef.current;
        if (hls) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const liveSyncPos = (hls as any).liveSyncPosition;
          if (typeof liveSyncPos === "number" && isFinite(liveSyncPos) && liveSyncPos > 0) {
            latencyGap = liveSyncPos - currentTime;
            if (latencyGap > maxLatency && !video.paused && !isStalled) {
              console.log(
                `[StreamGuardian] Live edge drift detected: ${latencyGap.toFixed(1)}s behind ` +
                `(max: ${maxLatency}s). Auto-seeking to live edge.`
              );
              seekToLiveEdge();
            }
          }
        }

        const shaka = shakaRef.current;
        if (shaka && !hls) {
          try {
            const seekRange = shaka.seekRange();
            if (seekRange && typeof seekRange.end === "number" && seekRange.end > 0) {
              latencyGap = seekRange.end - currentTime;
              if (latencyGap > maxLatency && !video.paused && !isStalled) {
                console.log(
                  `[StreamGuardian] Shaka live edge drift: ${latencyGap.toFixed(1)}s behind. Auto-seeking.`
                );
                seekToLiveEdge();
              }
            }
          } catch { /* ignore */ }
        }

        // Fallback for native/mpegts
        if (!hls && !shaka && video.seekable && video.seekable.length > 0) {
          const end = video.seekable.end(video.seekable.length - 1);
          if (end > 0 && video.duration === Infinity) {
            latencyGap = end - currentTime;
            if (latencyGap > maxLatency && !video.paused) {
              console.log(
                `[StreamGuardian] Native live edge drift: ${latencyGap.toFixed(1)}s. Auto-seeking.`
              );
              seekToLiveEdge();
            }
          }
        }
      } catch { /* ignore */ }

      // ── 4. Dropped Frame Monitoring ────────────────────────────────────
      let droppedFrameRate = 0;
      try {
        const quality = video.getVideoPlaybackQuality?.();
        if (quality) {
          const totalDelta = quality.totalVideoFrames - lastTotalFramesRef.current;
          const droppedDelta = quality.droppedVideoFrames - lastDroppedFramesRef.current;
          if (totalDelta > 0) {
            droppedFrameRate = droppedDelta / totalDelta;
          }
          lastDroppedFramesRef.current = quality.droppedVideoFrames;
          lastTotalFramesRef.current = quality.totalVideoFrames;

          if (droppedFrameRate > DROPPED_FRAME_RATE_THRESHOLD && totalDelta > 30) {
            console.warn(
              `[StreamGuardian] High frame drop rate: ${(droppedFrameRate * 100).toFixed(1)}% ` +
              `(${droppedDelta}/${totalDelta} frames in last ${GUARDIAN_INTERVAL_MS / 1000}s)`
            );
          }
        }
      } catch { /* ignore */ }

      // ── 5. Bandwidth Estimation ────────────────────────────────────────
      let estimatedBandwidth = 0;
      try {
        const hls = hlsRef.current;
        if (hls) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bwEstimate = (hls as any).bandwidthEstimate;
          if (typeof bwEstimate === "number" && bwEstimate > 0) {
            estimatedBandwidth = bwEstimate;
          }
        }

        const shaka = shakaRef.current;
        if (shaka && !estimatedBandwidth) {
          try {
            const stats = shaka.getStats();
            if (stats && typeof stats.estimatedBandwidth === "number") {
              estimatedBandwidth = stats.estimatedBandwidth;
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }

      // ── 6. Memory Pressure Detection ───────────────────────────────────
      let memoryUsageMB = -1;
      try {
        const perfMemory = (performance as ChromiumPerformance).memory;
        if (perfMemory) {
          memoryUsageMB = Math.round(perfMemory.usedJSHeapSize / (1024 * 1024));

          // Periodic buffer trimming under memory pressure
          if (
            memoryUsageMB > MEMORY_PRESSURE_THRESHOLD_MB &&
            tickCountRef.current % MEMORY_TRIM_INTERVAL_TICKS === 0
          ) {
            console.warn(
              `[StreamGuardian] Memory pressure detected: ${memoryUsageMB}MB heap usage. Trimming buffers.`
            );
            trimBuffers();
          }
        }
      } catch { /* ignore */ }

      // ── 7. Critical buffer detection — proactive recovery ──────────────
      if (
        bufferDepth < CRITICAL_BUFFER_DEPTH_S &&
        !video.paused &&
        video.readyState >= 2 &&
        !isStalled &&
        currentTime > 1
      ) {
        // Try to kick the loading engine
        try {
          const hls = hlsRef.current;
          if (hls) {
            hls.startLoad(-1);
          }

          const shaka = shakaRef.current;
          if (shaka) {
            shaka.retryStreaming();
          }
        } catch { /* ignore */ }
      }

      // ── Update Ref values (does not trigger re-renders) ────────────────
      streamHealthRef.current = {
        bufferDepth,
        latencyGap,
        droppedFrameRate,
        estimatedBandwidth,
        memoryUsageMB,
        isStalled,
        stallCount: stallCountRef.current,
        recoveryCount: recoveryCountRef.current,
        autoPausePreventionCount: autoPauseCountRef.current,
        liveEdgeSeekCount: liveEdgeSeekCountRef.current,
      };
    }, GUARDIAN_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, videoRef, hlsRef, shakaRef, mpegtsRef, seekToLiveEdge, forceRecovery, trimBuffers]);

  return {
    streamHealth: streamHealthRef.current,
    guardianActions: {
      seekToLiveEdge,
      forceRecovery,
      trimBuffers,
    },
  };
}
