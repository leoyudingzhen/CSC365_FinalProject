// spotify-token-server.ts
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors()); // <-- Add this line
const client_id = "0490db2e4e234d2bad0ebe1f08214d56"; // <-- Replace with your Spotify client ID
const client_secret = "964802914ef84ed2a35b363d02d844b8"; // <-- Replace with your Spotify client secret

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

app.listen(3001, () => {
  console.log("Spotify token server running on http://localhost:3001");
});
