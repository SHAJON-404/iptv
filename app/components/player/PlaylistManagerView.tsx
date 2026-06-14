"use client";

import React from "react";
import { Link as LinkIcon, Check, Upload, AlertCircle } from "lucide-react";

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
  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar text-left">
      {/* Import Playlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* URL Import Box */}
        <form
          onSubmit={handleUrlImport}
          className="glass-card p-4 sm:p-5 border border-white/10 sm:border-white/5 rounded-2xl bg-white/[0.01] flex flex-col justify-between min-h-[180px] hover:border-primary/20 transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <LinkIcon size={18} />
              </div>
              <h4 className="font-bold text-sm sm:text-base">Load from URL</h4>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Playlist Name (e.g. My IPTV)"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 sm:border-white/5 focus-within:border-primary/40 rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-zinc-400 outline-none transition-colors"
              />
              <input
                type="url"
                placeholder="https://example.com/playlist.m3u"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 sm:border-white/5 focus-within:border-primary/40 rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-zinc-400 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isImporting}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50 active:scale-95 cursor-pointer"
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
        </form>

        {/* File Upload Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`glass-card p-4 sm:p-5 border rounded-2xl flex flex-col justify-between min-h-[220px] transition-all relative overflow-hidden ${
            isDragging
              ? "border-dashed border-primary bg-primary/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              : "border-white/10 sm:border-white/5 bg-white/[0.01] hover:border-primary/20"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Upload size={18} />
              </div>
              <h4 className="font-bold text-sm sm:text-base">Upload Playlist File</h4>
            </div>
            <p className="text-xs text-zinc-300">
              Upload local .m3u, .m3u8, or .json playlist files. Stored securely in your browser
              cache.
            </p>

            <div className="mt-3">
              <input
                type="text"
                placeholder="Playlist Name (Optional)"
                value={uploadPlaylistName}
                onChange={(e) => setUploadPlaylistName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 sm:border-white/5 focus-within:border-primary/40 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-400 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="mt-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".m3u,.m3u8,.json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Upload size={14} />
              <span>Choose M3U or JSON File</span>
            </button>
          </div>

          {isDragging && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070414]/90 backdrop-blur-xs pointer-events-none z-10 border-2 border-dashed border-primary m-1 rounded-xl">
              <Upload size={28} className="text-primary animate-bounce mb-2" />
              <p className="text-xs font-bold text-white">Drop your file here</p>
              <p className="text-[9px] text-zinc-400">supports .m3u, .m3u8, .json</p>
            </div>
          )}
        </div>
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
