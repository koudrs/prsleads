-- PRS Campaign Database Schema
-- Run with: psql -U postgres -d prs_campaign -f database/schema.sql

-- Create database (run separately if needed)
-- CREATE DATABASE prs_campaign;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (for development reset)
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(255),
  company_type VARCHAR(50),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'contacted')),
  email_sent BOOLEAN DEFAULT FALSE,
  card_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, event_id)
);

-- Indexes
CREATE INDEX idx_leads_event_id ON leads(event_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_company_type ON leads(company_type);
CREATE INDEX idx_events_is_active ON events(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed data
INSERT INTO events (name, description, date, location, is_active) VALUES
  ('PRS Tech Summit 2026', 'Conferencia de tecnología e innovación en logística', '2026-04-15', 'Ciudad de Panamá', TRUE),
  ('Workshop: Cloud Computing', 'Taller práctico de servicios en la nube', '2026-05-20', 'Virtual', TRUE),
  ('Expo Logística 2026', 'Feria de logística y cadena de suministro', '2026-06-10', 'Panama Convention Center', TRUE);

-- Verify
SELECT 'Events created: ' || COUNT(*)::text FROM events;
