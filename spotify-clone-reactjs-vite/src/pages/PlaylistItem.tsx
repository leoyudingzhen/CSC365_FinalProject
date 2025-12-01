import CardPlayButton from "../components/CardPlayButton";
import MusicsTable from "../components/MusicsTable";
import { useContext, useEffect, useState } from "react";
import SpotifySearchContext from "../context/SpotifySearchContext";
import { IoPlaySkipForward, IoPlaySkipBack, IoClose, IoHeart, IoHeartOutline } from "react-icons/io5";

const PlaylistItem = () => {
  const { result } = useContext(SpotifySearchContext) as any;

  // If there is a Spotify search result, map it to Song[] for MusicsTable
  let displaySongs: any[] = [];
  let isSpotifySearch = false;
  let isChatRecs = false;

  // From header Spotify search
  if (
    result &&
    typeof result === "object" &&
    result.tracks &&
    Array.isArray(result.tracks.items)
  ) {
    console.log("Spotify Search Result:", result);
    displaySongs = (result.tracks.items as any[]).map(
      (track: any, idx: number) => ({
        id: track.id || String(idx),
        title: track.name,
        artists: track.artists.map((a: any) => a.name),
        album: track.album.name,
        image: track.album.images[0]?.url || "",
        duration: track.duration_ms
          ? `${Math.floor(track.duration_ms / 60000)}:${String(
              Math.floor((track.duration_ms % 60000) / 1000)
            ).padStart(2, "0")}`
          : "-",
        albumId: -1,
      })
    );
    isSpotifySearch = true;
  }

  // From quick chat (Gemini/fallback)
  if (
    !displaySongs.length &&
    result &&
    typeof result === "object" &&
    Array.isArray(result.songs)
  ) {
    displaySongs = result.songs.map((song: any, idx: number) => ({
      id: song.id || String(idx),
      title: song.title,
      artists: [song.artist || "Unknown"],
      album: song.album || song.genre || "Recommended",
      image:
        song.image ||
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&auto=format&fit=crop",
      duration: "-",
      albumId: -1,
    }));
    isChatRecs = displaySongs.length > 0;
  }

  let coverImage = "https://via.placeholder.com/200";
  if (isSpotifySearch && displaySongs.length > 0) {
    coverImage = displaySongs[0].image;
  } else if (isChatRecs && displaySongs.length > 0) {
    coverImage = displaySongs[0].image;
  }

  console.log("Display Songs:", displaySongs);
  const [selectedSpotifyTrackId, setSelectedSpotifyTrackId] =
    useState<string | null>(null);
  // for a smoother entrance animation we toggle mounted after selection
  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState<boolean>(false);

  useEffect(() => {
    if (selectedSpotifyTrackId) {
      // tiny delay so transition plays
      const t = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(t);
    }
    setMounted(false);
  }, [selectedSpotifyTrackId]);

  // When a track is selected, record a play (best-effort) and fetch liked status
  useEffect(() => {
    const id = selectedSpotifyTrackId;
    if (!id) return;

    // get current user from localStorage
    try {
      const raw = localStorage.getItem("__app_user");
      if (!raw) return;
      const u = JSON.parse(raw);
      const username = u.username;
      // record play (fire-and-forget)
      (async () => {
        try {
          await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/plays`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ track_id: id }),
          });
        } catch (e) {
          // ignore
        }
        // fetch liked status
        try {
          const r = await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/likes`);
          if (r.ok) {
            const likes = await r.json();
            const found = likes.find((l: any) => String(l.track_id) === String(id));
            setLiked(Boolean(found));
          }
        } catch (e) {
          // ignore
        }
      })();
    } catch (e) {
      // no user, skip
    }
  }, [selectedSpotifyTrackId]);
  const nextTrack = () => {
    if (!displaySongs || displaySongs.length === 0) return;
    const idx = displaySongs.findIndex(
      (s) => String(s.id) === String(selectedSpotifyTrackId)
    );
    const nextIdx = idx === -1 ? 0 : (idx + 1) % displaySongs.length;
    const next = displaySongs[nextIdx];
    if (isSpotifySearch && next?.id) setSelectedSpotifyTrackId(String(next.id));
  };

  const prevTrack = () => {
    if (!displaySongs || displaySongs.length === 0) return;
    const idx = displaySongs.findIndex(
      (s) => String(s.id) === String(selectedSpotifyTrackId)
    );
    const prevIdx = idx === -1 ? 0 : (idx - 1 + displaySongs.length) % displaySongs.length;
    const prev = displaySongs[prevIdx];
    if (isSpotifySearch && prev?.id) setSelectedSpotifyTrackId(String(prev.id));
  };

  const closeEmbed = () => setSelectedSpotifyTrackId(null);

  const selectedIndex = selectedSpotifyTrackId
    ? displaySongs.findIndex((s) => String(s.id) === String(selectedSpotifyTrackId))
    : -1;
  const selectedTrack = selectedIndex >= 0 ? displaySongs[selectedIndex] : null;
  return (
    <>
      <div
        id="playlist-container"
        className="relative flex flex-col h-full bg-zinc-900 overflow-x-hidden"
      >
        {/* Page Header */}
        <header className="flex flex-row gap-8 px-6 mt-6 h-40">
          <picture className="aspect-square w-40 h-40 flex-none">
            <img
              src={coverImage}
              alt="Cover"
              className="object-cover w-full h-full shadow-lg"
            />
          </picture>
          <div className="flex flex-col justify-between py-2">
            <h2 className="flex flex-1 items-end"></h2>
            <div>
              <h1 className="text-6xl font-extrabold block text-white">
                {displaySongs.length > 0
                  ? isChatRecs
                    ? "Quickchat Recommendations"
                    : displaySongs[0].title
                  : "Spotify Search Results"}
                <span></span>
              </h1>
            </div>
            <div className="flex-1 flex items-end">
              <div className="text-sm text-gray-300 font-normal">
                <div>
                  <span>{isChatRecs ? "Gemini" : "Spotify"}</span>
                </div>
                <p className="mt-1">
                  <span className="text-white">
                    {displaySongs.length} songs
                  </span>
                </p>
              </div>
            </div>
          </div>
        </header>
        <div className="pl-6 pt-6">
          <CardPlayButton id={`spotify-search`} size="large" />
        </div>
        <div className="relative z-10 px-6 pt-10 pb-28">
          <MusicsTable
            songs={displaySongs}
            onSelect={async (s: any) => {
              // If this is a Spotify search result, the song id should be the Spotify track id
              if (isSpotifySearch && s?.id) {
                setSelectedSpotifyTrackId(String(s.id));
                return;
              }

              // For Quickchat recommendations (no direct Spotify id), resolve via Spotify Search
              try {
                const tokenResp = await fetch("http://localhost:3001/spotify-token");
                const tokenData = tokenResp.ok ? await tokenResp.json() : null;
                const accessToken = tokenData?.access_token;
                if (!accessToken) {
                  setSelectedSpotifyTrackId(null);
                  return;
                }
                const qTitle = s?.title ? `track:${s.title}` : "";
                const qArtist = s?.artists?.[0] ? ` artist:${s.artists[0]}` : "";
                const q = encodeURIComponent(`${qTitle}${qArtist}`.trim() || s?.title || "");
                const url = `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`;
                const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
                if (!r.ok) {
                  setSelectedSpotifyTrackId(null);
                  return;
                }
                const data = await r.json();
                const first = data?.tracks?.items?.[0];
                if (first?.id) {
                  setSelectedSpotifyTrackId(String(first.id));
                } else {
                  setSelectedSpotifyTrackId(null);
                }
              } catch {
                setSelectedSpotifyTrackId(null);
              }
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 -z-[1]" />
      </div>
      {/* Spotify embed footer */}
      {selectedSpotifyTrackId && (
        <div
          className={`fixed bottom-6 left-6 right-6 z-50 flex justify-center pointer-events-auto`}
        >
          <div
            className={`max-w-7xl w-full bg-gradient-to-r from-zinc-900/95 via-zinc-800/80 to-emerald-900/5 border border-zinc-700 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden transform transition-all duration-300 ease-out ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={prevTrack}
                  className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-md transition-transform transform hover:-translate-y-0.5"
                  aria-label="Previous"
                >
                  <IoPlaySkipBack size={18} />
                </button>
                <button
                  onClick={nextTrack}
                  className="flex items-center justify-center w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-md transition-transform transform hover:-translate-y-0.5"
                  aria-label="Next"
                >
                  <IoPlaySkipForward size={18} />
                </button>
              </div>

              <div className="flex-1 flex items-center gap-4">
                {selectedTrack?.image && (
                  <img
                    src={selectedTrack.image}
                    alt={selectedTrack.title}
                    className="w-14 h-14 rounded-md object-cover shadow-inner"
                  />
                )}

                <div className="flex-1">
                  <div className="text-sm text-zinc-300 line-clamp-1">{selectedTrack?.artists?.join(", ")}</div>
                  <div className="text-white font-semibold line-clamp-1">{selectedTrack?.title}</div>
                </div>

                <div className="flex-1">
                  <iframe
                    title="Spotify Player"
                    src={`https://open.spotify.com/embed/track/${selectedSpotifyTrackId}`}
                    width="100%"
                    height={80}
                    frameBorder={0}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    className="block rounded-md overflow-hidden"
                  />
                </div>

                <div className="flex items-center">
                  <button
                    onClick={async () => {
                      // toggle like: requires signed-in user
                      try {
                        const raw = localStorage.getItem("__app_user");
                        if (!raw) {
                          // ask user to sign in
                          window.dispatchEvent(new Event("app_open_signin"));
                          return;
                        }
                        const u = JSON.parse(raw);
                        const username = u.username;
                        if (liked) {
                          await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/likes`, {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ track_id: selectedSpotifyTrackId }),
                          });
                          setLiked(false);
                        } else {
                          await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/likes`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ track_id: selectedSpotifyTrackId, title: selectedTrack?.title, artists: selectedTrack?.artists }),
                          });
                          setLiked(true);
                        }
                      } catch (e) {
                        // ignore
                      }
                    }}
                    className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-md mr-2"
                    aria-label="Like song"
                  >
                    {liked ? <IoHeart size={18} color="#ef4444" /> : <IoHeartOutline size={18} />}
                  </button>

                  <button
                    onClick={closeEmbed}
                    className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-md"
                    aria-label="Close player"
                  >
                    <IoClose size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlaylistItem;
