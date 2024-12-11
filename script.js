document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true, // Use the first row as headers
        skipEmptyLines: true, // Ignore empty rows
        complete: function (results) {
            processCSVData(results.data);
        },
        error: function (error) {
            console.error("Error parsing CSV:", error);
        }
    });
}

function processCSVData(data) {
    // Show the stats section
    document.getElementById('stats').style.display = 'block'; // Or remove the "hidden" class
    // document.getElementById('stats').classList.remove('hidden');

    // Initialize variables for calculations
    let totalSongs = 0;
    let totalMilliseconds = 0;
    let totalPodcastMilliseconds = 0;
    const songCounts = {};
    const artistCounts = {};
    const podcastCounts = {};

    data.forEach(row => {
        const track = row['Track Name']?.trim();
        const artist = row['Artist Name']?.trim();
        const duration = parseInt(row['Milliseconds Played']?.trim() || '0', 10);
        const podcastName = row['Podcast Name']?.trim();
        const podcastEpisode = row['Podcast Episode Name']?.trim();

        // Song stats
        if (track && artist && duration && !podcastName) {
            totalSongs++;
            totalMilliseconds += duration;

            // Count occurrences of each song and artist
            songCounts[track] = (songCounts[track] || 0) + 1;
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        }

        // Podcast stats
        if (podcastName && podcastEpisode && duration) {
            totalPodcastMilliseconds += duration;

            // Count occurrences of each podcast
            podcastCounts[podcastName] = (podcastCounts[podcastName] || 0) + 1;
        }
    });

    // Helper function to get top 5 items
    function getTopFiveCounts(counts) {
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
            .slice(0, 5) // Get top 5 entries
            .map(([name, count]) => `${name} (${count} plays)`); // Format output
    }

    // Calculate top 5 songs and artists
    const topSongs = getTopFiveCounts(songCounts);
    const topArtists = getTopFiveCounts(artistCounts);

    // Determine most played podcast
    const mostPlayedPodcast = Object.keys(podcastCounts).reduce((a, b) => (podcastCounts[a] > podcastCounts[b] ? a : b), 'N/A');

    // Update stats on the webpage
    // Song stats
    document.getElementById('totalSongs').textContent = totalSongs;
    document.getElementById('totalMinutes').textContent = Math.round(totalMilliseconds / 60000); // Convert ms to minutes
    document.getElementById('topSongs').innerHTML = topSongs.map(song => `<li>${song}</li>`).join('');
    document.getElementById('topArtists').innerHTML = topArtists.map(artist => `<li>${artist}</li>`).join('');

    // Podcast stats
    document.getElementById('mostPlayedPodcast').textContent = mostPlayedPodcast;
    document.getElementById('totalPodcastMinutes').textContent = Math.round(totalPodcastMilliseconds / 60000); // Convert ms to minutes
}