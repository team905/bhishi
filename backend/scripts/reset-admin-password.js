const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'bhishi.db');

async function resetAdminPassword() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });

  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  db.run(
    `UPDATE users SET password = ? WHERE username = 'admin'`,
    [hashedPassword],
    function(err) {
      if (err) {
        console.error('Error resetting password:', err);
        process.exit(1);
      }
      
      if (this.changes === 0) {
        // Admin doesn't exist, create it
        db.run(
          `INSERT INTO users (username, email, password, full_name, role, is_active) 
           VALUES ('admin', 'admin@bhishi.com', ?, 'System Administrator', 'admin', 1)`,
          [hashedPassword],
          (err) => {
            if (err) {
              console.error('Error creating admin:', err);
            } else {
              console.log('Admin user created with password: admin123');
            }
            db.close();
            process.exit(0);
          }
        );
      } else {
        console.log('Admin password reset successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
        db.close();
        process.exit(0);
      }
    }
  );
}

resetAdminPassword();

