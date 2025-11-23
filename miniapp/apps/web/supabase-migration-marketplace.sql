-- Create marketplace_listings table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS marketplace_listings (
  -- Primary key (matches smart contract listing ID)
  listing_id BIGINT PRIMARY KEY,
  
  -- Reference to dataset
  dataset_id BIGINT NOT NULL,
  
  -- Addresses
  curator_address TEXT NOT NULL,
  funder_address TEXT NOT NULL,
  
  -- Dataset details
  dataset_name TEXT,
  task_description TEXT,
  file_count INT NOT NULL DEFAULT 0,
  
  -- Filecoin storage
  filecoin_cid TEXT NOT NULL, -- JSON array: [{filename, file_cid, annotations_cid, file_type}]
  
  -- Pricing
  price NUMERIC(38, 6) NOT NULL,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Stats
  total_purchases INT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key
ALTER TABLE marketplace_listings
ADD CONSTRAINT fk_marketplace_dataset
FOREIGN KEY (dataset_id) REFERENCES datasets(dataset_id)
ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_active ON marketplace_listings(active);
CREATE INDEX IF NOT EXISTS idx_marketplace_curator ON marketplace_listings(curator_address);
CREATE INDEX IF NOT EXISTS idx_marketplace_dataset ON marketplace_listings(dataset_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_created ON marketplace_listings(created_at DESC);

-- Purchases tracking table
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  purchase_id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES marketplace_listings(listing_id) ON DELETE CASCADE,
  buyer_address TEXT NOT NULL,
  price_paid NUMERIC(38, 6) NOT NULL,
  tx_hash TEXT, -- Transaction hash for reference
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for buyer lookups
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON marketplace_purchases(buyer_address);
CREATE INDEX IF NOT EXISTS idx_purchases_listing ON marketplace_purchases(listing_id);

-- Add filecoin_cid column to datasets table (for tracking upload status)
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS filecoin_cid TEXT;

COMMENT ON COLUMN datasets.filecoin_cid IS 'JSON array of Filecoin CIDs (set after upload, before listing)';

