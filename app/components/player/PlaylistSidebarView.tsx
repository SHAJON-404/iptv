"use client";

import React from "react";
import { List, Tv, Link as LinkIcon, FileText, Check, Trash2 } from "lucide-react";
import { Playlist, getIsIOS } from "../../hooks/useIPTVPlaylists";

interface PlaylistSidebarViewProps {
  playlists: Playlist[];
  activePlaylistId: string;
  setActivePlaylistId: (id: string) => void;
  setPlaylistTab: (tab: "browse" | "manage") => void;
  handleDeletePlaylist: (id: string, e: React.MouseEvent) => void;
}

export function PlaylistSidebarView({
  playlists,
  activePlaylistId,
  setActivePlaylistId,
  setPlaylistTab,
  handleDeletePlaylist,
}: PlaylistSidebarViewProps) {
  return (
    <div className="w-full lg:w-1/3 xl:w-1/4 glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col max-h-[280px] lg:max-h-none lg:h-[600px] xl:h-[700px]">
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 sm:border-white/5 mb-3 sm:mb-4">
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 sm:border-white/5 w-full">
          <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold w-full bg-primary text-white shadow-lg shadow-primary/20 cursor-default">
            <List size={14} />
            <span className="whitespace-nowrap">Your Playlists</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
        {playlists.map((pl) => {
          const isActive = pl.id === activePlaylistId;
          const filteredCount = (
            getIsIOS()
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
                {isActive && (
                  <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check size={10} className="sm:w-3 sm:h-3 stroke-[3]" />
                  </span>
                )}
                {pl.type !== "default" &&
                  pl.id !== "default" &&
                  pl.id !== "sports" &&
                  pl.id !== "universal" &&
                  pl.id !== "bangla" && (
                    <button
                      onClick={(e) => handleDeletePlaylist(pl.id, e)}
                      className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Delete Playlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
