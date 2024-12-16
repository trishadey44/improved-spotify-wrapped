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
    const artistCounts = {};
    const genreCounts = {};

    for (const row of data) {
        const track = row['Track Name']?.trim();
        const artist = row['Artist Name']?.trim();
        const duration = parseInt(row['Milliseconds Played']?.trim() || '0', 10);

        if (track && artist && duration) {
            totalSongs++;
            totalMilliseconds += duration;
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;

            // Fetch genres for the artist
            const genres = await fetchGenresFromAPI(artist);
            genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        }
    }

    // Calculate top 5 genres
    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre, count]) => `${genre} (${count} plays)`);

    // Update stats
    document.getElementById('totalSongs').textContent = totalSongs;
    document.getElementById('totalMinutes').textContent = Math.round(totalMilliseconds / 60000);
    document.getElementById('topGenres').innerHTML = topGenres.map(genre => `<li>${genre}</li>`).join('');
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
