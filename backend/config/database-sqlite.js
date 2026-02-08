// SQLite database configuration (for local development only)
// This file is ONLY loaded when DATABASE_URL is NOT set

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'bhishi.db');
let db = null;

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        return reject(err);
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      password_changed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bhishi_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      contribution_amount REAL NOT NULL,
      total_members INTEGER NOT NULL,
      cycle_duration_days INTEGER DEFAULT 30,
      current_cycle INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      max_bid_reduction_percentage REAL DEFAULT 40,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bhishi_groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(group_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS bidding_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      cycle_number INTEGER NOT NULL,
      bidding_start_date DATETIME NOT NULL,
      bidding_end_date DATETIME NOT NULL,
      total_pool_amount REAL NOT NULL,
      status TEXT DEFAULT 'open',
      winner_user_id INTEGER,
      winning_bid_amount REAL,
      is_random_winner INTEGER DEFAULT 0,
      payout_date DATETIME,
      admin_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bhishi_groups(id),
      FOREIGN KEY (winner_user_id) REFERENCES users(id),
      UNIQUE(group_id, cycle_number)
    )`,
    `CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      bid_amount REAL NOT NULL,
      bid_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(cycle_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payable_amount REAL,
      payment_status TEXT DEFAULT 'pending',
      payment_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(cycle_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS agreements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      signature_data TEXT NOT NULL,
      signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(cycle_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS video_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      video_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      verified_by INTEGER,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (verified_by) REFERENCES users(id),
      UNIQUE(cycle_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      dispute_text TEXT NOT NULL,
      admin_response TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cycle_id INTEGER,
      title TEXT,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id)
    )`,
    `CREATE TABLE IF NOT EXISTS profit_distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      profit_amount REAL NOT NULL,
      distribution_status TEXT DEFAULT 'pending',
      distributed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(cycle_id, user_id)
    )`
  ];

  for (const query of queries) {
    await new Promise((resolve, reject) => {
      db.run(query, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }

  // Add columns if they don't exist
  const alterQueries = [
    `ALTER TABLE bidding_cycles ADD COLUMN is_random_winner INTEGER DEFAULT 0`,
    `ALTER TABLE bhishi_groups ADD COLUMN max_bid_reduction_percentage REAL DEFAULT 40`,
    `ALTER TABLE contributions ADD COLUMN payable_amount REAL`,
    `ALTER TABLE users ADD COLUMN password_changed INTEGER DEFAULT 0`,
    `ALTER TABLE notifications ADD COLUMN title TEXT`
  ];

  for (const query of alterQueries) {
    await new Promise((resolve) => {
      db.run(query, (err) => {
        // Ignore error if column already exists
        resolve();
      });
    });
  }

  await createDefaultAdmin();
};

const createDefaultAdmin = async () => {
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE username = ?', [adminUsername], (err, row) => {
      if (err) return reject(err);
      if (row) return resolve();

      db.run(
        'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [adminUsername, 'admin@bhishi.com', hashedPassword, 'System Administrator', 'admin'],
        (err) => {
          if (err) return reject(err);
          console.log('Default admin user created (username: admin, password: admin123)');
          resolve();
        }
      );
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

module.exports = {
  initDatabase,
  getDb
};

