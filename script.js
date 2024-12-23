document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            processCSVData(results.data);
        },
        error: function (error) {
            console.error("Error parsing CSV:", error);
        }
    });
}

async function processCSVData(data) {
    document.getElementById('stats').style.display = 'block';

    let totalSongs = 0;
    let totalMilliseconds = 0;
    let totalPodcastMinutes = 0;
    const songCounts = {};
    const genreCounts = {};
    const podcastCounts = {};
    const artistCounts = {};
    const albumCounts = {};
    const songsListenedToBefore = new Set(); // Track songs already listened to
    let newSongs = 0;

    for (const row of data) {
        const track = row['Track Name']?.trim();
        const artist = row['Artist Name']?.trim();
        const duration = parseInt(row['Milliseconds Played']?.trim() || '0', 10);
        const podcast = row['Podcast Name']?.trim(); // Assuming podcasts are identified by this field
        const album = row['Album Name']?.trim(); 

        if (track && artist && duration) {
            totalSongs++;
            totalMilliseconds += duration;
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
            songCounts[track] = (songCounts[track] || 0) + 1;

            // Track if the song is new
            if (!songsListenedToBefore.has(track)) {
                newSongs++;
                songsListenedToBefore.add(track);
            }

            // Fetch genres for the artist
            const genres = await fetchGenresFromAPI(artist);
            genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });

            if (album) {
                albumCounts[album] = (albumCounts[album] || 0) + 1;
            }
            
        }

        if (podcast && duration) {
            totalPodcastMinutes += Math.round(duration / 60000);
            podcastCounts[podcast] = (podcastCounts[podcast] || 0) + 1;
        }
    }

    // Calculate new songs percentage
    const newSongsPercentage = totalSongs > 0 ? (newSongs / totalSongs) * 100 : 0;

    // Calculate top 5 songs
    const topSongs = Object.entries(songCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([song, count]) => `${song} (${count} plays)`);

    // Calculate top 5 genres
    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre, count]) => `${genre} (${count} plays)`);

    // Calculate top 5 podcasts
    const topPodcasts = Object.entries(podcastCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([podcast, count]) => `${podcast} (${count} plays)`);

    // Calculate top 5 albums
    const topAlbums = Object.entries(albumCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([album, count]) => `${album} (${count} plays)`);

    // Update stats
    document.getElementById('totalSongs').textContent = totalSongs;
    document.getElementById('totalMinutes').textContent = Math.round(totalMilliseconds / 60000);
    document.getElementById('topSongs').innerHTML = topSongs.map(song => `<li>${song}</li>`).join('');
    document.getElementById('topGenres').innerHTML = topGenres.map(genre => `<li>${genre}</li>`).join('');
    document.getElementById('topAlbums').innerHTML = topAlbums.map(album => `<li>${album}</li>`).join('');
    document.getElementById('mostPlayedPodcast').textContent = Object.keys(podcastCounts)[0] || 'N/A';
    document.getElementById('totalPodcastMinutes').textContent = totalPodcastMinutes;
    document.getElementById('topPodcasts').innerHTML = topPodcasts.map(podcast => `<li>${podcast}</li>`).join('');
    document.getElementById('newSongsPercentage').textContent = `${newSongsPercentage.toFixed(2)}%`;
}

async function fetchGenresFromAPI(artist) {
    try {
        const response = await fetch(`http://localhost:3000/genres?artist=${encodeURIComponent(artist)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.genres || []; // Ensure that genres is returned even if empty
    } catch (error) {
        console.error('Error fetching genres:', error);
        return []; // Return an empty array in case of error
    }
}
