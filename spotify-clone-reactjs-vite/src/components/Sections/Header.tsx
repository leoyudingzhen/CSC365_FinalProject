import { useState, useContext, useEffect } from "react";
import { spotifySearch } from "../Search/SpotifySearch";
import SpotifySearchContext from "../../context/SpotifySearchContext";
import { useNavigate } from "react-router-dom";



const SHeader = () => {
  const [query, setQuery] = useState("");
  const { setResult } = useContext(SpotifySearchContext as any) as any;
  const navigate = useNavigate();

  // Local auth state (no AuthContext) — persisted to localStorage
  const [user, setUser] = useState<{ email: string; username: string; createdAt?: string } | null>(() => {
    try {
      const raw = localStorage.getItem("__app_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) localStorage.setItem("__app_user", JSON.stringify(user));
    else localStorage.removeItem("__app_user");
  }, [user]);

  // Listen for app-level requests to open the sign-in modal
  useEffect(() => {
    const openHandler = () => {
      setError(null);
      setIsSignup(false);
      setShowModal(true);
    };
    const openSignupHandler = () => {
      setError(null);
      setIsSignup(true);
      setShowModal(true);
    };
    window.addEventListener("app_open_signin", openHandler);
    window.addEventListener("app_open_signup", openSignupHandler);
    return () => {
      window.removeEventListener("app_open_signin", openHandler);
      window.removeEventListener("app_open_signup", openSignupHandler);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const result = await spotifySearch(query);
      setResult(result);
      navigate("/playlist"); // Navigate to playlist view after search
    } catch (err) {
      console.error("Spotify search failed:", err);
    }
  };

  const openSignIn = () => {
    setError(null);
    setIsSignup(false);
    setShowModal(true);
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("http://localhost:3001/accounts");
      if (!r.ok) {
        setError("Server error");
        setLoading(false);
        return;
      }
      const accounts = (await r.json()) as any[];
      const found = accounts.find((a) => a.email === email.trim() && a.password === password);
      if (found) {
        const u = { email: found.email, username: found.username };
        setUser(u);
        // notify app about user change, include user in detail so other windows don't need to read localStorage
        try {
          window.dispatchEvent(new CustomEvent("app_user_change", { detail: { user: u } }));
        } catch {}
        setShowModal(false);
        setEmail("");
        setPassword("");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Network error");
    }
    setLoading(false);
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    if (!email || !username || !password) {
      setError("Please fill all fields");
      setLoading(false);
      return;
    }
    try {
      const r = await fetch("http://localhost:3001/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), username: username.trim(), password }),
      });
      if (!r.ok) {
        const data = await r.json();
        setError(data.error || "Failed to sign up");
        setLoading(false);
        return;
      }
      const createdAt = new Date().toISOString();
      const u = { email: email.trim(), username: username.trim(), createdAt };
      setUser(u);
      // notify app about new user immediately via event detail
      try {
        window.dispatchEvent(new CustomEvent("app_user_change", { detail: { user: u } }));
      } catch {}
      setShowModal(false);
      setEmail("");
      setUsername("");
      setPassword("");
    } catch (err) {
      setError("Network error");
    }
    setLoading(false);
  };

  const signOut = () => {
    setUser(null);
    try {
      window.dispatchEvent(new CustomEvent("app_user_change", { detail: { user: null } }));
    } catch {}
  };


  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 1.75rem",
        background: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #1e3a2f 100%)",
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
            className="focus:ring-2 focus:ring-emerald-500/50 transition-shadow duration-200"
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
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{user.username}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{user.email}</div>
            </div>
            <button
              onClick={() => signOut()}
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: 8,
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={openSignIn}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-400/40 transition-all duration-200"
              style={{
                padding: "0.55rem 0.95rem",
                borderRadius: 999,
                color: "white",
                border: "none",
                fontWeight: 600,
              }}
            >
              Sign in
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />

          <div className="relative bg-zinc-900 rounded-lg shadow-2xl w-96 p-6 z-60 transform transition-all duration-200 scale-100">
            <h3 className="text-white text-lg font-semibold mb-3">{isSignup ? "Create account" : "Sign in"}</h3>

            <form onSubmit={isSignup ? handleSignUp : handleSignIn} className="flex flex-col gap-3">
              <input
                className="bg-zinc-800 text-white px-3 py-2 rounded outline-none"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />

              {isSignup && (
                <input
                  className="bg-zinc-800 text-white px-3 py-2 rounded outline-none"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}

              <input
                className="bg-zinc-800 text-white px-3 py-2 rounded outline-none"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />

              {error && <div className="text-red-400 text-sm">{error}</div>}

              <div className="flex items-center justify-between mt-2">
                <button
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-4 py-2 rounded font-semibold shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-400/40 transition-all duration-200"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
                </button>

                <button
                  type="button"
                  className="text-sm text-zinc-400 underline"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError(null);
                  }}
                >
                  {isSignup ? "Have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>

            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default SHeader;
