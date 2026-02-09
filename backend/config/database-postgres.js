// PostgreSQL database configuration
// This will be used in production when DATABASE_URL is set
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;

const initPostgresDatabase = async () => {
  // Support Railway (DATABASE_URL) and other platforms (POSTGRES_URL)
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    throw new Error('POSTGRES_URL or DATABASE_URL environment variable is required for PostgreSQL');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  try {
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err);
    throw err;
  }

  await createTables();
  await createDefaultAdmin();
  
  return pool;
};

const createTables = async () => {
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      password_changed INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Bhishi groups table
    `CREATE TABLE IF NOT EXISTS bhishi_groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      contribution_amount REAL NOT NULL,
      total_members INTEGER NOT NULL,
      cycle_duration_days INTEGER DEFAULT 30,
      current_cycle INTEGER DEFAULT 1,
      status VARCHAR(50) DEFAULT 'active',
      max_bid_reduction_percentage REAL DEFAULT 40,
      created_by INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // Group members table
    `CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bhishi_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id)
    )`,

    // Bidding cycles table
    `CREATE TABLE IF NOT EXISTS bidding_cycles (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL,
      cycle_number INTEGER NOT NULL,
      bidding_start_date TIMESTAMP NOT NULL,
      bidding_end_date TIMESTAMP NOT NULL,
      total_pool_amount REAL NOT NULL,
      status VARCHAR(50) DEFAULT 'open',
      winner_user_id INTEGER,
      winning_bid_amount REAL,
      is_random_winner INTEGER DEFAULT 0,
      payout_date TIMESTAMP,
      admin_approved INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bhishi_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (winner_user_id) REFERENCES users(id),
      UNIQUE(group_id, cycle_number)
    )`,

    // Bids table
    `CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      bid_amount REAL NOT NULL,
      bid_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(cycle_id, user_id)
    )`,

    // Contributions table
    `CREATE TABLE IF NOT EXISTS contributions (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payable_amount REAL,
      payment_status VARCHAR(50) DEFAULT 'pending',
      payment_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(cycle_id, user_id)
    )`,

    // Profit distributions table
    `CREATE TABLE IF NOT EXISTS profit_distributions (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      profit_amount REAL NOT NULL,
      distribution_status VARCHAR(50) DEFAULT 'distributed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Disputes table
    `CREATE TABLE IF NOT EXISTS disputes (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'open',
      resolution TEXT,
      resolved_by INTEGER,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    )`,

    // Agreements table
    `CREATE TABLE IF NOT EXISTS agreements (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      signature_data TEXT,
      signed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(cycle_id, user_id)
    )`,

    // Verifications table
    `CREATE TABLE IF NOT EXISTS verifications (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      video_url TEXT,
      verification_status VARCHAR(50) DEFAULT 'pending',
      admin_notes TEXT,
      verified_by INTEGER,
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (verified_by) REFERENCES users(id),
      UNIQUE(cycle_id, user_id)
    )`,

    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      cycle_id INTEGER,
      title VARCHAR(255),
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (cycle_id) REFERENCES bidding_cycles(id) ON DELETE CASCADE
    )`,

    // Create indexes for better performance
    `CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bidding_cycles_group_id ON bidding_cycles(group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bidding_cycles_status ON bidding_cycles(status)`,
    `CREATE INDEX IF NOT EXISTS idx_bids_cycle_id ON bids(cycle_id)`,
    `CREATE INDEX IF NOT EXISTS idx_contributions_cycle_id ON contributions(cycle_id)`,
    `CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON contributions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`,
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (err) {
      console.error('Error creating table:', err.message);
      // Continue with other tables even if one fails
    }
  }

  console.log('PostgreSQL tables created/verified');
};

const createDefaultAdmin = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
    const adminCount = parseInt(result.rows[0].count);

    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (username, email, password, full_name, role, password_changed) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin', 'admin@bhishi.com', hashedPassword, 'System Administrator', 'admin', 0]
      );
      console.log('Default admin user created (username: admin, password: admin123)');
    }
  } catch (err) {
    console.error('Error creating default admin:', err);
  }
};

// Convert PostgreSQL parameterized queries ($1, $2) to SQLite style (?)
const convertQuery = (query, params = []) => {
  let paramIndex = 1;
  const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
  return { query: convertedQuery, params };
};

// Wrapper to match SQLite callback-based API
const getDb = () => {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  
  return {
    // Get single row (callback style)
    get: (query, params, callback) => {
      const { query: convertedQuery, params: convertedParams } = convertQuery(query, params);
      pool.query(convertedQuery, convertedParams)
        .then(result => {
          callback(null, result.rows[0] || null);
        })
        .catch(err => {
          callback(err, null);
        });
    },
    
    // Get all rows (callback style)
    all: (query, params, callback) => {
      const { query: convertedQuery, params: convertedParams } = convertQuery(query, params);
      pool.query(convertedQuery, convertedParams)
        .then(result => {
          callback(null, result.rows);
        })
        .catch(err => {
          callback(err, null);
        });
    },
    
    // Run query (callback style) - for INSERT/UPDATE/DELETE
    // SQLite's run can be called with: run(query, params, callback) or run(query, callback)
    run: function(query, paramsOrCallback, callback) {
      let params, cb;
      
      // Handle different call signatures
      if (typeof paramsOrCallback === 'function') {
        params = [];
        cb = paramsOrCallback;
      } else {
        params = paramsOrCallback || [];
        cb = callback;
      }
      
      const { query: convertedQuery, params: convertedParams } = convertQuery(query, params);
      
      return pool.query(convertedQuery, convertedParams)
        .then(result => {
          const lastID = result.rows[0]?.id || null;
          const changes = result.rowCount || 0;
          
          // Create result object that will be used as 'this' in callback
          const resultObj = {
            lastID,
            changes
          };
          
          if (cb) {
            // Call callback with 'this' bound to resultObj (SQLite style)
            cb.call(resultObj, null);
          }
          
          return resultObj;
        })
        .catch(err => {
          if (cb) {
            cb.call({ lastID: null, changes: 0 }, err);
          } else {
            throw err;
          }
        });
    },
    
    // Prepare statement (returns a prepared statement object)
    prepare: (query) => {
      const { query: convertedQuery } = convertQuery(query);
      const statements = [];
      
      return {
        run: (params, callback) => {
          const { params: convertedParams } = convertQuery(query, params);
          pool.query(convertedQuery, convertedParams)
            .then(result => {
              const lastID = result.rows[0]?.id || null;
              const changes = result.rowCount || 0;
              if (callback) {
                callback(null, { lastID, changes });
              }
            })
            .catch(err => {
              if (callback) {
                callback(err, null);
              }
            });
        },
        finalize: (callback) => {
          // No-op for PostgreSQL, but call callback if provided
          if (callback) {
            callback(null);
          }
        }
      };
    }
  };
};

module.exports = {
  initDatabase: initPostgresDatabase,
  getDb,
  pool
};

