# 🎧 Spotlite – A Tiny Spotify-Powered Web Player

> *“Let users pick a song on **your** site, let Spotify do the heavy lifting.”*

Spotlite is a lightweight web app that lets users **search Spotify tracks on your website** and **play them in an embedded Spotify player** — no messy OAuth on the frontend, no complex Web Playback SDK setup.

You get:

- A clean, custom UI for search & selection  
- A sticky Spotify-style player on your site  
- Spotify doing all the playback inside an embed  

---

## ✨ Features

- 🔍 **Search Spotify’s catalog**  
  Uses your backend + Spotify’s Client Credentials Flow to fetch tracks by keyword.

- ▶️ **Play tracks via Spotify Embed**  
  When a user clicks a track, the embedded Spotify player loads that song and plays it.

- 🎛 **Custom UI, real Spotify audio**  
  Your React components handle search results and UX, while Spotify’s official embed takes care of playback, login, and device handling.

- 🧼 **No tokens in the browser**  
  The browser never sees your client secret; the frontend only talks to your backend.

- 📱 **Responsive & SPA-friendly**  
  Built with React + Vite — easy to drop into an existing project or run standalone.

---

## 🧠 High-Level Architecture

```text
User 👤
  ↓ (search: "lofi beats")
Frontend (React + Vite)
  ↓ (GET /api/spotify/search?q=lofi beats)
Backend (Client Credentials Flow)
  - Uses SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET
  - Calls Spotify Web API /search
  ↓ (JSON tracks list)
Frontend renders results
  ↓ (user clicks a track)
React updates the embed's track ID/URI
  ↓
Spotify Embed iframe (open.spotify.com)
  - Handles login (if needed)
  - Streams the audio 🎵

