// Category-specific product listings with hot sale items

export interface Product {
  id: string;
  title: string;
  basePrice: number;
  currentCollected: number;
  timeRemaining?: string; // For hot sale items
  isHotSale: boolean;
  image: string;
  description: string;
  condition: 'Brand New' | 'Like New' | 'Good' | 'Fair';
  seller: string;
  category: string;
  gameType?: string;
  participantCount: number;
  features?: string[];
}

export const categoryProducts = {
  electronics: [
    // Hot Sale Items (base price met, 24h timer active)
    {
      id: 'electronics-hot-1',
      title: 'iPhone 15 Pro Max 256GB',
      basePrice: 1199,
      currentCollected: 1245,
      timeRemaining: '18h 42m',
      isHotSale: true,
      image: '/products/iphone-15-pro.jpg',
      description: 'Latest iPhone with titanium design, A17 Pro chip, and advanced camera system',
      condition: 'Brand New' as const,
      seller: 'TechWorld Store',
      category: 'electronics',
      gameType: 'Multi-Target Reaction',
      participantCount: 1245,
      features: ['256GB Storage', 'Titanium Build', 'A17 Pro Chip', '48MP Camera']
    },
    {
      id: 'electronics-hot-2',
      title: 'MacBook Air M3 15-inch',
      basePrice: 1299,
      currentCollected: 1356,
      timeRemaining: '22h 15m',
      isHotSale: true,
      image: '/products/macbook-air-m3.jpg',
      description: 'Powerful MacBook Air with M3 chip, 15-inch Liquid Retina display',
      condition: 'Brand New' as const,
      seller: 'Apple Authorized',
      category: 'electronics',
      gameType: 'Multi-Target Reaction',
      participantCount: 1356,
      features: ['M3 Chip', '15-inch Display', '8GB RAM', '256GB SSD']
    },
    // Regular listings
    {
      id: 'electronics-1',
      title: 'Samsung Galaxy S24 Ultra',
      basePrice: 1199,
      currentCollected: 856,
      isHotSale: false,
      image: '/products/galaxy-s24.jpg',
      description: 'Premium Android flagship with S Pen, 200MP camera, and AI features',
      condition: 'Brand New' as const,
      seller: 'Samsung Official',
      category: 'electronics',
      participantCount: 856,
      features: ['200MP Camera', 'S Pen Included', 'AI Features', '256GB Storage']
    },
    {
      id: 'electronics-2',
      title: 'iPad Pro 12.9" M4',
      basePrice: 1099,
      currentCollected: 723,
      isHotSale: false,
      image: '/products/ipad-pro-m4.jpg',
      description: 'Professional tablet with M4 chip, Liquid Retina XDR display',
      condition: 'Brand New' as const,
      seller: 'Tech Solutions',
      category: 'electronics',
      participantCount: 723,
      features: ['M4 Chip', '12.9" XDR Display', 'Apple Pencil Support', '256GB Storage']
    },
    {
      id: 'electronics-3',
      title: 'Sony WH-1000XM5 Headphones',
      basePrice: 399,
      currentCollected: 234,
      isHotSale: false,
      image: '/products/sony-headphones.jpg',
      description: 'Industry-leading noise canceling wireless headphones',
      condition: 'Brand New' as const,
      seller: 'Audio Pro',
      category: 'electronics',
      participantCount: 234,
      features: ['Noise Canceling', '30hr Battery', 'Hi-Res Audio', 'Touch Controls']
    },
    {
      id: 'electronics-4',
      title: 'Nintendo Switch OLED',
      basePrice: 349,
      currentCollected: 187,
      isHotSale: false,
      image: '/products/switch-oled.jpg',
      description: 'Gaming console with vibrant OLED screen and enhanced audio',
      condition: 'Brand New' as const,
      seller: 'GameStop Pro',
      category: 'electronics',
      participantCount: 187,
      features: ['7" OLED Screen', 'Enhanced Audio', '64GB Storage', 'Dock Included']
    }
  ],

  automotive: [
    // Hot Sale Items
    {
      id: 'automotive-hot-1',
      title: '2024 Tesla Model 3 Performance',
      basePrice: 52990,
      currentCollected: 54200,
      timeRemaining: '16h 28m',
      isHotSale: true,
      image: '/products/tesla-model3.jpg',
      description: 'High-performance electric sedan with autopilot and premium interior',
      condition: 'Brand New' as const,
      seller: 'Tesla Direct',
      category: 'automotive',
      gameType: 'Falling Object Catch',
      participantCount: 54200,
      features: ['0-60 in 3.1s', 'Autopilot', '315mi Range', 'Premium Interior']
    },
    // Regular listings
    {
      id: 'automotive-1',
      title: '2024 BMW M3 Competition',
      basePrice: 73300,
      currentCollected: 45600,
      isHotSale: false,
      image: '/products/bmw-m3.jpg',
      description: 'High-performance luxury sedan with twin-turbo engine',
      condition: 'Brand New' as const,
      seller: 'BMW Dealership',
      category: 'automotive',
      participantCount: 45600,
      features: ['473 HP', 'AWD', 'Carbon Fiber', 'M Performance']
    },
    {
      id: 'automotive-2',
      title: '2024 Ford Mustang GT',
      basePrice: 38630,
      currentCollected: 28900,
      isHotSale: false,
      image: '/products/mustang-gt.jpg',
      description: 'Iconic American muscle car with 5.0L V8 engine',
      condition: 'Brand New' as const,
      seller: 'Ford Performance',
      category: 'automotive',
      participantCount: 28900,
      features: ['5.0L V8', '450 HP', 'Manual Trans', 'Performance Pack']
    },
    {
      id: 'automotive-3',
      title: 'Harley Davidson Street Glide',
      basePrice: 21999,
      currentCollected: 15400,
      isHotSale: false,
      image: '/products/harley-street.jpg',
      description: 'Premium touring motorcycle with Milwaukee-Eight engine',
      condition: 'Brand New' as const,
      seller: 'Harley Dealer',
      category: 'automotive',
      participantCount: 15400,
      features: ['Milwaukee-Eight 114', 'Touring Package', 'Infotainment', 'ABS']
    }
  ],

  fashion: [
    // Hot Sale Items
    {
      id: 'fashion-hot-1',
      title: 'Rolex Submariner Date',
      basePrice: 9550,
      currentCollected: 9890,
      timeRemaining: '11h 33m',
      isHotSale: true,
      image: '/products/rolex-submariner.jpg',
      description: 'Iconic luxury dive watch with ceramic bezel and automatic movement',
      condition: 'Brand New' as const,
      seller: 'Authorized Dealer',
      category: 'fashion',
      gameType: 'Color Sequence Memory',
      participantCount: 9890,
      features: ['Ceramic Bezel', 'Automatic Movement', 'Water Resistant', 'Oyster Bracelet']
    },
    // Regular listings
    {
      id: 'fashion-1',
      title: 'Louis Vuitton Neverfull MM',
      basePrice: 1960,
      currentCollected: 1234,
      isHotSale: false,
      image: '/products/lv-neverfull.jpg',
      description: 'Iconic tote bag in Monogram canvas with leather trim',
      condition: 'Brand New' as const,
      seller: 'LV Boutique',
      category: 'fashion',
      participantCount: 1234,
      features: ['Monogram Canvas', 'Leather Trim', 'Spacious Interior', 'Pochette Included']
    },
    {
      id: 'fashion-2',
      title: 'Gucci Ace Sneakers',
      basePrice: 650,
      currentCollected: 423,
      isHotSale: false,
      image: '/products/gucci-ace.jpg',
      description: 'Luxury leather sneakers with signature green and red stripe',
      condition: 'Brand New' as const,
      seller: 'Gucci Store',
      category: 'fashion',
      participantCount: 423,
      features: ['Italian Leather', 'Signature Stripe', 'Embroidered Bee', 'Rubber Sole']
    },
    {
      id: 'fashion-3',
      title: 'Canada Goose Expedition Parka',
      basePrice: 1195,
      currentCollected: 678,
      isHotSale: false,
      image: '/products/canada-goose.jpg',
      description: 'Extreme weather parka with coyote fur trim and down fill',
      condition: 'Brand New' as const,
      seller: 'Canada Goose',
      category: 'fashion',
      participantCount: 678,
      features: ['Down Fill', 'Coyote Fur Trim', 'Extreme Weather', 'Lifetime Warranty']
    }
  ],

  home: [
    // Hot Sale Items
    {
      id: 'home-hot-1',
      title: 'KitchenAid Stand Mixer Pro',
      basePrice: 449,
      currentCollected: 467,
      timeRemaining: '19h 07m',
      isHotSale: true,
      image: '/products/kitchenaid-mixer.jpg',
      description: 'Professional 6-quart stand mixer with multiple attachments',
      condition: 'Brand New' as const,
      seller: 'KitchenAid Official',
      category: 'home',
      gameType: 'Falling Object Catch',
      participantCount: 467,
      features: ['6-Quart Bowl', '10 Speeds', 'Attachments Included', 'Tilt-Head Design']
    },
    // Regular listings
    {
      id: 'home-1',
      title: 'Dyson V15 Detect Vacuum',
      basePrice: 749,
      currentCollected: 523,
      isHotSale: false,
      image: '/products/dyson-v15.jpg',
      description: 'Cordless vacuum with laser dust detection and LCD screen',
      condition: 'Brand New' as const,
      seller: 'Dyson Store',
      category: 'home',
      participantCount: 523,
      features: ['Laser Detection', 'LCD Screen', 'Up to 60min Runtime', 'Multiple Tools']
    },
    {
      id: 'home-2',
      title: 'Ninja Foodi Indoor Grill',
      basePrice: 229,
      currentCollected: 156,
      isHotSale: false,
      image: '/products/ninja-grill.jpg',
      description: 'Indoor grill and air fryer combo with cyclonic grilling technology',
      condition: 'Brand New' as const,
      seller: 'Ninja Kitchen',
      category: 'home',
      participantCount: 156,
      features: ['Cyclonic Grilling', 'Air Fry Function', 'Smokeless', 'Easy Clean']
    },
    {
      id: 'home-3',
      title: 'Tempur-Pedic Memory Foam Mattress',
      basePrice: 1999,
      currentCollected: 1345,
      isHotSale: false,
      image: '/products/tempurpedic.jpg',
      description: 'Queen size memory foam mattress with cooling technology',
      condition: 'Brand New' as const,
      seller: 'Sleep Center',
      category: 'home',
      participantCount: 1345,
      features: ['Memory Foam', 'Cooling Tech', 'Queen Size', '10 Year Warranty']
    }
  ],

  sports: [
    // Hot Sale Items
    {
      id: 'sports-hot-1',
      title: 'Peloton Bike+ Premium',
      basePrice: 2495,
      currentCollected: 2567,
      timeRemaining: '14h 52m',
      isHotSale: true,
      image: '/products/peloton-bike.jpg',
      description: 'Premium exercise bike with rotating HD touchscreen and auto-follow resistance',
      condition: 'Brand New' as const,
      seller: 'Peloton Official',
      category: 'sports',
      gameType: 'Multi-Target Reaction',
      participantCount: 2567,
      features: ['Rotating Screen', 'Auto-Follow', 'Premium Sound', '1 Year Membership']
    },
    // Regular listings
    {
      id: 'sports-1',
      title: 'TaylorMade Stealth Driver',
      basePrice: 599,
      currentCollected: 389,
      isHotSale: false,
      image: '/products/taylormade-driver.jpg',
      description: 'Professional golf driver with carbon face and adjustable loft',
      condition: 'Brand New' as const,
      seller: 'Golf Pro Shop',
      category: 'sports',
      participantCount: 389,
      features: ['Carbon Face', 'Adjustable Loft', 'Speed Pocket', 'Tour Preferred']
    },
    {
      id: 'sports-2',
      title: 'Yeti Tundra 65 Cooler',
      basePrice: 375,
      currentCollected: 234,
      isHotSale: false,
      image: '/products/yeti-cooler.jpg',
      description: 'Heavy-duty cooler with superior ice retention for outdoor adventures',
      condition: 'Brand New' as const,
      seller: 'Outdoor Gear',
      category: 'sports',
      participantCount: 234,
      features: ['10+ Day Ice', 'Bear Resistant', 'Rotomolded', 'Lifetime Warranty']
    },
    {
      id: 'sports-3',
      title: 'NordicTrack Treadmill X32i',
      basePrice: 4999,
      currentCollected: 3456,
      isHotSale: false,
      image: '/products/nordictrack.jpg',
      description: 'Commercial-grade treadmill with incline/decline and iFit integration',
      condition: 'Brand New' as const,
      seller: 'Fitness Equipment',
      category: 'sports',
      participantCount: 3456,
      features: ['40% Incline', '-6% Decline', '32" Touchscreen', 'iFit Included']
    }
  ],

  collectibles: [
    // Hot Sale Items
    {
      id: 'collectibles-hot-1',
      title: 'Pokemon Charizard Base Set 1st Edition',
      basePrice: 15000,
      currentCollected: 15890,
      timeRemaining: '20h 18m',
      isHotSale: true,
      image: '/products/charizard-card.jpg',
      description: 'PSA 10 graded Charizard from Base Set 1st Edition - mint condition',
      condition: 'Like New' as const,
      seller: 'Card Collector Pro',
      category: 'collectibles',
      gameType: 'Color Sequence Memory',
      participantCount: 15890,
      features: ['PSA 10 Graded', '1st Edition', 'Base Set', 'Mint Condition']
    },
    // Regular listings
    {
      id: 'collectibles-1',
      title: 'Vintage Rolex Daytona 1970s',
      basePrice: 45000,
      currentCollected: 32100,
      isHotSale: false,
      image: '/products/vintage-rolex.jpg',
      description: 'Rare vintage Rolex Daytona from the 1970s with original papers',
      condition: 'Good' as const,
      seller: 'Watch Collector',
      category: 'collectibles',
      participantCount: 32100,
      features: ['1970s Vintage', 'Original Papers', 'Serviced Movement', 'Rare Find']
    },
    {
      id: 'collectibles-2',
      title: 'Action Comics #1 CGC 6.0',
      basePrice: 125000,
      currentCollected: 89500,
      isHotSale: false,
      image: '/products/action-comics.jpg',
      description: 'First appearance of Superman - CGC graded 6.0 Fine condition',
      condition: 'Good' as const,
      seller: 'Comic Vault',
      category: 'collectibles',
      participantCount: 89500,
      features: ['First Superman', 'CGC 6.0', '1938 Original', 'Investment Grade']
    },
    {
      id: 'collectibles-3',
      title: 'Michael Jordan Rookie Card PSA 10',
      basePrice: 8500,
      currentCollected: 6234,
      isHotSale: false,
      image: '/products/jordan-rookie.jpg',
      description: '1986-87 Fleer Michael Jordan rookie card in perfect PSA 10 condition',
      condition: 'Like New' as const,
      seller: 'Sports Cards Elite',
      category: 'collectibles',
      participantCount: 6234,
      features: ['PSA 10', 'Rookie Card', '1986-87 Fleer', 'Perfect Condition']
    }
  ]
};

export const categories = [
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'automotive', name: 'Automotive', icon: '🚗' },
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'home', name: 'Home & Garden', icon: '🏠' },
  { id: 'sports', name: 'Sports & Outdoors', icon: '⚽' },
  { id: 'collectibles', name: 'Collectibles', icon: '🎨' }
];

export function getCategoryProducts(categoryId: string): Product[] {
  return categoryProducts[categoryId as keyof typeof categoryProducts] || [];
}

export function getHotSaleProducts(categoryId: string): Product[] {
  const products = getCategoryProducts(categoryId);
  return products.filter(product => product.isHotSale);
}

export function getRegularProducts(categoryId: string): Product[] {
  const products = getCategoryProducts(categoryId);
  return products.filter(product => !product.isHotSale);
}
