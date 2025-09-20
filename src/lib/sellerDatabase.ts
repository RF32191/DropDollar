// Seller Database Service - Amazon/Etsy Style Seller Management
// Handles millions of seller accounts with approval workflow

export interface SellerApplication {
  id: string;
  userId: string; // Link to existing user account
  applicationDate: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  reviewedBy?: string; // Admin user ID
  reviewedAt?: string;
  reviewNotes?: string;
  
  // Business Information
  businessName: string;
  businessType: 'individual' | 'sole_proprietorship' | 'partnership' | 'llc' | 'corporation' | 'nonprofit';
  businessDescription: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessPhone: string;
  businessEmail: string;
  website?: string;
  
  // Tax Information
  taxId: string; // SSN or EIN
  taxIdType: 'ssn' | 'ein';
  
  // Banking Information
  bankAccount: {
    accountHolderName: string;
    bankName: string;
    accountType: 'checking' | 'savings';
    routingNumber: string;
    accountNumber: string; // Encrypted in production
  };
  
  // Product Information
  productCategories: string[];
  estimatedMonthlyVolume: string;
  productSources: string[];
  hasInventory: boolean;
  
  // Legal & Compliance
  hasBusinessLicense: boolean;
  businessLicenseNumber?: string;
  hasInsurance: boolean;
  insuranceProvider?: string;
  agreeToTerms: boolean;
  agreeToFees: boolean;
  
  // Verification Documents
  documents: {
    id: string;
    type: 'id_verification' | 'business_license' | 'tax_document' | 'bank_statement' | 'insurance_certificate';
    fileName: string;
    uploadedAt: string;
    verified: boolean;
  }[];
  
  // Performance Metrics (after approval)
  metrics?: {
    totalSales: number;
    totalOrders: number;
    averageRating: number;
    totalReviews: number;
    onTimeShipmentRate: number;
    returnRate: number;
    customerSatisfactionScore: number;
  };
}

export interface SellerProfile {
  id: string;
  userId: string;
  applicationId: string;
  status: 'active' | 'suspended' | 'deactivated';
  approvedAt: string;
  
  // Public Profile Information
  storeName: string;
  storeDescription: string;
  logo?: string;
  banner?: string;
  
  // Business Details
  businessName: string;
  businessType: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  
  // Seller Metrics
  metrics: {
    memberSince: string;
    totalSales: number;
    totalOrders: number;
    averageRating: number;
    totalReviews: number;
    responseTime: string; // e.g., "Usually responds within 24 hours"
    onTimeShipmentRate: number;
    returnRate: number;
    customerSatisfactionScore: number;
  };
  
  // Seller Settings
  settings: {
    autoAcceptOrders: boolean;
    processingTime: string; // e.g., "1-2 business days"
    shippingProfiles: string[];
    returnPolicy: string;
    customMessage?: string;
    vacationMode: boolean;
    vacationMessage?: string;
  };
  
  // Financial Information
  financial: {
    totalEarnings: number;
    pendingPayouts: number;
    lastPayoutDate?: string;
    payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
    feeStructure: {
      listingFee: number;
      transactionFee: number;
      paymentProcessingFee: number;
    };
  };
}

export interface AdminReview {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  action: 'approve' | 'reject' | 'request_more_info';
  notes: string;
  timestamp: string;
  documentsReviewed: string[];
  riskScore?: number; // 1-100, higher = more risk
}

class SellerDatabaseService {
  private dbName = 'DollarDropSellerDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB for seller data
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

        // Seller Applications store
        if (!db.objectStoreNames.contains('applications')) {
          const appStore = db.createObjectStore('applications', { keyPath: 'id' });
          appStore.createIndex('userId', 'userId');
          appStore.createIndex('status', 'status');
          appStore.createIndex('applicationDate', 'applicationDate');
          appStore.createIndex('businessName', 'businessName');
          appStore.createIndex('businessType', 'businessType');
        }

        // Seller Profiles store
        if (!db.objectStoreNames.contains('profiles')) {
          const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
          profileStore.createIndex('userId', 'userId');
          profileStore.createIndex('applicationId', 'applicationId');
          profileStore.createIndex('status', 'status');
          profileStore.createIndex('storeName', 'storeName');
          profileStore.createIndex('approvedAt', 'approvedAt');
        }

        // Admin Reviews store
        if (!db.objectStoreNames.contains('reviews')) {
          const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' });
          reviewStore.createIndex('applicationId', 'applicationId');
          reviewStore.createIndex('reviewerId', 'reviewerId');
          reviewStore.createIndex('timestamp', 'timestamp');
          reviewStore.createIndex('action', 'action');
        }

