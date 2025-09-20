// Type definitions for Dollar Drop platform

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller' | 'admin';
  createdAt: Date;
  isVerified: boolean;
  tokens: number;
}

export interface Seller extends User {
  rating: number;
  totalSales: number;
  businessName?: string;
  businessType?: string;
  businessDescription?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  parentId?: string;
  slug?: string;
  children?: Category[];
  listingCount?: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  category: Category;
  seller: Seller;
  sellerId?: string;
  images: string[];
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  status: 'active' | 'timer_active' | 'ended' | 'sold';
  createdAt: Date;
  endTime?: Date;
  endsAt?: Date;
  gameType?: string;
  totalEntries?: number;
  totalBids?: number;
  uniqueBidders?: number;
  currentPrice?: number;
  timerDuration?: number;
  prizeWinner?: string;
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  bidder: User;
  amount: number;
  priceGuess: number;
  timestamp: Date;
  backupChoices: number[];
  isShunned: boolean;
  gameType?: string;
  gameScore?: number;
  entries?: number;
}

export interface GameResult {
  gameType: string;
  score: number;
  duration: number;
  timestamp: Date;
  reactionTimes: number[];
  correctAnswers: number;
  totalQuestions: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'game_entry' | 'game_win' | 'transfer_in' | 'transfer_out';
  amount: number;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
}

export interface Review {
  id: string;
  listingId: string;
  reviewerId: string;
  reviewer: User;
  rating: number;
  comment: string;
  timestamp: Date;
  verified: boolean;
}

export interface PlatformStats {
  totalUsers: number;
  totalListings: number;
  totalGamesPlayed: number;
  totalTokensInCirculation: number;
  averageTokenPrice: number;
  dailyActiveUsers: number;
}

// Additional missing types
export interface SellerApplicationForm {
  businessName: string;
  businessType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  taxId: string;
  bankAccount: string;
  routingNumber: string;
  businessDescription: string;
  experience: string;
  references: string;
  agreeToTerms: boolean;
}

export interface CreateListingForm {
  title: string;
  description: string;
  categoryId: string;
  basePrice: number;
  timerDuration: number;
  gameType: string;
  quantity: number;
  images: File[];
}

export interface PaymentForm {
  amount: number;
  paymentMethod: 'credit' | 'debit' | 'paypal' | 'apple_pay' | 'crypto';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface RevenueCalculation {
  grossRevenue: number;
  platformFee: number;
  listingFees: number;
  netRevenue: number;
  totalTransactions: number;
  totalRevenue: number;
  sellerPayout: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'sale' | 'fee' | 'refund';
  amount: number;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed' | 'escrowed';
  completedAt?: Date;
  platformFee?: number;
  escrowReleaseDate?: Date;
  listingId?: string;
}

export interface ListingFee {
  id?: string;
  listingId: string;
  sellerId: string;
  feeType: 'platform' | 'listing' | 'shipping';
  amount: number;
  timestamp: Date;
  status?: 'pending' | 'paid' | 'overdue';
  dueDate?: Date;
  paidAt?: Date;
  period?: string;
}

export interface TournamentEntry {
  id: string;
  tournamentId: string;
  userId: string;
  username: string;
  entryFee: number;
  coinsUsed: number;
  gameType: string;
  score?: number;
  rank?: number;
  timestamp: Date;
}

export interface PlatformRevenue {
  totalRevenue: number;
  platformFees: number;
  listingFees: number;
  transactionFees: number;
  period: string;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface RegisterFormErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
  agreeToTerms?: string;
}

export interface EscrowAccount {
  id: string;
  userId: string;
  balance: number;
  lockedAmount: number;
  transactions: Transaction[];
}