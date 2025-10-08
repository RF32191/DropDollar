import type { Listing, Seller } from '@/types';
import { categories, getCategoryById } from './categories';

// Sample sellers
const sampleSellers: Seller[] = [
  {
    id: 'seller1',
    email: 'john@techstore.com',
    username: 'TechGuru_John',
    firstName: 'John',
    lastName: 'Smith',
    role: 'seller',
    createdAt: new Date('2024-01-15'),
    isVerified: true,
    tokens: 150,
    businessName: "John's Tech Store",
    businessDescription: 'Premium electronics and gadgets',
    approvalStatus: 'approved',
    approvedAt: new Date('2024-01-16'),
    rating: 4.8,
    totalSales: 47,
  },
  {
    id: 'seller2',
    email: 'sarah@fashionhub.com',
    username: 'StyleSarah',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'seller',
    createdAt: new Date('2024-02-01'),
    isVerified: true,
    tokens: 230,
    businessName: 'Fashion Hub',
    businessDescription: 'Trendy fashion and accessories',
    approvalStatus: 'approved',
    approvedAt: new Date('2024-02-02'),
    rating: 4.9,
    totalSales: 63,
  },
  {
    id: 'seller3',
    email: 'mike@collectibles.com',
    username: 'CollectorMike',
    firstName: 'Mike',
    lastName: 'Davis',
    role: 'seller',
    createdAt: new Date('2024-01-20'),
    isVerified: true,
    tokens: 89,
    businessName: 'Rare Finds Collectibles',
    businessDescription: 'Authentic collectibles and vintage items',
    approvalStatus: 'approved',
    approvedAt: new Date('2024-01-21'),
    rating: 4.7,
    totalSales: 31,
  },
];

