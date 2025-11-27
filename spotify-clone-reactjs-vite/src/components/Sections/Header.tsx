import { useState, useEffect } from "react";




let imageUrl = "";

const SHeader = () => {

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
  return localStorage.getItem("loggedIn") === "true";
});

  
  useEffect(() => {
    localStorage.setItem("loggedIn", isLoggedIn ? "true" : "false");
  }, [isLoggedIn]);

  const handleLogin = (username: string, password: string) => {
    
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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
        <input
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
          {isLoggedIn ? (
          <>
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
          </>
          ) : (
            <button
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: "0.5rem",        // rectangle with rounded corners
                border: "none",
                backgroundColor: "#22c55e", // red/green
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {"Sign In"}
            </button>
          )}
      </div>
    </header>
    )
}

export default SHeader;