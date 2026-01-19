-- Search Performance Indexes for Booking System
-- These indexes optimize full-text search queries on venue, district, and facility type names
--
-- Usage: Connect to your PostgreSQL database and run:
--   psql -U your_user -d your_database -f prisma/create-search-indexes.sql
--
-- Or run within psql:
--   \i prisma/create-search-indexes.sql

-- Enable pg_trgm extension for substring matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on venue names (all languages)
-- Supports: venue name searches in English, Traditional Chinese, Simplified Chinese
-- Using GIN + gin_trgm_ops for efficient ILIKE '%query%' searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facility_name_search
ON "Facility" USING GIN (
  lower("name") gin_trgm_ops,
  lower("nameEn") gin_trgm_ops,
  lower("nameTc") gin_trgm_ops,
  lower("nameSc") gin_trgm_ops
);

-- Index on district names (denormalized in Facility table)
-- Supports: district name searches in all languages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facility_district_search
ON "Facility" USING GIN (
  lower("districtName") gin_trgm_ops,
  lower("districtNameEn") gin_trgm_ops,
  lower("districtNameTc") gin_trgm_ops,
  lower("districtNameSc") gin_trgm_ops
);

-- Index on facility type names in Session table
-- Supports: facility type searches in all languages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_facility_type_search
ON "Session" USING GIN (
  lower("facilityTypeName") gin_trgm_ops,
  lower("facilityTypeNameEn") gin_trgm_ops,
  lower("facilityTypeNameTc") gin_trgm_ops,
  lower("facilityTypeNameSc") gin_trgm_ops
);

-- Verify indexes created successfully
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%_search'
ORDER BY indexname;
