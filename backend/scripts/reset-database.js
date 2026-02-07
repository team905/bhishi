const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'bhishi.db');

async function resetDatabase() {
  return new Promise((resolve, reject) => {
    // Check if database file exists
    if (fs.existsSync(DB_PATH)) {
      // Open database
      const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          return reject(err);
        }
        console.log('Database opened successfully');
      });

      // Get admin user info before deletion
      db.get('SELECT id, username, email, password FROM users WHERE role = ?', ['admin'], (err, admin) => {
        if (err) {
          console.error('Error fetching admin user:', err);
          db.close();
          return reject(err);
        }

        if (!admin) {
          console.log('No admin user found. Will create default admin.');
        }

        // Delete all data from tables (in correct order to respect foreign keys)
        const deleteQueries = [
          'DELETE FROM profit_distributions',
          'DELETE FROM video_verifications',
          'DELETE FROM agreements',
          'DELETE FROM notifications',
          'DELETE FROM disputes',
          'DELETE FROM contributions',
          'DELETE FROM bids',
          'DELETE FROM bidding_cycles',
          'DELETE FROM group_members',
          'DELETE FROM bhishi_groups',
          'DELETE FROM users WHERE role != "admin"'
        ];

        let completed = 0;
        const total = deleteQueries.length;

        deleteQueries.forEach((query, index) => {
          db.run(query, (err) => {
            if (err) {
              console.error(`Error executing: ${query}`, err);
            } else {
              completed++;
              if (completed === total) {
                console.log('All data deleted successfully');
                
                // If admin exists, keep it; otherwise create default admin
                if (admin) {
                  console.log('Admin user preserved:', admin.username);
                  db.close((err) => {
                    if (err) {
                      console.error('Error closing database:', err);
                      return reject(err);
                    }
                    console.log('Database reset complete!');
                    resolve();
                  });
                } else {
                  // Create default admin
                  const adminUsername = 'admin';
                  const adminPassword = 'admin123';
                  
                  bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
                    if (err) {
                      console.error('Error hashing password:', err);
                      db.close();
                      return reject(err);
                    }

                    db.run(
                      'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
                      [adminUsername, 'admin@bhishi.com', hashedPassword, 'System Administrator', 'admin'],
                      (err) => {
                        if (err) {
                          console.error('Error creating admin user:', err);
                          db.close();
                          return reject(err);
                        }
                        console.log('Default admin user created (username: admin, password: admin123)');
                        db.close((err) => {
                          if (err) {
                            console.error('Error closing database:', err);
                            return reject(err);
                          }
                          console.log('Database reset complete!');
                          resolve();
                        });
                      }
                    );
                  });
                }
              }
            }
          });
        });
      });
    } else {
      console.log('Database file does not exist. Nothing to reset.');
      resolve();
    }
  });
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log('Database reset completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database reset failed:', err);
    process.exit(1);
  });

