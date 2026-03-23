-- Cloudflare D1 Schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  chips INTEGER DEFAULT 10000,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT,
  pot INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting'
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
);

-- Seed Initial Admin
INSERT INTO admins (username, password) VALUES ('admin', 'qkralscjf');
