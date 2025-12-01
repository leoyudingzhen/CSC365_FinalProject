import { useState, useContext } from "react";
import { spotifySearch } from "../Search/SpotifySearch";
import SpotifySearchContext from "../../context/SpotifySearchContext";
import { useNavigate } from "react-router-dom";

const SHeader = () => {
  const [query, setQuery] = useState("");
  const { setResult } = useContext(SpotifySearchContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const result = await spotifySearch(query);
      setResult(result);
      navigate("/"); // Always show PlaylistItem after search
    } catch (err) {
      console.error("Spotify search failed:", err);
    }
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 1.75rem",
        backgroundColor: "#27272a",
        color: "#f9fafb",
      }}
    >
      {/* Left: Text box */}
      <div style={{ flex: 1, maxWidth: "400px" }}>
        <form onSubmit={handleSubmit}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search..."
            style={{
              width: "100%",
              padding: "0.85rem 1.35rem",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: "#18181b",
              color: "#e5e7eb",
              outline: "none",
            }}
          />
        </form>
      </div>
      {/* Right: User profile */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginLeft: "1.5rem",
        }}
      >
        <button
          style={{
            width: "55px",
            height: "55px",
            borderRadius: "999px",
            overflow: "hidden",
            backgroundColor: "#111827",
          }}
        >
          <img
            src="https://via.placeholder.com/40"
            alt="User avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </button>
      </div>
    </header>
  );
};

export default SHeader;
