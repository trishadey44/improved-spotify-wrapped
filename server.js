import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';

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

async function fetchWithRateLimit(url, options) {
    let retries = 3; // Number of retries before giving up
    while (retries > 0) {
        const response = await fetch(url, options);
        
        if (response.status === 429) { // Too many requests (rate limit)
            const retryAfter = response.headers.get('Retry-After');
            console.log(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000)); // Wait before retrying
        } else {
            return response;
        }
        retries--;
    }
    return null; // If we hit the retry limit, return null
}

// Endpoint to fetch genres for an artist
app.get('/genres', async (req, res) => {
    const artist = req.query.artist;
    if (!artist) return res.status(400).send({ error: 'Missing artist parameter' });

    try {
        // Check if the genres are already in the cache
        if (genreCache[artist]) {
            console.log(`Genres for ${artist} found in cache`);
            return res.json({ genres: genreCache[artist] });
        }

        console.log(`Fetching genres for artist: ${artist}`);

        // Step 1: Search for the artist by name to get the Spotify ID
        const searchResponse = await fetchWithRateLimit(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!searchResponse) {
            return res.status(500).json({ error: 'Too many requests. Please try again later.' });
        }

        const searchData = await searchResponse.json();
        
        if (!searchResponse.ok || !searchData.artists || searchData.artists.items.length === 0) {
            console.error('Error searching for artist:', searchData);
            return res.status(404).json({ error: 'Artist not found' });
        }

        const artistId = searchData.artists.items[0].id;
        console.log(`Found artist ID: ${artistId}`);

        // Step 2: Get genres from the artist's details using the Spotify artist ID
        const artistResponse = await fetchWithRateLimit(`https://api.spotify.com/v1/artists/${artistId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!artistResponse) {
            return res.status(500).json({ error: 'Too many requests. Please try again later.' });
        }

        const artistData = await artistResponse.json();
        const genres = artistData.genres;
        console.log('Genres fetched:', genres); // Log the data from Spotify API

        // Store the fetched genres in the cache
        genreCache[artist] = genres;

        res.json({ genres }); // Send back the genres for the artist
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error fetching data', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
