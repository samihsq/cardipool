-- users table for Stanford SSO authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  sunet_id TEXT UNIQUE NOT NULL,  -- Stanford SUNet ID (unique identifier)
  email TEXT UNIQUE,              -- User's email address
  first_name TEXT,                -- User's first name
  last_name TEXT,                 -- User's last name
  display_name TEXT,              -- User's display name
  affiliation TEXT,               -- User's Stanford affiliation (student, staff, faculty, etc.)
  department TEXT,                -- User's department
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- predefined tags for carpools
CREATE TABLE IF NOT EXISTS carpool_tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#8C1515',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tags
INSERT INTO carpool_tags (name, color) VALUES
  ('Airport', '#8C1515'),
  ('SFO', '#2E8B57'),
  ('SJC', '#4169E1'),
  ('OAK', '#DAA520'),
  ('Uber/Lyft', '#000000'),
  ('UberXL/LyftXL', '#545454'),
  ('Shopping', '#9932CC'),
  ('Costco', '#FF6347'),
  ('Target', '#32CD32'),
  ('Weekend', '#FF1493'),
  ('Morning', '#FFD700'),
  ('Afternoon', '#FF8C00'),
  ('Evening', '#9370DB'),
  ('Regular', '#20B2AA'),
  ('One-time', '#DC143C')
ON CONFLICT (name) DO NOTHING;

-- Enum type for carpool type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'carpool_type_enum') THEN
        CREATE TYPE carpool_type_enum AS ENUM ('airport', 'event', 'commute', 'recurring', 'other');
    END IF;
END$$;


-- carpools table (updated with new fields)
CREATE TABLE IF NOT EXISTS carpools (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  carpool_type carpool_type_enum DEFAULT 'other',
  event_name TEXT,
  pickup_details TEXT,
  dropoff_details TEXT,
  email VARCHAR(255),
  phone VARCHAR(255),
  departure_date DATE,
  departure_time TIME,
  return_date DATE,
  return_time TIME,
  capacity INTEGER DEFAULT 4,
  current_passengers INTEGER DEFAULT 1,
  tags INTEGER[] DEFAULT '{}',  -- Array of tag IDs
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- join requests table
CREATE TABLE IF NOT EXISTS join_requests (
  id SERIAL PRIMARY KEY,
  carpool_id INTEGER REFERENCES carpools(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(carpool_id, user_id)
);

-- sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE; 