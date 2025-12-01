// spotify-token-server.ts
import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// TODO: Replace these with your own Spotify app credentials
const client_id = "0490db2e4e234d2bad0ebe1f08214d56";
const client_secret = "964802914ef84ed2a35b363d02d844b8";
// Hardcoded Gemini key as requested (consider moving back to env for security)
const GEMINI_API_KEY = "AIzaSyAkYQQ5cfVM3ojEAhDlOl97MwpqA3hFpdk";
console.log("[gemini] key loaded:", !!GEMINI_API_KEY);
// --- Spotify token cache and auto-refresh ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms
let refreshTimeout: NodeJS.Timeout | null = null;
let fetchInProgress = false;

async function fetchTokenFromSpotify(): Promise<string | null> {
  if (fetchInProgress) {
    // wait until current fetch completes
    return new Promise((resolve) => {
      const wait = setInterval(() => {
        if (!fetchInProgress) {
          clearInterval(wait);
          resolve(cachedToken);
        }
      }, 200);
    });
  }

  fetchInProgress = true;
  try {
    const tokenUrl = "https://accounts.spotify.com/api/token";
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const response = await axios.post(tokenUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    });

    const access_token = response.data.access_token as string;
    const expires_in = Number(response.data.expires_in) || 3600; // seconds

    cachedToken = access_token;
    // set expiry a bit earlier than actual to be safe
    tokenExpiresAt = Date.now() + (expires_in - 60) * 1000;

    // schedule next refresh (refresh a bit before expiry)
    if (refreshTimeout) clearTimeout(refreshTimeout);
    const msUntilRefresh = Math.max(1000, (expires_in - 120) * 1000);
    refreshTimeout = setTimeout(() => {
      // trigger refresh but don't await here
      fetchTokenFromSpotify().catch((e) => console.error("Token refresh failed:", e));
    }, msUntilRefresh);

    console.log("Fetched new Spotify token, expires_in:", expires_in);
    return cachedToken;
  } catch (err) {
    console.error("Failed fetching token from Spotify:", err);
    return null;
  } finally {
    fetchInProgress = false;
  }
}

// Warm up token on server start
fetchTokenFromSpotify().catch((e) => console.error("Initial token fetch failed:", e));

