PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wine_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT,
  producer TEXT,
  wine_name TEXT NOT NULL,
  country TEXT,
  region TEXT,
  appellation TEXT,
  classification TEXT,
  colour TEXT,
  grape_varieties TEXT,
  label_fingerprint TEXT,
  source TEXT,
  confidence TEXT,
  verified_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wine_products_barcode ON wine_products(barcode);
CREATE INDEX IF NOT EXISTS idx_wine_products_name ON wine_products(wine_name, producer);

CREATE TABLE IF NOT EXISTS wine_vintages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wine_product_id INTEGER NOT NULL,
  vintage INTEGER NOT NULL,
  drink_from_year INTEGER,
  peak_from_year INTEGER,
  peak_to_year INTEGER,
  drink_by_year INTEGER,
  confidence TEXT,
  source_type TEXT,
  rationale TEXT,
  verified_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(wine_product_id, vintage),
  FOREIGN KEY (wine_product_id) REFERENCES wine_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wine_vintages_product ON wine_vintages(wine_product_id, vintage);
