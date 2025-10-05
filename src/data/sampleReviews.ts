export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images?: string[];
}

export const sampleReviews: { [listingId: string]: Review[] } = {
  '1': [ // iPhone 15 Pro reviews
    {
      id: 'r1',
      userId: 'u1',
      userName: 'TechEnthusiast92',
      rating: 5,
      title: 'Won it for $450 - Every DropDollars the Price works!',
      content: 'I couldn\'t believe it when I actually won! I placed 15 bids at $1 each and watched the price drop from $999 to $450. The phone arrived in perfect condition, exactly as described. Every dollar drops the price - this concept is revolutionary! The bidding was exciting and fair.',
      date: '2024-01-15',
      verified: true,
      helpful: 23,
      notHelpful: 2
    },
    {
      id: 'r2',
      userId: 'u2',
      userName: 'SarahM_Seattle',
      rating: 5,
      title: 'Amazing condition, incredible savings!',
      content: 'This iPhone 15 Pro is in pristine condition! I won it for $520 after placing 12 bids. The seller was professional and shipped it the same day. Every dollar drops the price - I saved almost $500 compared to buying retail. Highly recommend DropDollar!',
      date: '2024-01-10',
      verified: true,
      helpful: 18,
      notHelpful: 1
    },
    {
      id: 'r3',
      userId: 'u3',
      userName: 'MobileGuru',
      rating: 4,
      title: 'Great phone, minor cosmetic wear',
      content: 'Won this for $480. The phone works perfectly but has a tiny scratch on the back (not visible with a case). Still an incredible deal! Every dollar drops the price is such a smart concept. Would definitely bid again.',
      date: '2024-01-08',
      verified: true,
      helpful: 15,
      notHelpful: 3
    }
  ],
  '2': [ // Gaming Laptop reviews
    {
      id: 'r4',
      userId: 'u4',
      userName: 'GamerDad2024',
      rating: 5,
      title: 'Perfect gaming laptop - son loves it!',
      content: 'Won this gaming laptop for my son\'s birthday. Got it for $720 instead of the $1,800 retail price! The laptop runs all his games perfectly. Every dollar drops the price - we placed 25 bids and it was worth every penny. Shipping was fast and secure.',
      date: '2024-01-12',
      verified: true,
      helpful: 31,
      notHelpful: 0
    },
    {
      id: 'r5',
      userId: 'u5',
      userName: 'CollegeStudent_TX',
      rating: 5,
      title: 'Dream laptop at student budget price!',
      content: 'As a computer science student, I needed a powerful laptop but couldn\'t afford retail prices. DropDollar made my dream possible! Won this beast for $680. Every dollar drops the price - I love this platform! Performance is incredible.',
      date: '2024-01-09',
      verified: true,
      helpful: 27,
      notHelpful: 1
    }
  ],
  '3': [ // Diamond Ring reviews
    {
      id: 'r6',
      userId: 'u6',
      userName: 'EngagedAndHappy',
      rating: 5,
      title: 'She said YES! Perfect ring at perfect price',
      content: 'I was looking for the perfect engagement ring and found it here! Won this beautiful 1.5ct diamond ring for $2,100 instead of $4,500. The quality is exceptional - GIA certified and exactly as described. Every dollar drops the price saved me thousands! She absolutely loves it.',
      date: '2024-01-14',
      verified: true,
      helpful: 42,
      notHelpful: 0
    },
    {
      id: 'r7',
      userId: 'u7',
      userName: 'JewelryLover',
      rating: 5,
      title: 'Stunning quality, authentic certificate',
      content: 'This ring is absolutely gorgeous! The diamond sparkles beautifully and came with all original certificates. Won it for $1,980 after 35 bids. Every dollar drops the price - what an amazing concept! Would definitely recommend to anyone looking for quality jewelry.',
      date: '2024-01-11',
      verified: true,
      helpful: 19,
      notHelpful: 2
    }
  ],
  '4': [ // Sound System reviews
    {
      id: 'r8',
      userId: 'u8',
      userName: 'AudiophileChicago',
      rating: 5,
      title: 'Home theater upgrade complete!',
      content: 'This Yamaha 7.1 system transformed my home theater! Won it for $380 vs $850 retail. The sound quality is incredible - crystal clear highs and deep bass. Every dollar drops the price made this upgrade affordable. Setup was straightforward with clear instructions.',
      date: '2024-01-13',
      verified: true,
      helpful: 25,
      notHelpful: 1
    }
  ],
  '5': [ // Designer Handbag reviews
    {
      id: 'r9',
      userId: 'u9',
      userName: 'FashionistaEmily',
      rating: 5,
      title: 'Authentic LV bag - verified and beautiful!',
      content: 'I never thought I could afford a Louis Vuitton bag, but DropDollar made it possible! Won this Neverfull MM for $320 instead of $1,200. It\'s 100% authentic with all original packaging. Every dollar drops the price - I\'m obsessed with this platform!',
      date: '2024-01-16',
      verified: true,
      helpful: 33,
      notHelpful: 0
    }
  ],
  '6': [ // Camera reviews
    {
      id: 'r10',
      userId: 'u10',
      userName: 'PhotoPro_SF',
      rating: 5,
      title: 'Professional quality at student price',
      content: 'As a photography student, this Canon EOS R5 was out of my budget at $3,900. Won it for $1,100 on DropDollar! The image quality is phenomenal and it came with original warranty. Every dollar drops the price - this platform is a game-changer for students and professionals alike.',
      date: '2024-01-17',
      verified: true,
      helpful: 28,
      notHelpful: 1
    }
  ]
};

// Helper function to get reviews for a listing
export const getReviewsForListing = (listingId: string): Review[] => {
  return sampleReviews[listingId] || [];
};

// Helper function to calculate average rating
export const getAverageRating = (listingId: string): number => {
  const reviews = getReviewsForListing(listingId);
  if (reviews.length === 0) return 0;
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return totalRating / reviews.length;
};

// Helper function to get total review count
export const getTotalReviews = (listingId: string): number => {
  return getReviewsForListing(listingId).length;
};