app.get("/spotify-token", async (_req, res) => {
  try {
    // Return cached token if available and not expired
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return res.json({ access_token: cachedToken });
    }

    // Otherwise fetch a new token (will update cache)
    const token = await fetchTokenFromSpotify();
    if (!token) return res.status(500).json({ error: "Failed to fetch token" });
    res.json({ access_token: token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/gemini/recommend", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  if (!GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  // Use an available generateContent model from your ListModels output
  const modelUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const systemPrompt =
    "You are a concise music concierge. Recommend fresh, recognizable songs users can stream on Spotify. Respond as JSON with a 'songs' array of objects: {title, artist, album?, genre?, reason?}. Keep between 3 and 8 songs. Do not include URLs.";

  try {
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nUser request: ${prompt}`,
            },
          ],
        },
      ],
    };

    const { data } = await axios.post(modelUrl, payload, {
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
    });

    let textResponse: string | null =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text)
        .filter(Boolean)
        .join("\n") ?? null;

    if (!textResponse) {
      return res
        .status(500)
        .json({ error: "Gemini returned an empty response." });
    }

    // If Gemini wrapped JSON in a code block, strip the fences
    const stripped = textResponse
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    try {
      const parsed = JSON.parse(stripped);
      const songs = parsed.songs || parsed.recommendations || [];
      return res.json({ songs, source: "gemini" });
    } catch {
      // If Gemini didn't return valid JSON, send the raw text back so UI can still show it
      return res.json({ songs: [], reply: stripped, source: "gemini" });
    }
  } catch (err: any) {
    const status = err?.response?.status || 500;
    const details = err?.response?.data || err?.message || "unknown error";
    console.error("Gemini recommend error", details);
    return res
      .status(status)
      .json({ error: "Failed to fetch recommendations", details });
  }
});

// --- Accounts CSV storage ---
const accountsDir = path.join(process.cwd(), "src", "lib", "accounts");
const accountsFile = path.join(accountsDir, "accounts.csv");

const ensureAccountsFile = async () => {
  try {
    await fs.promises.mkdir(accountsDir, { recursive: true });
    if (!fs.existsSync(accountsFile)) {
      await fs.promises.writeFile(accountsFile, "email,username,password\n", "utf8");
    }
  } catch (err) {
    console.error("Failed to ensure accounts file:", err);
  }
};

const sanitizeField = (v: any) => String(v ?? "").replace(/}/g, "").trim();
const esc = (v: string) => '"' + String(v).replace(/"/g, '""') + '"';

app.post("/accounts", async (req, res) => {
  const { email, username, password } = req.body || {};
  if (!email || !username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    await ensureAccountsFile();

    const txt = await fs.promises.readFile(accountsFile, "utf8");
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/) || [];

    const rows = lines.map((ln) => {
      const cols = ln.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((c) => c.replace(/^\"|\"$/g, "").replace(/\"\"/g, '"'));
      return Object.fromEntries(header.map((h, i) => [h, cols[i] || ""]));
    });

    const emailExists = rows.some((r: any) => r.email?.toLowerCase() === String(email).trim().toLowerCase());
    const usernameExists = rows.some((r: any) => r.username?.toLowerCase() === String(username).trim().toLowerCase());

    if (emailExists) return res.status(409).json({ error: "Email already exists" });
    if (usernameExists) return res.status(409).json({ error: "Username already exists" });

    const line = `${esc(sanitizeField(email))},${esc(sanitizeField(username))},${esc(sanitizeField(password))}\n`;
    await fs.promises.appendFile(accountsFile, line, "utf8");

    // Create per-user folder and files (sanitized username for filename)
    const sanitize = (s: string) => String(s).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const userDirName = sanitize(username);
    const userDir = path.join(accountsDir, userDirName);
    await fs.promises.mkdir(userDir, { recursive: true });

    const userInfoFile = path.join(userDir, `${userDirName}.csv`);
    if (!fs.existsSync(userInfoFile)) {
      const createdAt = new Date().toISOString();
      const headerRow = "created_at,birthday,follow\n";
      const row = `${createdAt},,\n`;
      await fs.promises.writeFile(userInfoFile, headerRow + row, "utf8");
    }

    const musicCountsFile = path.join(userDir, "music_play_counts.csv");
    if (!fs.existsSync(musicCountsFile)) {
      await fs.promises.writeFile(musicCountsFile, "track_id,play_count\n", "utf8");
    }

    const likedFile = path.join(userDir, "liked_songs.csv");
    if (!fs.existsSync(likedFile)) {
      await fs.promises.writeFile(likedFile, "track_id,title,artists\n", "utf8");
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("POST /accounts error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

app.get("/accounts", async (_req, res) => {
  try {
    await ensureAccountsFile();
    const txt = await fs.promises.readFile(accountsFile, "utf8");
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/) || [];
    const rows = lines.map((ln) => {
      const cols = ln.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((c) => c.replace(/^\"|\"$/g, "").replace(/\"\"/g, '"'));
      return Object.fromEntries(header.map((h, i) => [h, cols[i] || ""]));
    });
    return res.json(rows);
  } catch (err: any) {
    console.error("GET /accounts error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Helper: resolve user dir from username (sanitized)
const userDirFor = (username: string) => {
  const sanitize = (s: string) => String(s).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const userDirName = sanitize(username);
  return { userDirName, userDir: path.join(accountsDir, userDirName) };
};

// GET user's play counts
app.get("/users/:username/plays", async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ error: "Missing username" });
  try {
    const { userDir } = userDirFor(username);
    const countsFile = path.join(userDir, "music_play_counts.csv");
    if (!fs.existsSync(countsFile)) return res.json([]);
    const txt = await fs.promises.readFile(countsFile, "utf8");
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift();
    const rows = lines.map((l) => {
      const [id, cnt] = l.split(",");
      return { track_id: id, play_count: Number(cnt || 0) };
    });
    // sort by play_count desc
    rows.sort((a, b) => b.play_count - a.play_count);
    return res.json(rows);
  } catch (err: any) {
    console.error("GET /users/:username/plays error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// POST increment play count for a user
app.post("/users/:username/plays", async (req, res) => {
  const { username } = req.params;
  const { track_id } = req.body || {};
  if (!username || !track_id) return res.status(400).json({ error: "Missing username or track_id" });
  try {
    const { userDir } = userDirFor(username);
    await fs.promises.mkdir(userDir, { recursive: true });
    const countsFile = path.join(userDir, "music_play_counts.csv");
    if (!fs.existsSync(countsFile)) {
      await fs.promises.writeFile(countsFile, "track_id,play_count\n", "utf8");
    }

    const txt = await fs.promises.readFile(countsFile, "utf8");
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift();
    const rows = lines.map((l) => {
      const [id, cnt] = l.split(",");
      return { id, cnt: Number(cnt || 0) };
    });

    const idx = rows.findIndex((r) => String(r.id) === String(track_id));
    if (idx === -1) {
      rows.push({ id: String(track_id), cnt: 1 });
    } else {
      rows[idx].cnt += 1;
    }

    const out = ["track_id,play_count", ...rows.map((r) => `${r.id},${r.cnt}`)].join("\n") + "\n";
    await fs.promises.writeFile(countsFile, out, "utf8");
    return res.json({ success: true, track_id, play_count: rows.find((r) => String(r.id) === String(track_id))?.cnt || 1 });
  } catch (err: any) {
    console.error("POST /users/:username/plays error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// GET liked songs for a user
app.get("/users/:username/likes", async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ error: "Missing username" });
  try {
    const { userDir } = userDirFor(username);
    const likedFile = path.join(userDir, "liked_songs.csv");
    if (!fs.existsSync(likedFile)) return res.json([]);
    const txt = await fs.promises.readFile(likedFile, "utf8");
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/) || [];
    const rows = lines.map((ln) => {
      const cols = ln.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((c) => c.replace(/^\"|\"$/g, "").replace(/\"\"/g, '"'));
      return Object.fromEntries(header.map((h, i) => [h, cols[i] || ""]));
    });
    return res.json(rows);
  } catch (err: any) {
    console.error("GET /users/:username/likes error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// POST add liked song (idempotent)
app.post("/users/:username/likes", async (req, res) => {
  const { username } = req.params;
  const { track_id, title, artists } = req.body || {};
  if (!username || !track_id) return res.status(400).json({ error: "Missing username or track_id" });
  try {
    const { userDir } = userDirFor(username);
    await fs.promises.mkdir(userDir, { recursive: true });
    const likedFile = path.join(userDir, "liked_songs.csv");
    if (!fs.existsSync(likedFile)) {
      await fs.promises.writeFile(likedFile, "track_id,title,artists\n", "utf8");
    }
    const txt = await fs.promises.readFile(likedFile, "utf8");
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/) || [];
    const rows = lines.map((ln) => {
      const cols = ln.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((c) => c.replace(/^\"|\"$/g, "").replace(/\"\"/g, '"'));
      return Object.fromEntries(header.map((h, i) => [h, cols[i] || ""]));
    });
    const exists = rows.some((r) => String(r.track_id) === String(track_id));
    if (exists) return res.json({ success: true, liked: true });
    const line = `${esc(String(track_id))},${esc(String(title || ""))},${esc(String((artists || []).join ? (artists || []).join(", ") : artists || ""))}\n`;
    await fs.promises.appendFile(likedFile, line, "utf8");
    return res.json({ success: true, liked: true });
  } catch (err: any) {
    console.error("POST /users/:username/likes error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// DELETE remove liked song
app.delete("/users/:username/likes", async (req, res) => {
  const { username } = req.params;
  const { track_id } = req.body || {};
  if (!username || !track_id) return res.status(400).json({ error: "Missing username or track_id" });
  try {
    const { userDir } = userDirFor(username);
    const likedFile = path.join(userDir, "liked_songs.csv");
    if (!fs.existsSync(likedFile)) return res.json({ success: true, liked: false });
    const txt = await fs.promises.readFile(likedFile, "utf8");
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const header = lines.shift();
    const rows = lines.map((l) => l);
    const filtered = rows.filter((l) => {
      const first = l.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)[0];
      const id = first.replace(/^"|"$/g, "");
      return String(id) !== String(track_id);
    });
    const out = (header ? header + "\n" : "") + (filtered.join("\n") ? filtered.join("\n") + "\n" : "");
    await fs.promises.writeFile(likedFile, out, "utf8");
    return res.json({ success: true, liked: false });
  } catch (err: any) {
    console.error("DELETE /users/:username/likes error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

app.listen(3001, () => {
  console.log("Spotify token server running on http://localhost:3001");
});
