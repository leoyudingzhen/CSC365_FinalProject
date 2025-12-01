// spotify-token-server.ts
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());
const client_id = "0490db2e4e234d2bad0ebe1f08214d56"; // <-- Replace with your Spotify client ID
const client_secret = "964802914ef84ed2a35b363d02d844b8"; // <-- Replace with your Spotify client secret
// Hardcoded Gemini key as requested (consider moving back to env for security)
const GEMINI_API_KEY = "AIzaSyAkYQQ5cfVM3ojEAhDlOl97MwpqA3hFpdk";
console.log("[gemini] key loaded:", !!GEMINI_API_KEY);

app.get("/spotify-token", async (_req, res) => {
  try {
    const tokenUrl = "https://accounts.spotify.com/api/token";
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const response = await axios.post(tokenUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    });

    res.json({ access_token: response.data.access_token });
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

app.listen(3001, () => {
  console.log("Spotify token server running on http://localhost:3001");
});
