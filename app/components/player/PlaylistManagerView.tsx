"use client";

import React from "react";
import { Link as LinkIcon, Check, Upload, AlertCircle, Lock } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";

interface PlaylistManagerViewProps {
  playlistName: string;
  setPlaylistName: (name: string) => void;
  importUrl: string;
  setImportUrl: (url: string) => void;
  isImporting: boolean;
  uploadPlaylistName: string;
  setUploadPlaylistName: (name: string) => void;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importError: string | null;
  handleUrlImport: (e: React.FormEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const PlaylistManagerView = React.memo(function PlaylistManagerView({
  playlistName,
  setPlaylistName,
  importUrl,
  setImportUrl,
  isImporting,
  uploadPlaylistName,
  setUploadPlaylistName,
  isDragging,
  fileInputRef,
  importError,
  handleUrlImport,
  handleFileUpload,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}: PlaylistManagerViewProps) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex-1 flex justify-center items-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar text-left flex flex-col gap-4 h-full min-h-0">
      {/* Cloud Sync Notice for Unauthenticated Users */}
      {status === "unauthenticated" && (
        <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-3.5 glass-card border border-primary/25 rounded-2xl bg-primary/[0.02] hover:bg-primary/[0.04] transition-all duration-300">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
              <Lock size={14} className="sm:w-[15px] sm:h-[15px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs text-zinc-300 font-medium leading-relaxed">
                <span className="text-primary font-bold">Cloud Sync: </span>
                Playlists added now will be saved <span className="text-white font-semibold">locally in this browser</span>.
                Sign in to save them in the cloud and sync across all devices.
              </p>
            </div>
          </div>
          <a href="/api/auth/google" className="flex-shrink-0 w-full sm:w-auto text-right">
            <button className="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1.5 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer">
              Login
            </button>
          </a>
        </div>
      )}


      {/* URL Import Box */}
      <form
        onSubmit={handleUrlImport}
        className="w-full shrink-0 glass-card p-3.5 sm:p-5 border border-white/10 sm:border-white/5 rounded-3xl bg-white/[0.01] flex flex-col justify-start hover:border-primary/20 transition-colors relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 hover:opacity-100 transition-opacity" />
        <div className="w-full flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <LinkIcon size={18} />
            </div>
            <div>
              <h4 className="font-black text-[15px] sm:text-lg text-white">Load from URL</h4>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">Import any public M3U or JSON playlist link</p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <input
              type="text"
              placeholder="Playlist Name (e.g. My IPTV)"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
            />
            <input
              type="url"
              placeholder="https://example.com/playlist.m3u"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              required
              className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
            />

            <button
              type="submit"
              disabled={isImporting}
              className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {isImporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing Stream...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Import Playlist</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* File Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full shrink-0 glass-card p-3.5 sm:p-5 border rounded-3xl flex flex-col justify-start transition-all relative overflow-hidden ${isDragging
            ? "border-dashed border-primary bg-primary/5 shadow-[0_0_30px_rgba(139,92,246,0.15)] scale-[1.01]"
            : "border-white/10 sm:border-white/5 bg-white/[0.01] hover:border-primary/20"
          }`}
      >
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 hover:opacity-100 transition-opacity" />
        <div className="w-full flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <Upload size={18} />
            </div>
            <div>
              <h4 className="font-black text-[15px] sm:text-lg text-white">Upload Playlist File</h4>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                Upload local .m3u, .m3u8, or .json files
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <input
              type="text"
              placeholder="Playlist Name (Optional)"
              value={uploadPlaylistName}
              onChange={(e) => setUploadPlaylistName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
            />

            <div className="mt-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".m3u,.m3u8,.json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98] cursor-pointer"
              >
                <Upload size={14} />
                <span>Choose M3U or JSON File</span>
              </button>
            </div>
          </div>
        </div>

        {isDragging && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070414]/95 backdrop-blur-sm pointer-events-none z-10 border-2 border-dashed border-primary m-1.5 rounded-2xl transition-all">
            <div className="p-4 rounded-full bg-primary/20 mb-3 animate-bounce">
              <Upload size={32} className="text-primary" />
            </div>
            <p className="text-sm font-black text-white tracking-wide">Drop your file here</p>
            <p className="text-xs text-primary/70 mt-1 font-medium uppercase tracking-widest">Supports .m3u, .m3u8, .json</p>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {importError && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{importError}</span>
        </div>
      )}
    </div>
  );
});
