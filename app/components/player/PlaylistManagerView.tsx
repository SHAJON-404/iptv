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
