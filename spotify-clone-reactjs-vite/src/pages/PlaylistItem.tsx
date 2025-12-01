import CardPlayButton from "../components/CardPlayButton";
import MusicsTable from "../components/MusicsTable";
import { useContext } from "react";
import SpotifySearchContext from "../context/SpotifySearchContext";

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
        {/* Removed CardPlayButton */}
        <div className="relative z-10 px-6 pt-10">
          <MusicsTable songs={displaySongs} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 -z-[1]" />
      </div>
    </>
  );
};

export default PlaylistItem;
