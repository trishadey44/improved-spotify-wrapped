import sqlite3 from 'sqlite3';

// Open a database in memory (use ':memory:' for an in-memory database or provide a path for a persistent one)
const db = new sqlite3.Database('./genres.db'); // You can change the path if necessary

// Initialize the database
db.serialize(() => {
    // Create the genres table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS genres (
        artist TEXT PRIMARY KEY,
        genres TEXT
    )`);
});

// Function to store genres in the database
export function storeGenresInDB(artist, genres) {
    const genresString = JSON.stringify(genres); // Store genres as a stringified JSON array
    const stmt = db.prepare("INSERT OR REPLACE INTO genres (artist, genres) VALUES (?, ?)");
    stmt.run(artist, genresString);
    stmt.finalize();
}

// Function to get genres from the database
export function getGenresFromDB(artist, callback) {
    db.get("SELECT genres FROM genres WHERE artist = ?", [artist], (err, row) => {
        if (err) {
            console.error('Error fetching genres from DB:', err);
            callback(null);
        } else {
            callback(row ? JSON.parse(row.genres) : null);
        }
    });
}
