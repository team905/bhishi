// SQLite database configuration (for local development only)
// This file is NOT used when DATABASE_URL or POSTGRES_URL is set
// On Vercel, database-postgres.js is used instead

const bcrypt = require('bcryptjs');
const path = require('path');

// Only load sqlite3 if we're actually using SQLite (not on Vercel/PostgreSQL)
// Check environment FIRST before requiring sqlite3
const databaseUrlCheck = process.env.POSTGRES_URL || process.env.DATABASE_URL;

let sqlite3 = null;
if (!databaseUrlCheck && !process.env.VERCEL) {
  // Only load sqlite3 for local development
  try {
    sqlite3 = require('sqlite3').verbose();
  } catch (err) {
    console.error('Failed to load sqlite3. This is expected on Vercel when using PostgreSQL.');
    // Don't throw - let the export logic handle it
  }
}

const DB_PATH = path.join(__dirname, '..', 'data', 'bhishi.db');

let db = null;

const initDatabase = async () => {
  if (!sqlite3) {
    throw new Error('SQLite3 not available. This function should only be called in local development.');
  }
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
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      password_changed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Bhishi groups table
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

    // Group members table
    `CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bhishi_groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(group_id, user_id)
    )`,

    // Bidding cycles table
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

    // Bids table
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

    // Contributions table
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

    // Agreements table
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

    // Video verifications table
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

    // Disputes table
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

    // Notifications table
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

    // Profit distributions table
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

  // Add is_random_winner column if it doesn't exist (for existing databases)
  await new Promise((resolve, reject) => {
    db.run(`
      ALTER TABLE bidding_cycles 
      ADD COLUMN is_random_winner INTEGER DEFAULT 0
    `, (err) => {
      // Ignore error if column already exists
      resolve();
    });
  });

  // Add max_bid_reduction_percentage to bhishi_groups if it doesn't exist
  await new Promise((resolve, reject) => {
    db.run(`
      ALTER TABLE bhishi_groups 
      ADD COLUMN max_bid_reduction_percentage REAL DEFAULT 40
    `, (err) => {
      // Ignore error if column already exists
      resolve();
    });
  });

  // Add payable_amount to contributions if it doesn't exist
  await new Promise((resolve, reject) => {
    db.run(`
      ALTER TABLE contributions 
      ADD COLUMN payable_amount REAL
    `, (err) => {
      // Ignore error if column already exists
      resolve();
    });
  });

  // Add password_changed to users if it doesn't exist
  await new Promise((resolve, reject) => {
    db.run(`
      ALTER TABLE users 
      ADD COLUMN password_changed INTEGER DEFAULT 0
    `, (err) => {
      // Ignore error if column already exists
      resolve();
    });
  });

  // Add title to notifications if it doesn't exist
  await new Promise((resolve, reject) => {
    db.run(`
      ALTER TABLE notifications 
      ADD COLUMN title TEXT
    `, (err) => {
      // Ignore error if column already exists
      resolve();
    });
  });

  // Create default admin user if not exists
  await createDefaultAdmin();
};

const createDefaultAdmin = async () => {
  const adminUsername = 'admin';
  const adminPassword = 'admin123'; // Should be changed in production
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

// Export logic - route to PostgreSQL if DATABASE_URL is set
// Check environment FIRST before exporting
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (databaseUrl || process.env.VERCEL) {
  // Use PostgreSQL in production (Vercel or other platforms)
  console.log('[database.js] Routing to PostgreSQL (database-postgres.js)');
  module.exports = require('./database-postgres');
} else {
  // Use SQLite in local development only
  console.log('[database.js] Using SQLite for local development');
  module.exports = {
    initDatabase,
    getDb
  };
}
