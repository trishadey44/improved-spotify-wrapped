import fetch from 'node-fetch';
import axios from 'axios';
import express from 'express';
import cors from 'cors';
import { storeGenresInDB, getGenresFromDB } from './db.js';  // Import the database functions

const app = express();
const port = 3000;

const clientId = '63fb02f4245d44cdb0fbaa84be43e33f'; // Replace with your actual client ID
const clientSecret = 'b9788b4ad47f41c6bcb7d7a4ea9ef91c'; // Replace with your actual client secret

let token = null;
let genreCache = {};

// Function to get Spotify token
async function getSpotifyToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    token = data.access_token;
}

// Middleware to refresh token if expired
app.use(async (req, res, next) => {
    if (!token) await getSpotifyToken();
    next();
});

app.use(cors());

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

// Retry logic with better error handling
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
    try {
        const response = await fetch(url, options);

        // Handle rate-limited responses (status 429)
        if (response.status === 429) {
            console.log('Rate-limited by Spotify, retrying...');
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(url, options, retries - 1);
        }

        // Handle non-OK responses
        if (!response.ok) {
            throw new Error(`Request failed: ${response.statusText}`);
        }

        return response;  // Return the response if no errors

    } catch (error) {
        // Log the full error object for better diagnostics
        console.error('Error details:', error);

        // Handle "Premature close" error specifically
        if (error.code === 'ERR_STREAM_PREMATURE_CLOSE' && retries > 0) {
            console.log(`Premature close error, retrying... attempts remaining: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));  // Wait before retry
            return fetchWithRetry(url, options, retries - 1);
        }

        // Handle any other errors and retry
        if (retries > 0) {
            console.log(`Error encountered: ${error.message}. Retrying... attempts remaining: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));  // Wait before retry
            return fetchWithRetry(url, options, retries - 1);
        } else {
            console.error('Max retries reached. Error:', error);
            throw new Error(`Request failed after multiple retries: ${error.message}`);
        }
    }
}


// Endpoint to fetch genres for an artist
app.get('/genres', async (req, res) => {
    const artist = req.query.artist;
    if (!artist) return res.status(400).send({ error: 'Missing artist parameter' });

    try {
        // Step 1: Check if the genres are already in the database
        getGenresFromDB(artist, async (cachedGenres) => {
            if (cachedGenres) {
                console.log(`Genres for ${artist} found in database`);
                return res.json({ genres: cachedGenres });
            } else {
                // Step 2: If not in DB, fetch from Spotify API
                console.log(`Fetching genres for artist: ${artist}`);

                // Search for the artist by name to get the Spotify ID
                const searchResponse = await fetchWithRetry(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!searchResponse.ok) {
                    throw new Error(`Request failed: ${searchResponse.statusText}`);
                }

                const searchData = await searchResponse.json();

                // Check if the artist exists in the response
                if (!searchData.artists || searchData.artists.items.length === 0) {
                    console.error('Error searching for artist:', searchData);
                    return res.status(404).json({ error: 'Artist not found' });
                }

                // Now proceed with the artist ID and genres extraction
                const artistId = searchData.artists.items[0].id;

                // Get genres from the artist's details using the Spotify artist ID
                const artistResponse = await fetchWithRetry(`https://api.spotify.com/v1/artists/${artistId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const artistData = await artistResponse.json();
                const genres = artistData.genres;

                // Store the fetched genres in the database
                storeGenresInDB(artist, genres);

                console.log('Genres fetched and stored:', genres);
                return res.json({ genres });
            }
        });
    } catch (error) {
        console.error('Error fetching genres:', error);
        return res.status(500).json({ error: 'An error occurred while fetching genres' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});