import type { Category } from '@/types';

export const categories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Smartphones, laptops, gaming devices, and tech accessories',
    slug: 'electronics',
    icon: '📱',
    listingCount: 0,
    children: [
      {
        id: 'smartphones',
        name: 'Smartphones',
        description: 'Mobile phones and accessories',
        slug: 'smartphones',
        parentId: 'electronics',
        listingCount: 0,
      },
      {
        id: 'computers',
        name: 'Computers',
        description: 'Laptops, desktops, and computer accessories',
        slug: 'computers',
        parentId: 'electronics',
        listingCount: 0,
      },
      {
        id: 'gaming',
        name: 'Gaming',
        description: 'Gaming consoles, games, and accessories',
        slug: 'gaming',
        parentId: 'electronics',
        listingCount: 0,
      },
      {
        id: 'audio',
        name: 'Audio & Video',
        description: 'Headphones, speakers, cameras, and AV equipment',
        slug: 'audio-video',
        parentId: 'electronics',
        listingCount: 0,
      }
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Clothing, shoes, accessories, and jewelry',
    slug: 'fashion',
    icon: '👕',
    listingCount: 0,
    children: [
      {
        id: 'mens-clothing',
        name: "Men's Clothing",
        description: 'Shirts, pants, suits, and casual wear for men',
        slug: 'mens-clothing',
        parentId: 'fashion',
        listingCount: 0,
      },
      {
        id: 'womens-clothing',
        name: "Women's Clothing",
        description: 'Dresses, tops, pants, and casual wear for women',
        slug: 'womens-clothing',
        parentId: 'fashion',
        listingCount: 0,
      },
      {
        id: 'shoes',
        name: 'Shoes',
        description: 'Sneakers, boots, heels, and casual footwear',
        slug: 'shoes',
        parentId: 'fashion',
        listingCount: 0,
      },
      {
        id: 'accessories',
        name: 'Accessories',
        description: 'Bags, jewelry, watches, and fashion accessories',
        slug: 'accessories',
        parentId: 'fashion',
        listingCount: 0,
      }
    ]
  },
  {
    id: 'home-garden',
    name: 'Home & Garden',
    description: 'Furniture, decor, appliances, and gardening supplies',
    slug: 'home-garden',
    icon: '🏠',
    listingCount: 0,
    children: [
      {
        id: 'furniture',
        name: 'Furniture',
        description: 'Sofas, tables, chairs, and bedroom furniture',
        slug: 'furniture',
        parentId: 'home-garden',
        listingCount: 0,
      },
      {
        id: 'home-decor',
        name: 'Home Decor',
        description: 'Wall art, lighting, rugs, and decorative items',
        slug: 'home-decor',
        parentId: 'home-garden',
        listingCount: 0,
      },
      {
        id: 'appliances',
        name: 'Appliances',
        description: 'Kitchen and home appliances',
        slug: 'appliances',
        parentId: 'home-garden',
        listingCount: 0,
      },
      {
        id: 'garden',
        name: 'Garden & Outdoor',
        description: 'Plants, tools, outdoor furniture, and garden supplies',
        slug: 'garden-outdoor',
        parentId: 'home-garden',
        listingCount: 0,
      }
    ]
  },
  {
    id: 'sports-outdoors',
    name: 'Sports & Outdoors',
    description: 'Fitness equipment, outdoor gear, and sports accessories',
    slug: 'sports-outdoors',
    icon: '⚽',
    listingCount: 0,
    children: [
      {
        id: 'fitness',
        name: 'Fitness Equipment',
        description: 'Weights, cardio machines, and workout gear',
        slug: 'fitness-equipment',
        parentId: 'sports-outdoors',
        listingCount: 0,
      },
      {
        id: 'outdoor-recreation',
        name: 'Outdoor Recreation',
        description: 'Camping, hiking, and outdoor adventure gear',
        slug: 'outdoor-recreation',
        parentId: 'sports-outdoors',
        listingCount: 0,
      },
      {
        id: 'team-sports',
        name: 'Team Sports',
        description: 'Equipment for football, basketball, soccer, and more',
        slug: 'team-sports',
        parentId: 'sports-outdoors',
        listingCount: 0,
      }
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Car parts, accessories, and automotive tools',
    slug: 'automotive',
    icon: '🚗',
    listingCount: 0,
    children: [
      {
        id: 'car-parts',
        name: 'Car Parts',
        description: 'Engine parts, brakes, suspension, and more',
        slug: 'car-parts',
        parentId: 'automotive',
        listingCount: 0,
      },
      {
        id: 'car-accessories',
        name: 'Car Accessories',
        description: 'Interior and exterior car accessories',
        slug: 'car-accessories',
        parentId: 'automotive',
        listingCount: 0,
      },
      {
        id: 'tools-equipment',
        name: 'Tools & Equipment',
        description: 'Automotive tools and maintenance equipment',
        slug: 'automotive-tools',
        parentId: 'automotive',
        listingCount: 0,
      }
    ]
  },
  {
    id: 'books-media',
    name: 'Books & Media',
    description: 'Books, movies, music, and educational materials',
    slug: 'books-media',
    icon: '📚',
    listingCount: 0,
    children: [
      {
        id: 'books',
        name: 'Books',
        description: 'Fiction, non-fiction, textbooks, and rare books',
        slug: 'books',
        parentId: 'books-media',
        listingCount: 0,
      },
      {
        id: 'movies-tv',
        name: 'Movies & TV',
        description: 'DVDs, Blu-rays, and digital media',
        slug: 'movies-tv',
        parentId: 'books-media',
        listingCount: 0,
      },
      {
        id: 'music',
        name: 'Music',
        description: 'Vinyl records, CDs, and music memorabilia',
        slug: 'music',
        parentId: 'books-media',
        listingCount: 0,
      }
    ]
  },
  {
    id: 'collectibles',
    name: 'Collectibles',
    description: 'Antiques, art, coins, and collectible items',
    slug: 'collectibles',
    icon: '🎨',
    listingCount: 0,
    children: [
      {
        id: 'art',
        name: 'Art',
        description: 'Paintings, sculptures, and original artwork',
        slug: 'art',
        parentId: 'collectibles',
        listingCount: 0,
      },
      {
        id: 'antiques',
        name: 'Antiques',
        description: 'Vintage and antique items',
        slug: 'antiques',
        parentId: 'collectibles',
        listingCount: 0,
      },
      {
        id: 'coins-currency',
        name: 'Coins & Currency',
        description: 'Rare coins, bills, and currency collectibles',
        slug: 'coins-currency',
        parentId: 'collectibles',
        listingCount: 0,
      },
      {
        id: 'trading-cards',
        name: 'Trading Cards',
        description: 'Sports cards, gaming cards, and collectible cards',
        slug: 'trading-cards',
        parentId: 'collectibles',
        listingCount: 0,
      }
    ]
  },
  {
    id: 'health-beauty',
    name: 'Health & Beauty',
    description: 'Skincare, makeup, supplements, and wellness products',
    slug: 'health-beauty',
    icon: '💄',
    listingCount: 0,
    children: [
      {
        id: 'skincare',
        name: 'Skincare',
        description: 'Cleansers, moisturizers, and skincare treatments',
        slug: 'skincare',
        parentId: 'health-beauty',
        listingCount: 0,
      },
      {
        id: 'makeup',
        name: 'Makeup',
        description: 'Cosmetics, brushes, and beauty tools',
        slug: 'makeup',
        parentId: 'health-beauty',
        listingCount: 0,
      },
      {
        id: 'wellness',
        name: 'Health & Wellness',
        description: 'Supplements, fitness trackers, and wellness products',
        slug: 'health-wellness',
        parentId: 'health-beauty',
        listingCount: 0,
      }
    ]
  }
];

export function getCategoryById(id: string): Category | undefined {
  for (const category of categories) {
    if (category.id === id) return category;
    if (category.children) {
      const child = category.children.find(child => child.id === id);
      if (child) return child;
    }
  }
  return undefined;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  for (const category of categories) {
    if (category.slug === slug) return category;
    if (category.children) {
      const child = category.children.find(child => child.slug === slug);
      if (child) return child;
    }
  }
  return undefined;
}

export function getAllCategories(): Category[] {
  const allCategories: Category[] = [];
  for (const category of categories) {
    allCategories.push(category);
    if (category.children) {
      allCategories.push(...category.children);
    }
  }
  return allCategories;
}
