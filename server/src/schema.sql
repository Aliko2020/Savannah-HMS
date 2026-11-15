-- Times are stored as local shop time, 'YYYY-MM-DDTHH:MM:SS'.
-- Money is stored as a number with 2 decimals.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'attendant')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS products (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL DEFAULT 'General',
  barcode               TEXT UNIQUE,
  cost_price            REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  selling_price         REAL NOT NULL CHECK (selling_price >= 0),
  quantity              INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level         INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  expiry_date           TEXT,
  requires_prescription INTEGER NOT NULL DEFAULT 0,
  active                INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  total          REAL NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile')),
  customer_name  TEXT,
  voided_at      TEXT,
  voided_by      INTEGER REFERENCES users(id),
  void_reason    TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON sales (created_at);

CREATE TABLE IF NOT EXISTS sale_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   REAL NOT NULL,
  cost_price   REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS sale_items_sale_idx ON sale_items (sale_id);

-- Every change to stock is logged here so the owner can audit it.
CREATE TABLE IF NOT EXISTS stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id    INTEGER REFERENCES users(id),
  change     INTEGER NOT NULL,
  reason     TEXT NOT NULL CHECK (reason IN ('initial', 'restock', 'sale', 'void', 'adjustment', 'expired', 'damaged')),
  note       TEXT,
  sale_id    INTEGER REFERENCES sales(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements (product_id, created_at);
