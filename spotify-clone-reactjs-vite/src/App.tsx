import "./App.css";
import MainSection from "./components/Sections/MainSection";
import AsideMenu from "./components/AsideMenu";
import PlaylistItem from "./pages/PlaylistItem";
import { Routes, Route, Navigate } from "react-router-dom";
import Search from "./pages/Search";
import Softspot from "./components/soft-spot/Softspot";
import SHeader from "./components/Sections/Header";
import { useState, useEffect } from "react";
import SpotifySearchContext from "./context/SpotifySearchContext";

function App() {
  const [spotifyResult, setSpotifyResult] = useState<any>(null);
  const [user, setUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("__app_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handler = (e: any) => {
      try {
        // If the event carries the user in detail, use it immediately
        if (e && e.detail && Object.prototype.hasOwnProperty.call(e.detail, "user")) {
          setUser(e.detail.user);
          return;
        }
        const raw = localStorage.getItem("__app_user");
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("app_user_change", handler as EventListener);
    return () => window.removeEventListener("app_user_change", handler as EventListener);
  }, []);

  return (
    <SpotifySearchContext.Provider
      value={{ result: spotifyResult, setResult: setSpotifyResult }}
    >
      <header className="[grid-area:header] mb-2">
        <SHeader />
      </header>
      {user ?
      <div id="app" className="relative h-screen p-2 gap-2">
        <aside className="[grid-area:aside] flex-col flex overflow-y-auto">
          <AsideMenu />
        </aside>
        <Softspot theme="zinc" />
        <main className="[grid-area:main] rounded-lg bg-zinc-900 overflow-y-auto">
          <Routes>
            <Route path="/" element={<MainSection user={user} />} />
            <Route path="/playlist" element={<PlaylistItem />} />
            <Route path="/search" element={<Search />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <slot />
        </main>
      </div> : 
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Please sign in first</h2>
          <p className="text-sm text-zinc-400">Sign in to view your profile and most-played tracks.</p>
          <button
            className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded font-semibold"
            onClick={() => window.dispatchEvent(new Event("app_open_signin"))}
          >
            Sign In
          </button>
        </div>
      </div>
    }
    </SpotifySearchContext.Provider>
  );
}

export default App;
