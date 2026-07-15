"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tv, Radio, Upload, ShieldAlert, Copy, Check, Link as LinkIcon } from "lucide-react";
import { FaGithub, FaTelegram, FaDiscord } from "react-icons/fa6";

// Hooks & Types
import { useIPTVPlaylists, Channel } from "../hooks/useIPTVPlaylists";
import { useVideoPlayer } from "../hooks/useVideoPlayer";

// UI Views
import { VideoPlayerView } from "./player/VideoPlayerView";
import { ChannelStats } from "./player/ChannelStats";
import { PlaylistSidebarView } from "./player/PlaylistSidebarView";
import { ChannelListView } from "./player/ChannelListView";
import { PlaylistManagerView } from "./player/PlaylistManagerView";
import { TrendingChannels } from "./player/TrendingChannels";

export default function IPTVPlayer() {
  const [retryKey, setRetryKey] = useState(0);
  const [vlcUrl, setVlcUrl] = useState("");
  const [copiedVlcUrl, setCopiedVlcUrl] = useState(false);

  useEffect(() => {
    fetch("/api/settings?key=vlcLiveUrl")
      .then(res => res.json())
      .then(data => {
        if (data.value) setVlcUrl(data.value);
      })
      .catch(console.error);
  }, []);

  // 1. Playlists and active channels state management via hook
  const {
    channels,
    setChannels,
    loading,
    error,
    selectedChannel,
    setSelectedChannel,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    displayCount,
    setDisplayCount,
    playlists,
    activePlaylistId,
    setActivePlaylistId,
    playlistTab,
    setPlaylistTab,
    importUrl,
    setImportUrl,
    playlistName,
    setPlaylistName,
    uploadPlaylistName,
    setUploadPlaylistName,
    isDragging,
    isImporting,
    importError,
    fileInputRef,
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUrlImport,
    handleDeletePlaylist,
    isUpdating,
    updateSuccess,
    refreshAllPlaylists,
  } = useIPTVPlaylists();

  // 2. Video Player logic and integrations via hook
  const {
    videoRef,
    playerWrapperRef,
    playerContainerRef,
    playerStatus,
    playerError,
    isBuffering,
    isPaused,
    isMuted,
    volume,
    isFullscreen,
    isPip,
    showControls,
    activeSeekIndicator,
    viewerCount,
    topChannels,
    isPipSupported,
    availableQualities,
    currentQuality,
    activeAutoQualityId,
    detectedResolution,
    maxQualityMode,
    handleQualityChange,
    handleToggleMaxQuality,
    handlePlayPause,
    handleMuteUnmute,
    handleVolumeChangeSlider,
    handleFullscreen,
    handlePip,
    handlePlayerClick,
    handlePlayerDoubleClick,
    handleReload,
    handleMouseMove,
    initializeStream,
    playerEngine,
    setPlayerEngine,
  } = useVideoPlayer(selectedChannel, retryKey, setRetryKey, () => {
    setChannels((currentChannels) => {
      if (currentChannels.length <= 1) return currentChannels;

      const currentIndex = currentChannels.findIndex(
        (c) => c.id === selectedChannel?.id || c.url === selectedChannel?.url
      );
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % currentChannels.length;
        const nextChan = currentChannels[nextIndex];
        setTimeout(() => {
          setSelectedChannel(nextChan);
          setRetryKey(k => k + 1);
        }, 0);
      }
      return currentChannels;
    });
  });

  // Dispatch channel changes to ViewerTracker
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("iptv-channel-changed", {
        detail: { channel: selectedChannel || null }
      })
    );
  }, [selectedChannel]);

  // 3. Selection handler orchestrating state & scrolling
  const handleChannelSelect = useCallback(
    (chan: Channel) => {
      setSelectedChannel(chan);
      initializeStream(chan, true);

      if (window.innerWidth < 1024 && playerWrapperRef.current) {
        setTimeout(() => {
          playerWrapperRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }
    },
    [setSelectedChannel, initializeStream, playerWrapperRef]
  );

  // 5. Memoized categories and channel collections
  const categories = useMemo(() => [
    "All",
    ...Array.from(new Set(channels.map((c) => c.group))),
  ], [channels]);

  const filteredChannels = useMemo(() => channels.filter((c) => {
    const matchesCategory =
      selectedCategory === "All" || c.group === selectedCategory;
    const matchesSearch = c.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [channels, selectedCategory, searchQuery]);

  const visibleChannels = useMemo(() => filteredChannels.slice(0, displayCount), [filteredChannels, displayCount]);
  const hasMore = displayCount < filteredChannels.length;

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pt-4 md:pt-6 min-h-screen pb-12 px-3 sm:px-4 md:px-6 text-white">
      {error ? (
        <div className="glass-card p-12 text-center space-y-6 border border-rose-500/20 max-w-2xl mx-auto rounded-3xl bg-rose-500/5">
          <ShieldAlert className="text-rose-500 mx-auto" size={48} />
          <h3 className="text-2xl font-bold">Something went wrong</h3>
          <p className="text-zinc-300 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary hover:bg-primary-dark font-bold rounded-2xl transition-all shadow-lg shadow-primary/20"
          >
            Reload Page
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full items-center animate-pulse">
          {/* Player Card Skeleton */}
          <div className="w-full flex justify-center">
            <div
              className="w-full aspect-video max-h-[75vh] rounded-2xl md:rounded-3xl bg-white/[0.01] border border-white/10 sm:border-white/5 flex items-center justify-center"
              style={{ maxWidth: "calc(75vh * 16 / 9)" }}
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Radio size={32} className="text-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* VLC Live URL & Community Banner Skeleton */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* VLC & PotPlayer URL Box Skeleton */}
            <div className="md:col-span-2 glass-card border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] p-5 flex flex-row items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex-shrink-0 animate-pulse" />
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="h-4 bg-white/10 rounded w-1/3 animate-pulse" />
                <div className="h-8 bg-white/5 border border-white/5 rounded-xl w-full animate-pulse" />
              </div>
            </div>

            {/* Community Box Skeleton */}
            <div className="md:col-span-1 glass-card border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] p-5 flex flex-col justify-between gap-4 w-full">
              <div className="flex items-center gap-3.5 w-full">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex-shrink-0 animate-pulse" />
                <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="h-8 bg-white/5 rounded-xl w-full animate-pulse" />
                <div className="h-8 bg-white/5 rounded-xl w-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Details & Counter Panels Skeletons */}
          {/* Desktop Stats Skeleton (Visible on md and larger) */}
          <div className="hidden md:grid grid-cols-3 gap-4 w-full">
            {/* Card 1 Details Skeleton */}
            <div className="glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center gap-4 bg-white/[0.01] w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-5 sm:h-6 bg-white/10 rounded-md w-3/5" />
                <div className="h-4.5 bg-white/10 rounded w-14" />
              </div>
            </div>

            {/* Card 2 Developer Info Skeleton */}
            <div className="glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-between gap-4 bg-white/[0.01] w-full">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/10 flex-shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-white/10 rounded w-16" />
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded-full bg-white/10" />
                    <div className="w-4 h-4 rounded-full bg-white/10" />
                    <div className="w-4 h-4 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
              <div className="hidden xs:block h-10 w-[1px] bg-white/10 flex-shrink-0" />
              <div className="space-y-1.5 flex-1 pl-1">
                <div className="h-2.5 bg-white/10 rounded w-11/12" />
                <div className="h-2.5 bg-white/10 rounded w-4/5" />
              </div>
            </div>

            {/* Card 3 Channels Count Skeleton */}
            <div className="glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center gap-4 bg-white/[0.01] w-full">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/10 flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-5 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          </div>

          {/* Mobile Stats Skeleton (Visible on mobile/tablet) */}
          <div className="grid grid-cols-1 gap-4 w-full md:hidden">
            <div className="glass-card p-3 border border-white/10 rounded-2xl bg-white/[0.01] w-full flex items-center">
              {/* Left Side: Channel details skeleton (65% width) */}
              <div className="w-[65%] flex items-center gap-3 min-w-0 border-r border-white/10 pr-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex-shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
              {/* Right Side: Total count skeleton (35% width) */}
              <div className="w-[35%] flex items-center gap-2 min-w-0 pl-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex-shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-2.5 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            </div>
          </div>

          {/* Channels List Skeleton Card */}
          <div className="w-full glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col h-[600px] sm:h-[700px]">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 sm:border-white/5 mb-3 sm:mb-4 flex-wrap gap-2 animate-pulse">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 sm:border-white/5 w-full sm:w-auto gap-2">
                <div className="h-8 bg-white/10 rounded-lg w-28 sm:w-32" />
                <div className="h-8 bg-white/5 rounded-lg w-28 sm:w-32" />
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 sm:border-white/5 w-full sm:w-auto gap-2">
                <div className="h-8 bg-white/5 rounded-lg w-20" />
                <div className="h-8 bg-white/10 rounded-lg w-32" />
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 pb-3 sm:pb-4 border-b border-white/10 sm:border-white/5 animate-pulse">
              <div className="h-10 bg-white/5 rounded-xl sm:rounded-2xl w-full" />
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-8 bg-white/5 rounded-lg sm:rounded-xl w-16 sm:w-20 flex-shrink-0" />
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pt-3 sm:pt-4 pr-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 sm:border-white/5 animate-pulse"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 sm:space-y-2">
                      <div className="h-2.5 sm:h-3 w-1/3 bg-white/10 rounded" />
                      <div className="h-3.5 sm:h-4 w-2/3 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full items-center">
          {/* Video Player & Trending sidebar */}
          <div ref={playerWrapperRef} className="w-full flex flex-col lg:flex-row gap-6 items-stretch justify-center">
            <div className="w-full lg:w-3/4 flex justify-center">
              <VideoPlayerView
                videoRef={videoRef}
                playerContainerRef={playerContainerRef}
                playerStatus={playerStatus}
                playerError={playerError}
                isBuffering={isBuffering}
                isPaused={isPaused}
                isMuted={isMuted}
                volume={volume}
                isFullscreen={isFullscreen}
                isPip={isPip}
                showControls={showControls}
                activeSeekIndicator={activeSeekIndicator}
                isPipSupported={isPipSupported}
                availableQualities={availableQualities}
                currentQuality={currentQuality}
                activeAutoQualityId={activeAutoQualityId}
                detectedResolution={detectedResolution}
                handleQualityChange={handleQualityChange}
                handlePlayPause={handlePlayPause}
                handleMuteUnmute={handleMuteUnmute}
                handleVolumeChangeSlider={handleVolumeChangeSlider}
                handleFullscreen={handleFullscreen}
                handlePip={handlePip}
                handlePlayerClick={handlePlayerClick}
                handlePlayerDoubleClick={handlePlayerDoubleClick}
                handleReload={handleReload}
                handleMouseMove={handleMouseMove}
                maxQualityMode={maxQualityMode}
                handleToggleMaxQuality={handleToggleMaxQuality}
                playerEngine={playerEngine}
                setPlayerEngine={setPlayerEngine}
              />
            </div>
            <div className="w-full lg:w-1/4">
              <TrendingChannels
                topChannels={topChannels}
                selectedChannel={selectedChannel}
                handleChannelSelect={handleChannelSelect}
              />
            </div>
          </div>

          {/* VLC Live URL & Community Banner */}
          {vlcUrl && (
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* VLC & PotPlayer URL Box */}
              <div className="md:col-span-2 group relative glass-card border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] p-5 flex flex-row items-center gap-4 transition-all duration-300 hover:border-primary/30">
                {/* Left Side: Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <LinkIcon className="w-5.5 h-5.5" />
                </div>
                {/* Right Side: Content */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <h3 className="text-sm font-black tracking-widest text-primary text-left">Link for VLC or PotPlayer</h3>
                  {/* URL Sub Box */}
                  <div className="flex items-center justify-between gap-3 bg-black/40 border border-white/5 rounded-xl pl-4 pr-1 py-1 w-full shadow-inner group-hover:border-primary/20 transition-all duration-300">
                    <span className="text-xs sm:text-sm text-zinc-300 font-mono truncate select-all flex-1 pr-2 text-left">
                      {vlcUrl}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(vlcUrl);
                        setCopiedVlcUrl(true);
                        setTimeout(() => setCopiedVlcUrl(false), 2000);
                      }}
                      className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 active:scale-95 ${copiedVlcUrl
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                        : "bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25"
                        }`}
                    >
                      {copiedVlcUrl ? <Check size={13} className="scale-110 transition-transform" /> : <Copy size={13} className="scale-100 hover:scale-110 transition-transform" />}
                      <span>{copiedVlcUrl ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Community Box */}
              <div className="md:col-span-1 group relative glass-card border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-white/20">
                {/* Header (Icon on left of centered text) */}
                <div className="flex items-center justify-center gap-3.5 w-full">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Radio className="w-5 h-5 text-white/70" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-black tracking-widest text-white/90 uppercase">Join Community</h3>
                  </div>
                </div>
                {/* Buttons (Side-by-side) */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <a
                    href="https://t.me/shajonOTT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1.5 py-2 rounded-xl bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 border border-[#2AABEE]/20 hover:border-[#2AABEE]/40 text-[#2AABEE] text-xs font-bold transition-all duration-200"
                  >
                    <FaTelegram size={14} className="flex-shrink-0" />
                    <span className="truncate">Telegram</span>
                  </a>
                  <a
                    href="https://discord.gg/NQjksbt3NN"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1.5 py-2 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/20 hover:border-[#5865F2]/40 text-[#5865F2] text-xs font-bold transition-all duration-200"
                  >
                    <FaDiscord size={14} className="flex-shrink-0" />
                    <span className="truncate">Discord</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Details & Counter Panels */}
          <ChannelStats
            selectedChannel={selectedChannel}
            playerStatus={playerStatus}
            totalChannels={channels.length}
          />

          {/* Main Content Area: Sidebar + Playlist Browser */}
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            {playlists.length > 0 && (
              <PlaylistSidebarView
                playlists={playlists}
                activePlaylistId={activePlaylistId}
                setActivePlaylistId={setActivePlaylistId}
                setPlaylistTab={setPlaylistTab}
                handleDeletePlaylist={handleDeletePlaylist}
                isUpdating={isUpdating}
                updateSuccess={updateSuccess}
                onUpdatePlaylists={() => refreshAllPlaylists(true)}
              />
            )}

            <div className={`w-full ${playlists.length > 0 ? "lg:w-2/3 xl:w-3/4" : ""} glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col h-[600px] sm:h-[700px]`}>
              <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 sm:border-white/5 mb-3 sm:mb-4 flex-wrap gap-2">
                <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 sm:border-white/5 w-full sm:w-auto">
                  <button
                    onClick={() => playlists.length > 0 && setPlaylistTab("browse")}
                    disabled={playlists.length === 0}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex-1 sm:flex-initial ${playlistTab === "browse"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : playlists.length === 0
                        ? "opacity-40 cursor-not-allowed text-zinc-500"
                        : "text-zinc-300 hover:text-white"
                      }`}
                  >
                    <Tv size={14} />
                    <span className="whitespace-nowrap">Browse Channels</span>
                  </button>
                  <button
                    onClick={() => setPlaylistTab("manage")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex-1 sm:flex-initial ${playlistTab === "manage"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-zinc-300 hover:text-white"
                      }`}
                  >
                    <Upload size={14} />
                    <span className="whitespace-nowrap">Playlists Manager</span>
                  </button>
                </div>

                <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 sm:border-white/5 w-full sm:w-auto justify-between sm:justify-start">
                  {viewerCount !== null && (
                    <>
                      <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs text-zinc-300 select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        <span className="text-white font-bold whitespace-nowrap">
                          {viewerCount} {viewerCount === 1 ? "Watcher" : "Watchers"}
                        </span>
                      </div>
                      <div className="hidden sm:block h-4 w-[1px] bg-white/10 mx-1 flex-shrink-0" />
                    </>
                  )}

                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs text-zinc-300 select-none max-w-[180px] sm:max-w-[260px] truncate">
                    <span className="font-semibold shrink-0">Playlist:</span>
                    <span className="text-white font-bold truncate">
                      {playlists.length === 0 ? "N/A" : (playlists.find((p) => p.id === activePlaylistId)?.name || "N/A")}
                    </span>
                  </div>
                </div>
              </div>

              {playlistTab === "browse" ? (
                <ChannelListView
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  visibleChannels={visibleChannels}
                  filteredChannelsCount={filteredChannels.length}
                  loading={loading}
                  selectedChannel={selectedChannel}
                  handleChannelSelect={handleChannelSelect}
                  displayCount={displayCount}
                  setDisplayCount={setDisplayCount}
                  hasMore={hasMore}
                />
              ) : (
                <PlaylistManagerView
                  playlistName={playlistName}
                  setPlaylistName={setPlaylistName}
                  importUrl={importUrl}
                  setImportUrl={setImportUrl}
                  isImporting={isImporting}
                  uploadPlaylistName={uploadPlaylistName}
                  setUploadPlaylistName={setUploadPlaylistName}
                  isDragging={isDragging}
                  fileInputRef={fileInputRef}
                  importError={importError}
                  handleUrlImport={handleUrlImport}
                  handleFileUpload={handleFileUpload}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  handleDrop={handleDrop}
                />
              )}
            </div>
          </div>

          {/* Page Footer */}
          <div className="w-full pt-4 md:pt-6 pb-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-2">
                <p className="text-zinc-400 text-[10px] sm:text-xs font-medium">
                  Watch premium live TV channels directly from official stream sources.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[10px] sm:text-xs text-zinc-300 font-medium whitespace-nowrap shadow-sm">
                  Developed by <span className="text-white font-bold ml-1">S. SHAJON</span>
                </span>
                <a
                  href="https://github.com/SHAJON-404/iptv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.18] text-[10px] sm:text-xs text-gray-300 hover:text-white font-semibold transition-all duration-300 shadow-sm whitespace-nowrap"
                >
                  <FaGithub size={12} className="opacity-80" />
                  <span>GitHub Repository</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
