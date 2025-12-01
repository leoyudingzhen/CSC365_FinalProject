import { playlists } from "../lib/data";
import SearchItemCard from "../components/Search/SearchItemCard";

const Search = () => {
  return (
    <div className="relative transition-all duration-1000 bg-green-600">
      <div className="flex flex-1 fixed px-6 pt-2 pb-2 z-20">
        {/* Search is now handled by Spotify API in Header and PlaylistItem */}
        <p className="text-white">
          Search is now powered by Spotify API. Use the search box in the
          header.
        </p>
      </div>
    </div>
  );
};

export default Search;
