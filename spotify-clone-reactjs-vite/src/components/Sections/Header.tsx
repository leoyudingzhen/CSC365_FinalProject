




let imageUrl = "";

const SHeader = () => {
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
        {/* Avatar */}
        <div
          style={{
            width: "55px",
            height: "55px",
            borderRadius: "999px",
            overflow: "hidden",
            backgroundColor: "#111827",
          }}
        >
            <button
            style={{
              padding: "0.15rem 0.6rem",
              cursor: "pointer",
            }}
            >
                <img
                    src="https://via.placeholder.com/40"
                    alt="User avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </button>
        </div>

        {/* User info */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Username</span>
          <button
            type="button"
            style={{
              marginTop: "2px",
              fontSize: "0.75rem",
              padding: "0.15rem 0.6rem",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              backgroundColor: "#21c872",
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            Profile
          </button>
        </div>
      </div>
    </header>
    )
}

export default SHeader;