import { useEffect, useState, useContext } from "react";
import { IoPlaySkipForward, IoPlaySkipBack, IoClose, IoHeart, IoHeartOutline } from "react-icons/io5";
import SpotifySearchContext from "../../context/SpotifySearchContext";

type User = { email: string; username: string; createdAt?: string } | null;

const formatSince = (iso?: string) => {
  if (!iso) return "Member time unknown";
  const then = new Date(iso);
  const now = new Date();
  let years = now.getFullYear() - then.getFullYear();
  let months = now.getMonth() - then.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
  if (years > 0) return `${years} year${years > 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`;
  if (months > 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  return `joined today`;
};

const MainSection = ({ user }: { user?: User }) => {
  const [localUser, setLocalUser] = useState<User>(user ?? null);
  const { setResult } = useContext(SpotifySearchContext as any) as any;

  // in-place player state
  const [selectedSpotifyTrackId, setSelectedSpotifyTrackId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLocalUser(user ?? null);
  }, [user]);

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("__app_user");
        setLocalUser(raw ? JSON.parse(raw) : null);
      } catch {
        setLocalUser(null);
      }
    };
    window.addEventListener("app_user_change", handler);
    return () => window.removeEventListener("app_user_change", handler);
  }, []);

  if (!localUser) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Please sign in first</h2>
          <p className="text-sm text-zinc-400">Sign in to view your profile and most-played tracks.</p>
        </div>
      </div>
    );
  }

  // Derive join info from stored createdAt if available
  const joinDate = localUser.createdAt ? new Date(localUser.createdAt) : null;
  const joinDateText = joinDate ? joinDate.toLocaleDateString() : "Unknown";
  const sinceText = formatSince(localUser.createdAt);

  // Fetch user's actual most-played tracks
  const [topTracks, setTopTracks] = useState<any[]>([]);
  useEffect(() => {
    if (!localUser?.username) return;
    (async () => {
      try {
        const r = await fetch(`http://localhost:3001/users/${encodeURIComponent(localUser.username)}/plays`);
        if (!r.ok) return;
        const plays = await r.json();
        // Try to build a list of track ids from play counts. If no plays, fall back to liked songs.
        let trackIds: string[] = (plays || []).map((p: any) => p.track_id).filter(Boolean);

        if (trackIds.length === 0) {
          // no plays; try liked songs for this user
          try {
            const lr = await fetch(`http://localhost:3001/users/${encodeURIComponent(localUser.username)}/likes`);
            if (lr.ok) {
              const likes = await lr.json();
              trackIds = (likes || []).map((l: any) => l.track_id).filter(Boolean);
            }
          } catch (e) {
            // ignore
          }
        }

        if (trackIds.length === 0) {
          // no server-sourced tracks for this user; set empty and do not use local songs
          setTopTracks([]);
          return;
        }

        // fetch track details from Spotify for the top N ids
        try {
          const tokenResp = await fetch("http://localhost:3001/spotify-token");
          const token = tokenResp.ok ? await tokenResp.json() : null;
          const details = await Promise.all(
            trackIds.slice(0, 5).map(async (id: string) => {
              try {
                if (!token) return null;
                const tr = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
                  headers: { Authorization: `Bearer ${token.access_token}` },
                });
                if (!tr.ok) return null;
                const track = await tr.json();
                return {
                  id: track.id,
                  title: track.name,
                  artists: track.artists.map((a: any) => a.name),
                  image: track.album.images[0]?.url || "",
                  play_count: (plays || []).find((p: any) => String(p.track_id) === String(track.id))?.play_count || 0,
                };
              } catch {
                return null;
              }
            })
          );
          setTopTracks(details.filter(Boolean));
        } catch (e) {
          setTopTracks([]);
        }
      } catch (e) {
        // fallback to placeholder if fetch fails
        setTopTracks([]);
      }
    })();
  }, [localUser]);

  // Use only tracks resolved from the server (plays or likes). Do not fall back to local site songs.
  const top = topTracks;

  const playTrack = (track: any) => {
    // select the track for in-place footer player
    setSelectedSpotifyTrackId(String(track.id));
    // also set context result so other components (if any) can see it
    try {
      const mockResult = {
        tracks: { items: [ { id: track.id, name: track.title, artists: (track.artists||[]).map((a:string)=>({name:a})), album: { images: [{ url: track.image }] }, duration_ms: track.duration_ms || 0 } ] }
      };
      setResult(mockResult);
    } catch {}
  };

  // Listen for global play events (from AsideMenu or other places)
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e && e.detail ? e.detail : (e as any).detail || null;
        const track = detail?.track;
        if (!track) return;
        playTrack(track);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener("app_play_spotify", handler as EventListener);
    return () => window.removeEventListener("app_play_spotify", handler as EventListener);
  }, []);

  useEffect(() => {
    if (selectedSpotifyTrackId) {
      const t = setTimeout(() => setMounted(true), 10);
      // record play and fetch liked status
      (async () => {
        try {
          const raw = localStorage.getItem("__app_user");
          if (!raw) return;
          const u = JSON.parse(raw);
          const username = u.username;
          // record play (fire-and-forget)
          try {
            await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/plays`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ track_id: selectedSpotifyTrackId }),
            });
          } catch (e) {}
          // fetch likes
          try {
            const r = await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/likes`);
            if (r.ok) {
              const likes = await r.json();
              const found = likes.find((l: any) => String(l.track_id) === String(selectedSpotifyTrackId));
              setLiked(Boolean(found));
            }
          } catch (e) {}
        } catch (e) {}
      })();
      return () => clearTimeout(t);
    }
    setMounted(false);
    setLiked(false);
  }, [selectedSpotifyTrackId]);

  const displaySongs = top.map((track: any) => ({
    id: track.id,
    title: track.title,
    artists: track.artists,
    image: track.image,
  }));

  const nextTrack = () => {
    if (!displaySongs || displaySongs.length === 0) return;
    const idx = displaySongs.findIndex((s) => String(s.id) === String(selectedSpotifyTrackId));
    const nextIdx = idx === -1 ? 0 : (idx + 1) % displaySongs.length;
    const next = displaySongs[nextIdx];
    if (next?.id) setSelectedSpotifyTrackId(String(next.id));
  };

  const prevTrack = () => {
    if (!displaySongs || displaySongs.length === 0) return;
    const idx = displaySongs.findIndex((s) => String(s.id) === String(selectedSpotifyTrackId));
    const prevIdx = idx === -1 ? 0 : (idx - 1 + displaySongs.length) % displaySongs.length;
    const prev = displaySongs[prevIdx];
    if (prev?.id) setSelectedSpotifyTrackId(String(prev.id));
  };

  const closeEmbed = () => setSelectedSpotifyTrackId(null);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Welcome! {localUser.username}</h1>
        <div className="text-sm text-zinc-400 mt-1">Joined: {joinDateText} • {sinceText}</div>
      </div>

      <section className="space-y-6">
        <h3 className="text-lg text-white font-semibold">Your top listens</h3>

        <div className="grid grid-cols-2 gap-4">
          {top.slice(0, 2).map((s, i) => (
            <div
              key={i}
              onClick={() => playTrack(s)}
              className="relative flex items-end p-4 rounded-lg bg-gradient-to-br from-zinc-800 via-zinc-800 to-emerald-900/20 shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-emerald-500/20 hover:shadow-2xl cursor-pointer border border-zinc-700 hover:border-emerald-500/50 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img src={s.image} alt={s.title} className="w-20 h-20 rounded-md mr-4 object-cover shadow-lg z-10" />
              <div className="z-10">
                <div className="text-white font-semibold text-lg">{s.title}</div>
                <div className="text-sm text-zinc-400">{s.artists.join(", ")}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <div className="text-sm text-zinc-400 mb-2">Other listens</div>
          <div className="flex items-center gap-3 flex-wrap">
            {top.slice(2).map((s, i) => (
              <div
                key={i}
                onClick={() => playTrack(s)}
                className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-md cursor-pointer hover:bg-gradient-to-r hover:from-zinc-700 hover:to-emerald-900/30 transition-all duration-300 border border-transparent hover:border-emerald-500/30"
              >
                <img src={s.image} alt={s.title} className="w-10 h-10 rounded-sm object-cover" />
                <div className="text-sm text-white">{s.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Inline footer player (mirrors PlaylistItem footer) */}
      {selectedSpotifyTrackId && (
        <div className={`fixed bottom-6 left-6 right-6 z-50 flex justify-center pointer-events-auto`}>
          <div className={`max-w-7xl w-full bg-gradient-to-r from-zinc-900/95 via-zinc-800/80 to-emerald-900/5 border border-zinc-700 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden transform transition-all duration-300 ease-out ${mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={prevTrack} className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-md transition-transform transform hover:-translate-y-0.5" aria-label="Previous">
                  <IoPlaySkipBack size={18} />
                </button>
                <button onClick={nextTrack} className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-full shadow-md shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-400/40" aria-label="Next">
                  <IoPlaySkipForward size={18} />
                </button>
              </div>

              <div className="flex-1 flex items-center gap-4">
                {displaySongs.find(s=>String(s.id)===String(selectedSpotifyTrackId))?.image && (
                  <img src={displaySongs.find(s=>String(s.id)===String(selectedSpotifyTrackId))?.image} alt={displaySongs.find(s=>String(s.id)===String(selectedSpotifyTrackId))?.title} className="w-14 h-14 rounded-md object-cover shadow-inner" />
                )}

                <div className="flex-1">
                  <div className="text-sm text-zinc-300 line-clamp-1">{displaySongs.find(s=>String(s.id)===String(selectedSpotifyTrackId))?.artists?.join(", ")}</div>
                  <div className="text-white font-semibold line-clamp-1">{displaySongs.find(s=>String(s.id)===String(selectedSpotifyTrackId))?.title}</div>
                </div>

                <div className="flex-1">
                  <iframe title="Spotify Player" src={`https://open.spotify.com/embed/track/${selectedSpotifyTrackId}`} width="100%" height={80} frameBorder={0} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="block rounded-md overflow-hidden" />
                </div>

                <div className="flex items-center">
                  <button onClick={async () => {
                    try {
                      const raw = localStorage.getItem("__app_user");
                      if (!raw) { window.dispatchEvent(new Event("app_open_signin")); return; }
                      const u = JSON.parse(raw);
                      const username = u.username;
                      if (liked) {
                        await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/likes`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track_id: selectedSpotifyTrackId }) });
                        setLiked(false);
                      } else {
                        const selected = displaySongs.find(s=>String(s.id)===String(selectedSpotifyTrackId));
                        await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/likes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track_id: selectedSpotifyTrackId, title: selected?.title, artists: selected?.artists }) });
                        setLiked(true);
                      }
                    } catch (e) {}
                  }} className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-md mr-2" aria-label="Like song">
                    {liked ? <IoHeart size={18} color="#ef4444" /> : <IoHeartOutline size={18} />}
                  </button>

                  <button onClick={closeEmbed} className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-md" aria-label="Close player">
                    <IoClose size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainSection;
