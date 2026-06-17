"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";
import { Plus, Trash2, Tv, LogOut, Check, Loader2, Sparkles } from "lucide-react";

interface SavedPlaylist {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
}

export default function DashboardPage() {
  const { session, status, logout } = useAuth();
  const router = useRouter();
  
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync states
  const [syncingPlaylists, setSyncingPlaylists] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    setError(null);
    try {
      const res = await fetch("/api/iptv/playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
      } else {
        setError("Failed to fetch playlists");
      }
    } catch {
      setError("Failed to fetch playlists");
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPlaylists();
    }
  }, [status]);

  const handleAddPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    
    if (!name.trim() || !url.trim()) {
      setActionError("Playlist name and URL are required.");
      return;
    }

    if (playlists.length >= 10) {
      setActionError("You have reached the limit of 10 saved playlists.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/iptv/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setPlaylists(prev => [data.playlist, ...prev]);
        setName("");
        setUrl("");
        setSuccessMsg("Playlist saved successfully!");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setActionError(data.error || "Failed to save playlist.");
      }
    } catch {
      setActionError("Failed to save playlist.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      // Optimistic update
      setPlaylists(prev =>
        prev.map(p => (p.id === id ? { ...p, isActive: !currentActive } : p))
      );

      const res = await fetch("/api/iptv/playlists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });

      if (!res.ok) {
        // Revert on error
        setPlaylists(prev =>
          prev.map(p => (p.id === id ? { ...p, isActive: currentActive } : p))
        );
        const data = await res.json();
        setActionError(data.error || "Failed to update playlist state.");
      }
    } catch {
      // Revert on error
      setPlaylists(prev =>
        prev.map(p => (p.id === id ? { ...p, isActive: currentActive } : p))
      );
      setActionError("Failed to update playlist state.");
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    setActionError(null);
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    try {
      const res = await fetch(`/api/iptv/playlists?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== id));
        setSuccessMsg("Playlist deleted successfully.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const data = await res.json();
        setActionError(data.error || "Failed to delete playlist.");
      }
    } catch {
      setActionError("Failed to delete playlist.");
    }
  };

  const handleSyncPlaylistData = async () => {
    setSyncingPlaylists(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      // 1. Fetch latest saved playlists metadata from DB
      const res = await fetch("/api/iptv/playlists");
      if (!res.ok) throw new Error("Failed to fetch playlists from database.");
      const data = await res.json();
      const dbPlaylists = data.playlists || [];

      // Update the local list of playlists in the dashboard state
      setPlaylists(dbPlaylists);

      // 2. Fetch and parse channels for active ones
      const activeDBPlaylists = dbPlaylists.filter((p: SavedPlaylist) => p.isActive);
      const loadedPlaylists = [];

      // Import parser helpers
      const { parseM3U, parseJSON } = await import("@/app/lib/playlistParser");

      for (const dbp of activeDBPlaylists) {
        try {
          const proxiedUrl = `/api/iptv/proxy?url=${encodeURIComponent(dbp.url.trim())}`;
          const fileRes = await fetch(proxiedUrl);
          if (!fileRes.ok) continue;

          const text = await fileRes.text();
          let parsed = [];
          const trimmedText = text.trim();
          if (trimmedText.startsWith("[") || trimmedText.startsWith("{")) {
            parsed = parseJSON(text);
          } else {
            parsed = parseM3U(text);
          }

          if (parsed.length > 0) {
            loadedPlaylists.push({
              id: `db-playlist-${dbp.id}`,
              name: dbp.name,
              type: "url",
              url: dbp.url,
              channels: parsed,
            });
          }
        } catch (e) {
          console.error(`Failed to sync playlist content for ${dbp.name}:`, e);
        }
      }

      // Save to localStorage cache
      localStorage.setItem("iptv_db_playlists_cache", JSON.stringify(loadedPlaylists));
      
      setSyncSuccessMsg("Playlist channels synchronized successfully!");
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setSyncErrorMsg(error.message || "Failed to synchronize playlist channels.");
      setTimeout(() => setSyncErrorMsg(null), 4000);
    } finally {
      setSyncingPlaylists(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#070414] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="min-h-screen bg-[#070414] text-white p-4 sm:p-8 relative overflow-hidden flex flex-col items-center">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] opacity-40 mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] opacity-30 mix-blend-screen" />
      </div>

      <div className="w-full max-w-4xl z-10 flex flex-col gap-6 md:gap-8 flex-1">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/15 group-hover:border-primary/40 shadow-lg bg-white/5 flex-shrink-0 transition-all">
                <Image
                  src="/logo.png"
                  alt="IPTV Player Logo"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none">
                  IP<span className="gradient-text">TV</span>
                </h1>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Player Portal</span>
              </div>
            </div>
          </Link>

          <Link href="/">
            <button className="flex items-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 hover:border-primary/30 bg-white/5 hover:bg-primary/10 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer">
              <Tv size={16} className="text-primary" />
              <span>Watch Live TV</span>
            </button>
          </Link>
        </div>

        {/* User Card */}
        <div className="glass-card border border-white/10 rounded-3xl bg-white/[0.02] p-6 sm:p-8 shadow-xl backdrop-blur-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/30 flex-shrink-0 shadow-lg">
              {user?.image ? (
                <Image src={user.image} alt={user.name || "User"} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-black text-2xl uppercase">
                  {user?.name?.[0] || "U"}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user?.name || "Welcome Back"}</h2>
                <Sparkles size={16} className="text-yellow-400 animate-pulse" />
              </div>
              <p className="text-sm text-zinc-400 font-medium">{user?.email}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl border border-white/10 hover:border-rose-500/50 bg-white/5 hover:bg-rose-500/10 text-white font-bold text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <LogOut size={16} className="text-rose-400" />
            <span>Logout</span>
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1 min-h-0">
          
          {/* Add Playlist Form (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-card border border-white/10 rounded-3xl bg-white/[0.02] p-6 sm:p-8 shadow-lg backdrop-blur-xl text-left flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Add Playlist URL</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Save playlists to your cloud account</p>
                </div>
              </div>

              <form onSubmit={handleAddPlaylist} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Playlist Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangladesh Live Channels"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={playlists.length >= 10}
                    className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Playlist M3U/JSON URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/playlist.m3u"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    disabled={playlists.length >= 10}
                    className="w-full bg-white/[0.03] border border-white/10 focus-within:border-primary/50 focus-within:bg-white/[0.05] rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                {actionError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                    {actionError}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <Check size={14} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || playlists.length >= 10}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-primary hover:bg-primary/95 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Save Playlist ({playlists.length}/10)</span>
                    </>
                  )}
                </button>

                {playlists.length >= 10 && (
                  <p className="text-[11px] text-yellow-500 font-medium text-center mt-2">
                    💡 You have reached the maximum limit of 10 saved playlists. Delete an existing one to add more.
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Saved Playlists List (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="glass-card border border-white/10 rounded-3xl bg-white/[0.02] p-6 sm:p-8 shadow-lg backdrop-blur-xl text-left flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6 gap-2">
                <h3 className="font-black text-lg text-white">Saved Playlists</h3>
                <button
                  onClick={handleSyncPlaylistData}
                  disabled={syncingPlaylists || playlists.length === 0}
                  className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-primary/20 hover:border-primary/50 bg-primary/5 hover:bg-primary/15 text-white font-bold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  {syncingPlaylists ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Tv size={14} className="text-primary" />
                      <span>Update Playlists Data</span>
                    </>
                  )}
                </button>
              </div>

              {syncSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4 flex items-center gap-1.5">
                  <Check size={14} />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {syncErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-4">
                  {syncErrorMsg}
                </div>
              )}

              {loadingPlaylists ? (
                <div className="flex-1 flex items-center justify-center min-h-[200px]">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-sm min-h-[200px] border border-dashed border-white/10 rounded-2xl p-6 bg-white/[0.01]">
                  <p>{error}</p>
                  <button onClick={fetchPlaylists} className="mt-3 text-xs text-primary font-bold hover:underline">Try Again</button>
                </div>
              ) : playlists.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm min-h-[200px] border border-dashed border-white/10 rounded-2xl p-6 bg-white/[0.01] text-center">
                  <p className="font-bold text-white mb-1">No saved playlists yet</p>
                  <p className="text-xs text-zinc-400 max-w-xs">Add your first IPTV streaming link using the form on the left to sync it with your player.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {playlists.map((playlist) => (
                    <div 
                      key={playlist.id} 
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 bg-white/[0.01] ${
                        playlist.isActive ? "border-white/10 hover:border-primary/30" : "border-white/5 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${playlist.isActive ? "bg-emerald-500" : "bg-zinc-500"}`} />
                          <h4 className="font-black text-sm text-white truncate">{playlist.name}</h4>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 truncate max-w-sm" title={playlist.url}>
                          {playlist.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleActive(playlist.id, playlist.isActive)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${
                            playlist.isActive ? "bg-primary" : "bg-white/15"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              playlist.isActive ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          className="p-2 rounded-xl border border-white/5 hover:border-rose-500/50 bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Playlist"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