        // Seller Analytics store
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id' });
          analyticsStore.createIndex('sellerId', 'sellerId');
          analyticsStore.createIndex('date', 'date');
          analyticsStore.createIndex('metric', 'metric');
        }
      };
    });
  }

  // Submit seller application
  async submitApplication(userId: string, applicationData: Omit<SellerApplication, 'id' | 'userId' | 'applicationDate' | 'status'>): Promise<{ success: boolean; applicationId?: string; error?: string }> {
    try {
      await this.init();

      // Check if user already has a pending or approved application
      const existingApp = await this.getApplicationByUserId(userId);
      if (existingApp && ['pending', 'under_review', 'approved'].includes(existingApp.status)) {
        return { success: false, error: 'You already have an active seller application' };
      }

      const application: SellerApplication = {
        id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        applicationDate: new Date().toISOString(),
        status: 'approved', // Auto-approve for testing
        reviewedBy: 'system',
        reviewedAt: new Date().toISOString(),
        reviewNotes: 'Auto-approved for testing purposes',
        ...applicationData
      };

      if (this.db) {
        const transaction = this.db.transaction(['applications'], 'readwrite');
        const store = transaction.objectStore('applications');
        
        await new Promise<void>((resolve, reject) => {
          const request = store.add(application);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } else {
        // Fallback to localStorage
        this.saveApplicationToLocalStorage(application);
      }

      // Auto-create seller profile for testing
      await this.createSellerProfile(application);

      return { success: true, applicationId: application.id };
    } catch (error) {
      console.error('Error submitting application:', error);
      return { success: false, error: 'Failed to submit application' };
    }
  }

  // Get application by user ID
  async getApplicationByUserId(userId: string): Promise<SellerApplication | null> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['applications'], 'readonly');
        const store = transaction.objectStore('applications');
        const index = store.index('userId');
        
        return new Promise((resolve, reject) => {
          const request = index.get(userId);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getApplicationFromLocalStorage('userId', userId);
      }
    } catch (error) {
      console.error('Error getting application:', error);
      return null;
    }
  }

  // Get applications by status (for admin review)
  async getApplicationsByStatus(status: SellerApplication['status']): Promise<SellerApplication[]> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['applications'], 'readonly');
        const store = transaction.objectStore('applications');
        const index = store.index('status');
        
        return new Promise((resolve, reject) => {
          const request = index.getAll(status);
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getApplicationsFromLocalStorage().filter(app => app.status === status);
      }
    } catch (error) {
      console.error('Error getting applications by status:', error);
      return [];
    }
  }

  // Review application (admin function)
  async reviewApplication(applicationId: string, reviewData: {
    action: 'approve' | 'reject' | 'request_more_info';
    reviewerId: string;
    reviewerName: string;
    notes: string;
    documentsReviewed: string[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await this.init();

      // Get the application
      const application = await this.getApplicationById(applicationId);
      if (!application) {
        return { success: false, error: 'Application not found' };
      }

      // Create review record
      const review: AdminReview = {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        applicationId,
        reviewerId: reviewData.reviewerId,
        reviewerName: reviewData.reviewerName,
        action: reviewData.action,
        notes: reviewData.notes,
        timestamp: new Date().toISOString(),
        documentsReviewed: reviewData.documentsReviewed
      };

      // Update application status
      const updatedApplication: SellerApplication = {
        ...application,
        status: reviewData.action === 'approve' ? 'approved' : 
                reviewData.action === 'reject' ? 'rejected' : 'under_review',
        reviewedBy: reviewData.reviewerId,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reviewData.notes
      };

      if (this.db) {
        const transaction = this.db.transaction(['applications', 'reviews'], 'readwrite');
        
        // Update application
        const appStore = transaction.objectStore('applications');
        await new Promise<void>((resolve, reject) => {
          const request = appStore.put(updatedApplication);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // Add review
        const reviewStore = transaction.objectStore('reviews');
        await new Promise<void>((resolve, reject) => {
          const request = reviewStore.add(review);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // If approved, create seller profile
        if (reviewData.action === 'approve') {
          await this.createSellerProfile(updatedApplication);
        }
      } else {
        // Fallback to localStorage
        this.saveApplicationToLocalStorage(updatedApplication);
        this.saveReviewToLocalStorage(review);
        
        if (reviewData.action === 'approve') {
          await this.createSellerProfile(updatedApplication);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error reviewing application:', error);
      return { success: false, error: 'Failed to review application' };
    }
  }

  // Create seller profile after approval
  private async createSellerProfile(application: SellerApplication): Promise<void> {
    const profile: SellerProfile = {
      id: `seller_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: application.userId,
      applicationId: application.id,
      status: 'active',
      approvedAt: new Date().toISOString(),
      
      storeName: application.businessName,
      storeDescription: application.businessDescription,
      businessName: application.businessName,
      businessType: application.businessType,
      location: {
        city: application.businessAddress.city,
        state: application.businessAddress.state,
        country: application.businessAddress.country
      },
      
      metrics: {
        memberSince: new Date().toISOString(),
        totalSales: 0,
        totalOrders: 0,
        averageRating: 0,
        totalReviews: 0,
        responseTime: "Usually responds within 24 hours",
        onTimeShipmentRate: 100,
        returnRate: 0,
        customerSatisfactionScore: 0
      },
      
      settings: {
        autoAcceptOrders: false,
        processingTime: "1-2 business days",
        shippingProfiles: [],
        returnPolicy: "30-day return policy",
        vacationMode: false
      },
      
      financial: {
        totalEarnings: 0,
        pendingPayouts: 0,
        payoutSchedule: 'weekly',
        feeStructure: {
          listingFee: 0.50,
          transactionFee: 0.12, // 12%
          paymentProcessingFee: 0.029 // 2.9%
        }
      }
    };

    if (this.db) {
      const transaction = this.db.transaction(['profiles'], 'readwrite');
      const store = transaction.objectStore('profiles');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(profile);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      this.saveProfileToLocalStorage(profile);
    }
  }

  // Get application by ID
  async getApplicationById(id: string): Promise<SellerApplication | null> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['applications'], 'readonly');
        const store = transaction.objectStore('applications');
        
        return new Promise((resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getApplicationFromLocalStorage('id', id);
      }
    } catch (error) {
      console.error('Error getting application by ID:', error);
      return null;
    }
  }

  // Get seller profile by user ID
  async getSellerProfileByUserId(userId: string): Promise<SellerProfile | null> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['profiles'], 'readonly');
        const store = transaction.objectStore('profiles');
        const index = store.index('userId');
        
        return new Promise((resolve, reject) => {
          const request = index.get(userId);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getProfileFromLocalStorage('userId', userId);
      }
    } catch (error) {
      console.error('Error getting seller profile:', error);
      return null;
    }
  }

  // Get application statistics (for admin dashboard)
  async getApplicationStats(): Promise<{
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const applications = await this.getAllApplications();
      
      return {
        total: applications.length,
        pending: applications.filter(app => app.status === 'pending').length,
        underReview: applications.filter(app => app.status === 'under_review').length,
        approved: applications.filter(app => app.status === 'approved').length,
        rejected: applications.filter(app => app.status === 'rejected').length
      };
    } catch (error) {
      console.error('Error getting application stats:', error);
      return { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0 };
    }
  }

  // Get all applications (admin function)
  private async getAllApplications(): Promise<SellerApplication[]> {
    try {
      await this.init();
      
      if (this.db) {
        const transaction = this.db.transaction(['applications'], 'readonly');
        const store = transaction.objectStore('applications');
        
        return new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      } else {
        return this.getApplicationsFromLocalStorage();
      }
    } catch (error) {
      console.error('Error getting all applications:', error);
      return [];
    }
  }

  // LocalStorage fallback methods
  private saveApplicationToLocalStorage(application: SellerApplication): void {
    const applications = this.getApplicationsFromLocalStorage();
    const existingIndex = applications.findIndex(app => app.id === application.id);
    
    if (existingIndex >= 0) {
      applications[existingIndex] = application;
    } else {
      applications.push(application);
    }
    
    localStorage.setItem('dollar_drop_seller_applications', JSON.stringify(applications));
  }

  private getApplicationsFromLocalStorage(): SellerApplication[] {
    try {
      const appsJson = localStorage.getItem('dollar_drop_seller_applications');
      return appsJson ? JSON.parse(appsJson) : [];
    } catch (error) {
      console.error('Error parsing applications from localStorage:', error);
      return [];
    }
  }

  private getApplicationFromLocalStorage(field: keyof SellerApplication, value: string): SellerApplication | null {
    const applications = this.getApplicationsFromLocalStorage();
    return applications.find(app => app[field] === value) || null;
  }

  private saveProfileToLocalStorage(profile: SellerProfile): void {
    const profiles = this.getProfilesFromLocalStorage();
    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }
    
    localStorage.setItem('dollar_drop_seller_profiles', JSON.stringify(profiles));
  }

  private getProfilesFromLocalStorage(): SellerProfile[] {
    try {
      const profilesJson = localStorage.getItem('dollar_drop_seller_profiles');
      return profilesJson ? JSON.parse(profilesJson) : [];
    } catch (error) {
      console.error('Error parsing profiles from localStorage:', error);
      return [];
    }
  }

  private getProfileFromLocalStorage(field: keyof SellerProfile, value: string): SellerProfile | null {
    const profiles = this.getProfilesFromLocalStorage();
    return profiles.find(profile => profile[field] === value) || null;
  }

  private saveReviewToLocalStorage(review: AdminReview): void {
    const reviews = this.getReviewsFromLocalStorage();
    reviews.push(review);
    localStorage.setItem('dollar_drop_seller_reviews', JSON.stringify(reviews));
  }

  private getReviewsFromLocalStorage(): AdminReview[] {
    try {
      const reviewsJson = localStorage.getItem('dollar_drop_seller_reviews');
      return reviewsJson ? JSON.parse(reviewsJson) : [];
    } catch (error) {
      console.error('Error parsing reviews from localStorage:', error);
      return [];
    }
  }
}

// Export singleton instance
export const sellerDatabase = new SellerDatabaseService();
