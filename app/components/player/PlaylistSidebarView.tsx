"use client";

import React from "react";
import { List, Tv, Link as LinkIcon, FileText, Trash2, RefreshCw, Check } from "lucide-react";
import { Playlist, getIsAppleDevice } from "../../hooks/useIPTVPlaylists";

interface PlaylistSidebarViewProps {
  playlists: Playlist[];
  activePlaylistId: string;
  setActivePlaylistId: (id: string) => void;
  setPlaylistTab: (tab: "browse" | "manage") => void;
  handleDeletePlaylist: (id: string, e: React.MouseEvent) => void;
  isUpdating: boolean;
  updateSuccess: boolean;
  onUpdatePlaylists: () => void;
}

export const PlaylistSidebarView = React.memo(function PlaylistSidebarView({
  playlists,
  activePlaylistId,
  setActivePlaylistId,
  setPlaylistTab,
  handleDeletePlaylist,
  isUpdating,
  updateSuccess,
  onUpdatePlaylists,
}: PlaylistSidebarViewProps) {
  return (
    <div className="w-full lg:w-1/3 xl:w-1/4 glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col max-h-[280px] lg:max-h-none lg:h-[600px] xl:h-[700px]">
      {/* 1. Update Playlist Button */}
      {playlists.length > 0 && (
        <div className="pb-3 sm:pb-4 border-b border-white/10 sm:border-white/5 mb-3 sm:mb-4 flex-shrink-0">
          <button
            onClick={onUpdatePlaylists}
            disabled={isUpdating}
            className={`w-full flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all group/btn ${
              isUpdating
                ? "bg-primary/5 border-primary/20 text-primary/50 cursor-not-allowed"
                : updateSuccess
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5 hover:bg-primary/20 hover:border-primary/80 cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border flex-shrink-0 transition-all ${
                  isUpdating
                    ? "bg-primary/10 border-primary/20"
                    : updateSuccess
                    ? "bg-emerald-500/20 border-emerald-500/20"
                    : "bg-primary/20 border-primary/20 group-hover/btn:bg-primary/30"
                }`}
              >
                {isUpdating ? (
                  <RefreshCw size={14} className="sm:w-4 sm:h-4 animate-spin text-primary" />
                ) : updateSuccess ? (
                  <Check size={14} className="sm:w-4 sm:h-4 text-emerald-400" />
                ) : (
                  <RefreshCw size={14} className="sm:w-4 sm:h-4 text-primary transition-colors" />
                )}
              </div>

              <div className="min-w-0">
                <h5 className={`font-bold text-xs sm:text-sm truncate pr-2 ${
                  isUpdating ? "text-primary/50" : updateSuccess ? "text-emerald-400" : "text-primary group-hover/btn:text-white transition-colors"
                }`}>
                  {isUpdating ? "Updating Playlists..." : updateSuccess ? "Updated Successfully" : "Update Playlist"}
                </h5>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 2. Your Playlists Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 sm:border-white/5 mb-3 sm:mb-4 flex-shrink-0">
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 sm:border-white/5 w-full">
          <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold w-full bg-primary text-white shadow-lg shadow-primary/20 cursor-default">
            <List size={14} />
            <span className="whitespace-nowrap">Your Playlists</span>
          </div>
        </div>
      </div>

      {/* 3. Playlist List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center p-4 gap-3 text-zinc-400">
            <div className="p-3 rounded-full bg-white/5 border border-white/10 mb-1">
              <List size={24} className="text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-300">You have no playlists added.</p>
            <p className="text-xs">Please add a playlist first.</p>
          </div>
        ) : (
          playlists.map((pl) => {
            const isActive = pl.id === activePlaylistId;
            const filteredCount = (
              getIsAppleDevice()
                ? pl.channels.filter(c => !(c.type === "dash" || c.url.includes(".mpd") || c.url.endsWith(".mpd")))
                : pl.channels
            ).length;

            return (
              <div
                key={pl.id}
                onClick={() => {
                  setActivePlaylistId(pl.id);
                  setPlaylistTab("browse");
                }}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer group/item ${
                  isActive
                    ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5"
                    : "bg-white/[0.02] border-white/10 sm:border-white/5 text-white hover:bg-white/[0.05] hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border flex-shrink-0 ${
                      isActive ? "bg-primary/20 border-primary/20" : "bg-white/5 border-white/10"
                    }`}
                  >
                    {pl.type === "default" ? (
                      <Tv size={14} className="sm:w-4 sm:h-4" />
                    ) : pl.type === "url" ? (
                      <LinkIcon size={14} className="sm:w-4 sm:h-4" />
                    ) : (
                      <FileText size={14} className="sm:w-4 sm:h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h5 className="font-bold text-xs sm:text-sm truncate pr-2">{pl.name}</h5>
                    <p className="text-[9px] sm:text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                      {filteredCount} Channels
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {pl.type !== "default" &&
                    pl.id !== "default" &&
                    pl.id !== "sports" &&
                    pl.id !== "universal" &&
                    pl.id !== "bangla" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure? you want to delete this playlist ${pl.name}`)) {
                            handleDeletePlaylist(pl.id, e);
                          }
                        }}
                        className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all opacity-100 focus:opacity-100 cursor-pointer"
                        title="Delete Playlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
