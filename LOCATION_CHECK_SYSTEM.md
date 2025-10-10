# 🎯 LOCATION CHECK SYSTEM FOR FUTURE LISTINGS

## Overview
This system ensures all future listing pages have proper location verification hardcoded and integrated with the global location system.

## 🚀 Quick Start

### Method 1: LocationCheck Component (Recommended)
```tsx
import LocationCheck from '@/components/LocationCheck';

export default function YourListingPage() {
  return (
    <LocationCheck
      requireLocation={true}
      fallback={<LocationRequiredMessage />}
    >
      <YourListingContent />
    </LocationCheck>
  );
}
```

### Method 2: useLocationCheck Hook
```tsx
import { useLocationCheck } from '@/components/LocationCheck';

export default function YourListingPage() {
  const { isLocationVerified, canAccessListings } = useLocationCheck();
  
  if (!isLocationVerified) {
    return <LocationRequiredMessage />;
  }
  
  return <YourListingContent />;
}
```

### Method 3: Higher-Order Component
```tsx
import { withLocationCheck } from '@/components/LocationCheck';

const YourListingPage = withLocationCheck(
  function ListingContent() {
    return <YourListingContent />;
  },
  { requireLocation: true }
);
```

## 📋 Available Properties

### LocationCheck Component Props
- `requireLocation: boolean` - Whether location verification is required (default: true)
- `fallback: ReactNode` - What to show when location is not verified
- `children: ReactNode` - Content to show when location is verified

### useLocationCheck Hook Returns
- `isLocationVerified: boolean` - Whether location is currently verified
- `locationData: LocationData | null` - User's location information
- `locationStatus: 'unknown' | 'granted' | 'denied' | 'unavailable'` - Current status
- `isLoading: boolean` - Whether location check is in progress
- `canAccessListings: boolean` - Whether user can access listings
- `canAccessGames: boolean` - Whether user can access games
- `canAccessTournaments: boolean` - Whether user can access tournaments
- `canAccessHotSell: boolean` - Whether user can access hot-sell

## 🎮 Integration Examples

### Game Integration
```tsx
import { useLocationCheck } from '@/components/LocationCheck';

export default function GameListingPage() {
  const { canAccessGames } = useLocationCheck();
  
  const handlePlayGame = () => {
    if (!canAccessGames) {
      alert('Location verification required to play games');
      return;
    }
    // Start game
  };
  
  return (
    <button 
      onClick={handlePlayGame}
      disabled={!canAccessGames}
    >
      Play Game
    </button>
  );
}
```

### Tournament Integration
```tsx
import LocationCheck from '@/components/LocationCheck';

export default function TournamentListingPage() {
  return (
    <LocationCheck
      fallback={
        <div className="text-center p-8">
          <h2>Tournament Access Restricted</h2>
          <p>Please verify your location to participate in tournaments.</p>
        </div>
      }
    >
      <TournamentContent />
    </LocationCheck>
  );
}
```

### Hot-Sell Integration
```tsx
import { useLocationCheck } from '@/components/LocationCheck';

export default function HotSellListingPage() {
  const { canAccessHotSell, locationData } = useLocationCheck();
  
  return (
    <div>
      {canAccessHotSell && locationData && (
        <div className="bg-green-600 text-white p-2 rounded">
          ✅ Verified: {locationData.city}, {locationData.state}
        </div>
      )}
      <HotSellContent />
    </div>
  );
}
```

## 🔧 Hardcoded Features

### Automatic Integration
- All future listings automatically use the global location system
- No need to import or configure location guards
- Consistent behavior across all listing types

### 12-Hour Verification
- Users get 12 hours of uninterrupted access after verification
- Automatic re-verification prompts after expiry
- Seamless user experience

### State-Specific Messaging
- Automatic gaming compliance messages per state
- Clear indication of gaming availability
- Professional compliance messaging

## 📁 File Structure
```
src/
├── components/
│   └── LocationCheck.tsx          # Main location check component
├── templates/
│   └── FutureListingTemplate.tsx # Template for future listings
└── hooks/
    └── useGlobalLocation.ts       # Global location hook
```

## 🚨 Important Notes

1. **Always use LocationCheck** for new listing pages
2. **Don't use old location guards** (useGameLocationGuard, etc.)
3. **Test location verification** before deploying
4. **Use the template** as a starting point for new listings
5. **Location is required by default** - set `requireLocation={false}` to disable

## 🎯 Best Practices

1. **Wrap entire page content** with LocationCheck
2. **Provide meaningful fallback** messages
3. **Use the hook** for conditional rendering
4. **Test both verified and unverified states**
5. **Keep location checks simple** - let the system handle complexity

## 🔄 Migration Guide

### From Old System
```tsx
// OLD (Don't use)
import { useGameLocationGuard } from '@/hooks/useLocationGuard';

// NEW (Use this)
import { useLocationCheck } from '@/components/LocationCheck';
```

### From Manual Checks
```tsx
// OLD (Don't use)
if (locationGuard.canAccessGames()) {
  // Show content
}

// NEW (Use this)
const { canAccessGames } = useLocationCheck();
if (canAccessGames) {
  // Show content
}
```

This system ensures all future listings have consistent, reliable location verification integrated with the global location system.
