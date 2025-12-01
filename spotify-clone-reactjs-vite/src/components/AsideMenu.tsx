import SideMenuItem from "./SideMenuItem";
import { useEffect, useState } from "react";

const AsideMenu = () => {
  const [likedPlaylists, setLikedPlaylists] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadLiked = async (usernameFromEvent?: string) => {
      try {
        let username = usernameFromEvent;
        if (!username) {
          const raw = localStorage.getItem("__app_user");
          if (!raw) {
            setLikedPlaylists(null);
            return;
          }
          const u = JSON.parse(raw);
          username = u?.username;
        }
        if (!username) {
          setLikedPlaylists(null);
          return;
        }

        const r = await fetch(`http://localhost:3001/users/${encodeURIComponent(username)}/likes`);
        if (!r.ok) {
          setLikedPlaylists(null);
          return;
        }
        const likes = await r.json();

        // Resolve Spotify track images where possible
        const tokenResp = await fetch("http://localhost:3001/spotify-token");
        const token = tokenResp.ok ? await tokenResp.json() : null;

        const resolved = await Promise.all(
          likes.map(async (l: any) => {
            const id = l.track_id || l.trackId || l.id;
            let cover = l.image || "";
            let artists = l.artists || (l.artistsString ? l.artistsString.split(",") : []);
            let title = l.title || "Liked Song";
            if (token && id) {
              try {
                const tr = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
                  headers: { Authorization: `Bearer ${token.access_token}` },
                });
                if (tr.ok) {
                  const track = await tr.json();
                  cover = track.album.images[0]?.url || cover;
                  artists = track.artists.map((a: any) => a.name);
                  title = track.name || title;
                }
              } catch (e) {
                // ignore
              }
            }
            return { id, cover, title, artists };
          })
        );

        if (mounted) setLikedPlaylists(resolved.filter(Boolean));
      } catch (e) {
        if (mounted) setLikedPlaylists(null);
      }
    };

    // initial load
    loadLiked();

    const handler = (e: any) => {
      // If the event carries the user in detail, use it to avoid races with localStorage updates
      try {
        if (e && e.detail && Object.prototype.hasOwnProperty.call(e.detail, "user")) {
          const u = e.detail.user;
          loadLiked(u?.username);
          return;
        }
      } catch {}
      // fallback: re-read from localStorage
      loadLiked();
    };

    window.addEventListener("app_user_change", handler as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("app_user_change", handler as EventListener);
    };
  }, []);

  const items = likedPlaylists || [];

  return (
    <>
      <nav className="flex flex-col flex-1 gap-2">
        <div className="bg-zinc-900 rounded-lg p-2">
          <ul>
            <SideMenuItem href="/" text="Home" />
          </ul>
        </div>

        <div className="bg-zinc-900 rounded-lg p-2 flex-1">
          <ul>
            <SideMenuItem href="/" text="Library" />

            {items.map((playlist) => (
              <li key={playlist?.id}>
                <div
                  onClick={() => {
                    const track = { id: playlist.id, title: playlist.title, artists: playlist.artists, image: playlist.cover };
                    try {
                      window.dispatchEvent(new CustomEvent("app_play_spotify", { detail: { track } }));
                    } catch (e) {
                      try {
                        const ev = new Event("app_play_spotify");
                        // @ts-ignore
                        ev.detail = { track };
                        window.dispatchEvent(ev);
                      } catch {}
                    }
                  }}
                  className="playlist-item flex relative p-2 overflow-hidden items-center gap-5 rounded-md hover:bg-zinc-800 cursor-pointer"
                >
                  <picture className="h-12 w-12 flex-none">
                    <img src={playlist?.cover} alt={playlist?.title} className="object-cover w-full h-full rounded-md" />
                  </picture>

                  <div className="flex flex-auto flex-col truncate">
                    <h4 className="text-white text-sm">{playlist?.title}</h4>

                    <span className="text-xs text-gray-400">{(playlist?.artists || []).join(", ")}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default AsideMenu;