// Generate sample listings
export const sampleListings: Listing[] = [
  {
    id: 'listing1',
    sellerId: 'seller1',
    seller: sampleSellers[0],
    title: 'iPhone 15 Pro Max - 256GB - Natural Titanium',
    description: 'Brand new iPhone 15 Pro Max in Natural Titanium. Unopened box with full warranty. Features the new A17 Pro chip, titanium design, and advanced camera system.',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/300', '/api/placeholder/400/300'],
    category: getCategoryById('smartphones')!,
    basePrice: 1200,
    currentPrice: 1200,
    targetPrice: 1000,
    timerDuration: 720, // 12 hours
    status: 'active',
    createdAt: new Date('2024-12-15T10:00:00Z'),
    updatedAt: new Date('2024-12-15T10:00:00Z'),
    totalBids: 0,
    uniqueBidders: 0,
  },
  {
    id: 'listing2',
    sellerId: 'seller1',
    seller: sampleSellers[0],
    title: 'MacBook Pro 14" M3 Chip - Space Gray',
    description: 'Latest MacBook Pro with M3 chip, 16GB RAM, 512GB SSD. Perfect for professionals and creators. Includes original charger and documentation.',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/300'],
    category: getCategoryById('computers')!,
    basePrice: 2000,
    currentPrice: 1985,
    targetPrice: 1800,
    timerDuration: 1440, // 24 hours
    status: 'active',
    createdAt: new Date('2024-12-14T14:30:00Z'),
    updatedAt: new Date('2024-12-15T09:15:00Z'),
    totalBids: 15,
    uniqueBidders: 12,
  },
  {
    id: 'listing3',
    sellerId: 'seller2',
    seller: sampleSellers[1],
    title: 'Designer Leather Handbag - Limited Edition',
    description: 'Authentic designer leather handbag in pristine condition. Limited edition piece with certificate of authenticity. Perfect for special occasions.',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/300', '/api/placeholder/400/300', '/api/placeholder/400/300'],
    category: getCategoryById('accessories')!,
    basePrice: 800,
    currentPrice: 752,
    targetPrice: 600,
    timerDuration: 480, // 8 hours
    status: 'timer_active',
    createdAt: new Date('2024-12-13T16:00:00Z'),
    updatedAt: new Date('2024-12-15T08:00:00Z'),
    timerStartedAt: new Date('2024-12-15T08:00:00Z'),
    endsAt: new Date('2024-12-15T16:00:00Z'),
    totalBids: 48,
    uniqueBidders: 31,
  },
  {
    id: 'listing4',
    sellerId: 'seller1',
    seller: sampleSellers[0],
    title: 'PlayStation 5 Console + Extra Controller',
    description: 'PlayStation 5 console in excellent condition with original box, cables, and an extra DualSense controller. Includes 3 popular games.',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/300'],
    category: getCategoryById('gaming')!,
    basePrice: 600,
    currentPrice: 573,
    targetPrice: 450,
    timerDuration: 360, // 6 hours
    status: 'timer_active',
    createdAt: new Date('2024-12-14T12:00:00Z'),
    updatedAt: new Date('2024-12-15T07:30:00Z'),
    timerStartedAt: new Date('2024-12-15T07:30:00Z'),
    endsAt: new Date('2024-12-15T13:30:00Z'),
    totalBids: 27,
    uniqueBidders: 23,
  },
  {
    id: 'listing5',
    sellerId: 'seller3',
    seller: sampleSellers[2],
    title: 'Vintage Rolex Submariner - 1985',
    description: 'Authentic vintage Rolex Submariner from 1985. Serviced and in excellent working condition. Comes with original papers and box.',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/300', '/api/placeholder/400/300'],
    category: getCategoryById('accessories')!,
    basePrice: 8000,
    currentPrice: 7912,
    targetPrice: 7500,
    timerDuration: 1440, // 24 hours
    status: 'active',
    createdAt: new Date('2024-12-12T09:00:00Z'),
    updatedAt: new Date('2024-12-15T11:45:00Z'),
    totalBids: 88,
    uniqueBidders: 67,
  },
  {
    id: 'listing6',
    sellerId: 'seller2',
    seller: sampleSellers[1],
    title: 'Nike Air Jordan 1 Retro High - Size 10',
    description: 'Brand new Nike Air Jordan 1 Retro High in Chicago colorway. Size 10 US. Never worn, still in original box with tags.',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/300'],
    category: getCategoryById('shoes')!,
    basePrice: 350,
    currentPrice: 324,
    targetPrice: 280,
    timerDuration: 180, // 3 hours
    status: 'timer_active',
    createdAt: new Date('2024-12-15T06:00:00Z'),
    updatedAt: new Date('2024-12-15T09:00:00Z'),
    timerStartedAt: new Date('2024-12-15T09:00:00Z'),
    endsAt: new Date('2024-12-15T12:00:00Z'),
    totalBids: 26,
    uniqueBidders: 21,
  },
  {
    id: 'listing7',
    sellerId: 'seller3',
    seller: sampleSellers[2],
    title: 'Pokémon Base Set Charizard - PSA 9',
    description: 'Professionally graded Pokémon Base Set Charizard card in PSA 9 condition. Rare find for collectors. Certificate included.',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/300'],
    category: getCategoryById('trading-cards')!,
    basePrice: 3500,
    currentPrice: 3456,
    targetPrice: 3200,
    timerDuration: 960, // 16 hours
    status: 'active',
    createdAt: new Date('2024-12-14T08:00:00Z'),
    updatedAt: new Date('2024-12-15T10:30:00Z'),
    totalBids: 44,
    uniqueBidders: 38,
  },
  {
    id: 'listing8',
    sellerId: 'seller1',
    seller: sampleSellers[0],
    title: 'AirPods Pro 2nd Generation - USB-C',
    description: 'Latest AirPods Pro with USB-C charging case. Active noise cancellation, spatial audio, and all-day battery life. Like new condition.',
    images: ['/api/placeholder/400/300'],
    category: getCategoryById('audio')!,
    basePrice: 250,
    currentPrice: 231,
    targetPrice: 200,
    timerDuration: 120, // 2 hours
    status: 'timer_active',
    createdAt: new Date('2024-12-15T08:30:00Z'),
    updatedAt: new Date('2024-12-15T10:00:00Z'),
    timerStartedAt: new Date('2024-12-15T10:00:00Z'),
    endsAt: new Date('2024-12-15T12:00:00Z'),
    totalBids: 19,
    uniqueBidders: 17,
  },
];

// Helper functions
export function getListingsByCategory(categorySlug: string): Listing[] {
  return sampleListings.filter(listing => 
    listing.category.slug === categorySlug || 
    listing.category.parentId === categorySlug
  );
}

export function getActiveListings(): Listing[] {
  return sampleListings.filter(listing => 
    listing.status === 'active' || listing.status === 'timer_active'
  );
}

export function getTimerActiveListings(): Listing[] {
  return sampleListings
    .filter(listing => listing.status === 'timer_active')
    .sort((a, b) => {
      if (!a.endsAt || !b.endsAt) return 0;
      return a.endsAt.getTime() - b.endsAt.getTime();
    });
}

export function getListingById(id: string): Listing | undefined {
  return sampleListings.find(listing => listing.id === id);
}

export function calculateTimeRemaining(listing: Listing): number {
  if (!listing.endsAt) return 0;
  const now = new Date();
  const remaining = listing.endsAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(remaining / 1000 / 60)); // Return minutes remaining
}
