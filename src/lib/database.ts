// Robust Database Service for Millions of Accounts
// Uses IndexedDB for client-side storage with fallback to localStorage

export interface DatabaseUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  passwordHash: string; // In production, this would be properly hashed
  role: 'buyer' | 'seller' | 'admin';
  tokens: number;
  isVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLogin?: string;
  wallet?: {
    address: string;
    privateKey: string;
    balances: {
      USD: number;
      DROP: number;
      ETH?: number;
    };
  };
}

export interface DatabaseSession {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

class DatabaseService {
  private dbName = 'DollarDropDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('phoneNumber', 'phoneNumber', { unique: true });
          userStore.createIndex('createdAt', 'createdAt');
        }

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('userId', 'userId');
          sessionStore.createIndex('token', 'token', { unique: true });
          sessionStore.createIndex('expiresAt', 'expiresAt');
        }

        // Wallet transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('userId', 'userId');
          transactionStore.createIndex('timestamp', 'timestamp');
          transactionStore.createIndex('type', 'type');
        }
      };
    });
  }

  // Create user account
  async createUser(userData: Omit<DatabaseUser, 'id' | 'createdAt'>): Promise<{ success: boolean; user?: DatabaseUser; error?: string }> {
    try {
      await this.init();
      
      // Check if email or username already exists
      const existingEmail = await this.getUserByEmail(userData.email);
      if (existingEmail) {
        return { success: false, error: 'Email already exists' };
      }

      const existingUsername = await this.getUserByUsername(userData.username);
      if (existingUsername) {
        return { success: false, error: 'Username already exists' };
      }

      const existingPhone = await this.getUserByPhone(userData.phoneNumber);
      if (existingPhone) {
        return { success: false, error: 'Phone number already exists' };
      }

      const newUser: DatabaseUser = {
        ...userData,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };

      if (this.db) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        await new Promise<void>((resolve, reject) => {
          const request = store.add(newUser);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } else {
        // Fallback to localStorage
        this.saveUserToLocalStorage(newUser);
      }

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('email');
        
        return new Promise((resolve, reject) => {
          const request = index.get(email);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      } else {
        // Fallback to localStorage
        return this.getUserFromLocalStorage('email', email);
      }
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<DatabaseUser | null> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('username');
        
        return new Promise((resolve, reject) => {
          const request = index.get(username);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getUserFromLocalStorage('username', username);
      }
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  // Get user by phone number
  async getUserByPhone(phoneNumber: string): Promise<DatabaseUser | null> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('phoneNumber');
        
        return new Promise((resolve, reject) => {
          const request = index.get(phoneNumber);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getUserFromLocalStorage('phoneNumber', phoneNumber);
      }
    } catch (error) {
      console.error('Error getting user by phone:', error);
      return null;
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<DatabaseUser | null> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getUserFromLocalStorage('id', id);
      }
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Update user
  async updateUser(userId: string, updates: Partial<DatabaseUser>): Promise<{ success: boolean; error?: string }> {
    try {
      await this.init();
      
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const updatedUser = { ...user, ...updates };

      if (this.db) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        await new Promise<void>((resolve, reject) => {
          const request = store.put(updatedUser);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } else {
        this.saveUserToLocalStorage(updatedUser);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  // Create session
  async createSession(userId: string): Promise<{ success: boolean; session?: DatabaseSession; error?: string }> {
    try {
      await this.init();
      
      const session: DatabaseSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        isActive: true
      };

      if (this.db) {
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        
        await new Promise<void>((resolve, reject) => {
          const request = store.add(session);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } else {
        // Fallback to localStorage
        localStorage.setItem('dollar_drop_token', session.token);
      }

      return { success: true, session };
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, error: 'Failed to create session' };
    }
  }

  // Get total user count (for analytics)
  async getUserCount(): Promise<number> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } else {
        // Fallback count from localStorage
        const users = this.getAllUsersFromLocalStorage();
        return users.length;
      }
    } catch (error) {
      console.error('Error getting user count:', error);
      return 0;
    }
  }

  // LocalStorage fallback methods
  private saveUserToLocalStorage(user: DatabaseUser): void {
    const users = this.getAllUsersFromLocalStorage();
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem('dollar_drop_users', JSON.stringify(users));
  }

  private getUserFromLocalStorage(field: keyof DatabaseUser, value: string): DatabaseUser | null {
    const users = this.getAllUsersFromLocalStorage();
    return users.find(user => user[field] === value) || null;
  }

  private getAllUsersFromLocalStorage(): DatabaseUser[] {
    try {
      const usersJson = localStorage.getItem('dollar_drop_users');
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (error) {
      console.error('Error parsing users from localStorage:', error);
      return [];
    }
  }

  // Simple password hashing (in production, use proper bcrypt or similar)
  hashPassword(password: string): string {
    // This is a simple hash for demo purposes
    // In production, use proper password hashing like bcrypt
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Verify password
  verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
}

// Export singleton instance
export const database = new DatabaseService();
