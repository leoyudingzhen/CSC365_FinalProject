/**
 * spotifySearch.tsx
 * Utility to call the Spotify Web API search endpoint.
 * - Call `spotifySearch(query)` to perform a search. It will read a bearer token from
 *   localStorage key `spotify_token` if no token argument is provided.
 * - Call `setSpotifyToken(token)` to persist a token to localStorage for future calls.
 *
 * Note: This helper does not implement the OAuth flow. You must obtain a valid
 * access token (e.g., via Authorization Code or Client Credentials flow) and
 * store it using `setSpotifyToken` or pass it as the second argument to `spotifySearch`.
 */

import React from "react";

async function getSpotifyTokenFromServer(): Promise<string | null> {
  try {
    const res = await fetch("http://localhost:3001/spotify-token");
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function spotifySearch(
  query: string,
  token?: string
): Promise<any | null> {
  if (!query || !query.trim()) return null;

  let accessToken = token || localStorage.getItem("spotify_token");
  if (!accessToken) {
    accessToken = await getSpotifyTokenFromServer();
    if (accessToken) {
      localStorage.setItem("spotify_token", accessToken);
    }
  }
  if (!accessToken) {
    console.warn(
      "spotifySearch: no access token found. Call setSpotifyToken(token) or pass a token as the second argument."
    );
    return null;
  }

  const encoded = encodeURIComponent(query);
  const url = `https://api.spotify.com/v1/search?q=${encoded}&type=track,artist,album&limit=50`;

  let res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  // If token was expired, try fetching a fresh token from our server and retry once
  if (res.status === 401) {
    const fresh = await getSpotifyTokenFromServer();
    if (fresh) {
      localStorage.setItem("spotify_token", fresh);
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${fresh}`, "Content-Type": "application/json" },
      });
      if (!retry.ok) {
        const text = await retry.text();
        throw new Error(`spotifySearch: request failed after refresh (${retry.status}) - ${text}`);
      }
      return await retry.json();
    }
    const text = await res.text();
    throw new Error(`spotifySearch: request failed (401) - ${text}`);
  }

  if (!res.ok) {
    const text = await res.text();
    // Navigate to 404 if Spotify returns 404
    if (res.status === 404) {
      window.location.href = "/404";
    }
    throw new Error(`spotifySearch: request failed (${res.status}) - ${text}`);
  }

  const data = await res.json();
  return data;
}

function setSpotifyToken(token: string) {
  if (!token) return;
  localStorage.setItem("spotify_token", token);
}

export { setSpotifyToken, spotifySearch };
