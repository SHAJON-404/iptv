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

export function PlaylistManagerView({
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

  if (status === "unauthenticated") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[300px]">
        <div className="glass-card p-8 sm:p-10 border border-white/10 rounded-3xl bg-white/[0.02] text-center max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-5 border border-primary/30">
            <Lock className="text-primary w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">Login Required</h3>
          <p className="text-sm text-zinc-400 mb-8">
            You must be logged in to add and manage your custom IPTV playlists.
          </p>
          <a href="/api/auth/google" className="block w-full">
            <button
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-black rounded-2xl transition-all shadow-lg active:scale-[0.98] cursor-pointer"
            >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Sign in with Google
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar text-left flex flex-col gap-5 h-full min-h-0">
      {/* URL Import Box */}
      <form
        onSubmit={handleUrlImport}
        className="flex-1 glass-card p-5 sm:p-8 border border-white/10 sm:border-white/5 rounded-3xl bg-white/[0.01] flex flex-col justify-center hover:border-primary/20 transition-colors relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 hover:opacity-100 transition-opacity" />
        <div className="w-full max-w-3xl mx-auto flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <LinkIcon size={22} />
            </div>
            <div>
              <h4 className="font-black text-lg sm:text-xl text-white">Load from URL</h4>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">Import any public M3U or JSON playlist link</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Playlist Name (e.g. My IPTV)"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
            />
            <input
              type="url"
              placeholder="https://example.com/playlist.m3u"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              required
              className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
            />
            
            <button
              type="submit"
              disabled={isImporting}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing Stream...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
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
        className={`flex-1 glass-card p-5 sm:p-8 border rounded-3xl flex flex-col justify-center transition-all relative overflow-hidden ${
          isDragging
            ? "border-dashed border-primary bg-primary/5 shadow-[0_0_30px_rgba(139,92,246,0.15)] scale-[1.01]"
            : "border-white/10 sm:border-white/5 bg-white/[0.01] hover:border-primary/20"
        }`}
      >
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 hover:opacity-100 transition-opacity" />
        <div className="w-full max-w-3xl mx-auto flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <Upload size={22} />
            </div>
            <div>
              <h4 className="font-black text-lg sm:text-xl text-white">Upload Playlist File</h4>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Upload local .m3u, .m3u8, or .json files
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Playlist Name (Optional)"
              value={uploadPlaylistName}
              onChange={(e) => setUploadPlaylistName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
            />
            
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".m3u,.m3u8,.json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-sm font-black rounded-2xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                <Upload size={16} />
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
}
