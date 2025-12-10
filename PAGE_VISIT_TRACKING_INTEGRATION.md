# Page Visit Tracking Integration Guide

## Overview
The page visit tracking system automatically tracks when users visit pages and categories to earn RP rewards through challenges.

## How to Integrate

### 1. Import the Hook
```typescript
import { usePageVisitTracking } from '@/hooks/usePageVisitTracking';
```

### 2. Add to Page Components

#### For Category Pages:
```typescript
export default function CategoryPage() {
  const { user } = useAuth();
  
  // Track category page visit
  usePageVisitTracking({
    pageType: 'category',
    categoryId: 'electronics', // Your category ID
    enabled: !!user
  });
  
  // ... rest of component
}
```

#### For Game Pages:
```typescript
export default function GamePage() {
  const { user } = useAuth();
  
  // Track game page visit
  usePageVisitTracking({
    pageType: 'game',
    gameType: 'quick-click', // Your game type
    enabled: !!user
  });
  
  // ... rest of component
}
```

#### For Shop Pages:
```typescript
export default function ShopPage() {
  const { user } = useAuth();
  
  // Track shop page visit
  usePageVisitTracking({
    pageType: 'shop',
    enabled: !!user
  });
  
  // ... rest of component
}
```

#### Auto-Detection (Simplest):
```typescript
export default function AnyPage() {
  const { user } = useAuth();
  
  // Automatically detects page type from pathname
  usePageVisitTracking({
    enabled: !!user
  });
  
  // ... rest of component
}
```

## Pages to Update

### High Priority (Add tracking):
- `/games` - Games page
- `/categories` - Categories listing
- `/categories/[category]` - Individual category pages
- `/rp-shop` - RP shop
- `/buy-tokens` - Token shop
- `/hot-sell` - Hot sell page
- `/tournaments` - Tournaments page

### Example Integration:

**src/app/games/page.tsx:**
```typescript
import { usePageVisitTracking } from '@/hooks/usePageVisitTracking';

export default function GamesPage() {
  const { user } = useAuth();
  
  // Track games page visit
  usePageVisitTracking({
    pageType: 'game',
    enabled: !!user
  });
  
  // ... existing code
}
```

**src/app/categories/[category]/page.tsx:**
```typescript
import { usePageVisitTracking } from '@/hooks/usePageVisitTracking';

export default function CategoryPage({ params }: { params: { category: string } }) {
  const { user } = useAuth();
  
  // Track category visit
  usePageVisitTracking({
    pageType: 'category',
    categoryId: params.category,
    enabled: !!user
  });
  
  // ... existing code
}
```

## Challenge Types Added

### Daily Challenges:
- `visit_page` - Visit 2-4 different pages (10-20 RP)
- `visit_category` - Visit 1-2 category pages (15-25 RP)
- `play_specific_game` - Play 1-2 different game types (20-35 RP)

### Weekly Challenges:
- `visit_page` - Visit 5-10 different pages (50-80 RP)
- `visit_category` - Visit 3-6 category pages (60-100 RP)
- `play_specific_game` - Play 3-6 different game types (80-120 RP)

## RP Reward Structure

### Daily Challenges (Updated):
- **Practice Games**: 5-15 RP (LOWER - free games)
- **Competition Games**: 30-60 RP (HIGHER - paid games) ⭐
- **Page Visits**: 10-20 RP
- **Category Visits**: 15-25 RP
- **Specific Games**: 20-35 RP

### Weekly Challenges (Updated):
- **Practice Games**: 30-60 RP (LOWER - free games)
- **Competition Games**: 100-200 RP (HIGHER - paid games) ⭐
- **Win Competition**: 150-250 RP (HIGHEST - paid wins) ⭐⭐
- **Page Visits**: 50-80 RP
- **Category Visits**: 60-100 RP
- **Specific Games**: 80-120 RP

## Notes

- Tracking is automatic and silent (doesn't interrupt user experience)
- Only tracks authenticated users
- Prevents duplicate tracking (one visit per page per day)
- Challenges auto-regenerate daily/weekly with new values

