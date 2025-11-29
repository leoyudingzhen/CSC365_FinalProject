import CardPlayButton from "../components/CardPlayButton";
import MusicsTable from "../components/MusicsTable";
import { useContext } from "react";
import SpotifySearchContext from "../context/SpotifySearchContext";

const PlaylistItem = () => {
  const { result } = useContext(SpotifySearchContext) as any;

  // If there is a Spotify search result, map it to Song[] for MusicsTable
  let displaySongs: any[] = [];
  let isSpotifySearch = false;
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
  console.log("Display Songs:", displaySongs);
  return (
    <>
      <div
        id="playlist-container"
        className="relative flex flex-col h-full bg-zinc-900 overflow-x-hidden"
      >
        {/* Page Header */}
        <header className="flex flex-row gap-8 px-6 mt-12">
          <picture className="aspect-square w-52 h-52 flex-none">
            <img
              src={"https://via.placeholder.com/200"}
              alt="Cover"
              className="object-cover w-full h-full shadow-lg"
            />
          </picture>
          <div className="flex flex-col justify-between">
            <h2 className="flex flex-1 items-end">Playlist</h2>
            <div>
              <h1 className="text-5xl font-bold block text-white">
                Spotify Search Results<span></span>
              </h1>
            </div>
            <div className="flex-1 flex items-end">
              <div className="text-sm text-gray-300 font-normal">
                <div>
                  <span>Spotify</span>
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
        <div className="relative z-10 px-6 pt-10">
          <MusicsTable songs={displaySongs} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 -z-[1]" />
      </div>
    </>
  );
};

export default PlaylistItem;
