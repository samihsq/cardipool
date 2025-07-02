-- users table (optional)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

-- carpools table
CREATE TABLE IF NOT EXISTS carpools (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT[],
  contact TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
); 