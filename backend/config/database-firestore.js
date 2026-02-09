// Firestore database configuration
// Supports both local (Firebase Emulator) and production (Firebase Cloud)
// Two separate databases: one for local, one for production
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

let db = null;
let isInitialized = false;

// Initialize Firestore
const initDatabase = async () => {
  if (isInitialized) {
    return db;
  }

  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // Determine if we're using local emulator or production
      const useEmulator = process.env.FIREBASE_USE_EMULATOR === 'true' || 
                         (process.env.NODE_ENV !== 'production' && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      const localProjectId = process.env.FIREBASE_LOCAL_PROJECT_ID || 'bhishi-local';
      const productionProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

      if (useEmulator) {
        // Local development - use Firebase Emulator with local database
        console.log('[Firestore] Initializing with Firebase Emulator (local database)');
        
        admin.initializeApp({
          projectId: localProjectId,
        });

        // Connect to emulator
        process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
        console.log('[Firestore] Using LOCAL database via emulator at:', process.env.FIRESTORE_EMULATOR_HOST);
      } else {
        // Production - use Firebase Cloud with production database
        console.log('[Firestore] Initializing with Firebase Cloud (production database)');
        
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          // Service account from environment variable (JSON string)
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || productionProjectId,
          });
          console.log('[Firestore] Using PRODUCTION database:', serviceAccount.project_id || productionProjectId);
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          // Service account from file path
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: productionProjectId,
          });
          console.log('[Firestore] Using PRODUCTION database:', productionProjectId);
        } else {
          throw new Error('Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS for production');
        }
      }
    }

    db = admin.firestore();
    isInitialized = true;
    console.log('[Firestore] Database initialized successfully');

    // Create default admin user
    await createDefaultAdmin();

    return db;
  } catch (error) {
    console.error('[Firestore] Initialization error:', error);
    throw error;
  }
};

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const usersRef = db.collection('users');
    const adminDoc = await usersRef.where('username', '==', 'admin').limit(1).get();

    if (adminDoc.empty) {
      const adminPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await usersRef.add({
        username: 'admin',
        email: 'admin@bhishi.com',
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        is_active: true,
        password_changed: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Get Firestore instance
const getFirestore = () => {
  if (!db) {
    throw new Error('Firestore database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Helper functions for common Firestore operations
const dbHelpers = {
  // Get single document by ID
  getById: async (collection, id) => {
    const doc = await db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Get single document by field
  getByField: async (collection, field, value) => {
    const snapshot = await db.collection(collection)
      .where(field, '==', value)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  // Get all documents
  getAll: async (collection, conditions = [], orderBy = null, limit = null) => {
    let queryRef = db.collection(collection);
    
    // Apply where conditions
    conditions.forEach(condition => {
      queryRef = queryRef.where(condition.field, condition.operator, condition.value);
    });
    
    // Apply order by
    if (orderBy) {
      queryRef = queryRef.orderBy(orderBy.field, orderBy.direction || 'asc');
    }
    
    // Apply limit
    if (limit) {
      queryRef = queryRef.limit(limit);
    }
    
    const snapshot = await queryRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Create document
  create: async (collection, data) => {
    const docRef = await db.collection(collection).add({
      ...data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: docRef.id, ...data };
  },

  // Update document
  update: async (collection, id, data) => {
    await db.collection(collection).doc(id).update({
      ...data,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id, ...data };
  },

  // Update multiple documents by condition
  updateMany: async (collection, conditions, data) => {
    let queryRef = db.collection(collection);
    conditions.forEach(condition => {
      queryRef = queryRef.where(condition.field, condition.operator, condition.value);
    });
    
    const snapshot = await queryRef.get();
    if (snapshot.empty) return { updated: 0 };
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        ...data,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    return { updated: snapshot.size };
  },

  // Delete document
  delete: async (collection, id) => {
    await db.collection(collection).doc(id).delete();
    return { deleted: 1 };
  },

  // Delete multiple documents by condition
  deleteMany: async (collection, conditions) => {
    let queryRef = db.collection(collection);
    conditions.forEach(condition => {
      queryRef = queryRef.where(condition.field, condition.operator, condition.value);
    });
    
    const snapshot = await queryRef.get();
    if (snapshot.empty) return { deleted: 0 };
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return { deleted: snapshot.size };
  },

  // Check if document exists
  exists: async (collection, id) => {
    const doc = await db.collection(collection).doc(id).get();
    return doc.exists;
  },

  // Count documents
  count: async (collection, conditions = []) => {
    let queryRef = db.collection(collection);
    conditions.forEach(condition => {
      queryRef = queryRef.where(condition.field, condition.operator, condition.value);
    });
    const snapshot = await queryRef.get();
    return snapshot.size;
  },
};

// Export
module.exports = {
  initDatabase,
  getFirestore,
  getDb: getFirestore, // Alias for backward compatibility
  db: dbHelpers, // Helper functions
};
