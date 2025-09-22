import Database from 'better-sqlite3';
import { join } from 'path';

// Force SQLite for Replit deployment
const dbPath = join(process.cwd(), 'dha_database.sqlite');

let db: Database.Database;

try {
  db = new Database(dbPath);

  // Create essential tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'USER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      user_id INTEGER,
      status TEXT DEFAULT 'GENERATED',
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      user_id INTEGER,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default users if not exists
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
  if (!adminExists.count) {
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role) 
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin@dha.gov.za', 'admin123', 'ULTRA_ADMIN');

    db.prepare(`
      INSERT INTO users (username, email, password_hash, role) 
      VALUES (?, ?, ?, ?)
    `).run('user', 'user@dha.gov.za', 'password123', 'USER');
  }

  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  // Create minimal in-memory fallback
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, role TEXT);
    INSERT INTO users (username, role) VALUES ('admin', 'ULTRA_ADMIN');
  `);
}

export { db };
export default db;