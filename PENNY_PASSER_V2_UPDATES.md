# 🪙 PENNY PASSER v2.0 - MAJOR UPDATE

## ✅ **What Changed:**

Complete redesign with better controls and visual design!

---

## 🎮 **NEW FEATURES:**

### **1. Click-to-Move Controls** 🖱️

**Old (v1.0):**
- ❌ Click or SPACE to move forward only
- ❌ No horizontal movement
- ❌ Frogger-style (one direction)

**New (v2.0):**
- ✅ **Click anywhere** on the road to move the penny!
- ✅ **Horizontal movement** - Penny moves to clicked lane
- ✅ **Vertical movement** - Penny moves forward to clicked position
- ✅ **Smart controls** - Can only move forward or sideways, never backward
- ✅ **Crosshair cursor** - Shows it's click-to-move

### **2. Wallet Obstacles** 💰

**Old (v1.0):**
- ❌ Hand obstacles with fingers
- ❌ Skin-tone colored

**New (v2.0):**
- ✅ **3D Wallet obstacles** - Brown leather wallets
- ✅ **Gold clasps** - Shiny metallic accents
- ✅ **Stitching details** - Realistic wallet appearance
- ✅ **Rotating animation** - Wallets spin slowly
- ✅ **Better theme** - Matches the "money game" aesthetic

### **3. Improved Movement System**

**Features:**
- Penny snaps to **lane centers** (no awkward positioning)
- **Distance-based scoring** - Rewards both horizontal and vertical movement
- **Speed bonus** - Fast moves = more points
- **Smooth animations** - Ease-out cubic for natural movement
- **Anti-spam** - Can't move while previous animation is in progress

---

## 🎯 **How It Works:**

### **Click-to-Move System:**

```typescript
// User clicks at position (x, z) on the road
const targetX = Math.round(intersectPoint.x / 4) * 4; // Snap to lane
const targetZ = Math.max(intersectPoint.z, currentZ + 1); // Only forward

// Calculate distance moved (both axes)
const distanceMoved = Math.abs(targetZ - startZ) + Math.abs(targetX - startX);

// Score based on distance
const basePoints = 10 * distanceMoved;
const speedBonus = Math.max(0, 1 - (timeSinceLastMove / 2000));
const finalPoints = basePoints * (1 + speedBonus);
```

### **Lane Snapping:**

- 5 lanes total (centered at -8, -4, 0, 4, 8)
- Click anywhere in a lane → Penny moves to lane center
- Makes movement predictable and fair

### **Forward-Only Restriction:**

```typescript
const targetZ = Math.max(intersectPoint.z, pennyRef.current.position.z + 1);
```

- Can't move backward (prevents exploits)
- Can stay in place (if you click behind the penny)
- Can move forward to any position ahead

---

## 💰 **Wallet Design:**

### **Visual Structure:**

```
┌─────────────────┐
│                 │  ← Brown leather body (1.5 x 0.2 x 1)
│   [===GOLD===]  │  ← Gold clasp (0.3 x 0.25 x 1.05)
│   | | | |      │  ← Stitching details (4 small lines)
└─────────────────┘
```

### **Materials:**

- **Wallet Body:**
  - Color: `0x8B4513` (Brown)
  - Metalness: 0.2
  - Roughness: 0.8 (leather texture)

- **Gold Clasp:**
  - Color: `0xFFD700` (Gold)
  - Metalness: 0.9
  - Roughness: 0.1 (shiny)

- **Stitching:**
  - Color: `0x654321` (Dark brown)
  - Small rectangular details

### **Animation:**
```typescript
wallet.mesh.rotation.y += 0.01; // Slow rotation
```

---

## 🔒 **Fair Gaming (Maintained):**

### **1. RNG Seeding** ✅

```typescript
class SeededRandom {
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    // Deterministic PRNG
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}
```

**Same seed = Same wallet patterns!**
- Competition mode: Fair for all players
- Practice mode: Random seed each game

### **2. Audit Logging** ✅

Every game logs:
- Score, accuracy, timing
- Move count, collisions, hearts
- Distance traveled (new metric!)
- RNG seed, competition ID

### **3. Anti-Cheat** ✅

**Checks for:**
- Move timing < 50ms (too fast)
- Move count > 100 (impossible)
- Suspicious patterns

**Penalty:** 50% score reduction

### **4. Competition Support** ✅

- `rngSeed` prop → Deterministic patterns
- `competitionId` prop → Tournament linking
- `gameMode` prop → Practice vs Competition

---

## 📊 **Scoring System:**

### **Base Points:**
```
10 points × distance moved
```

### **Speed Bonus:**
```
Up to 100% bonus for fast moves
speedBonus = max(0, 1 - timeSinceLastMove/2000)
finalPoints = basePoints × (1 + speedBonus)
```

### **End Bonuses:**
- **Heart Bonus:** 50 points × remaining hearts
- **Time Bonus:** (distance / timeUsed) × 10

### **Example Scores:**

**Cautious Player:**
- 20 distance, 3 hearts, 50s used
- Base: 200 points
- Heart: 150 points
- Time: 4 points
- **Total: 354 points**

**Aggressive Player:**
- 40 distance, 1 heart, 58s used
- Base: 400 points (with speed bonuses)
- Heart: 50 points
- Time: 7 points
- **Total: 457 points**

---

## 🎨 **Visual Improvements:**

### **Before (v1.0):**
- Hands with fingers (complex geometry)
- Skin-tone color (didn't fit theme)
- Static appearance

### **After (v2.0):**
- Wallets (simple, recognizable)
- Brown/gold colors (money theme)
- Rotating animation
- Stitching details for realism

### **UI Updates:**
- ✅ Crosshair cursor (shows it's clickable)
- ✅ Instructions: "Click anywhere to move"
- ✅ Distance tracker in HUD
- ✅ Updated version tag: v2.0

---

## 🎯 **Gameplay Strategy:**

### **Old Strategy (v1.0):**
1. Time your forward clicks
2. Watch for hand patterns
3. Stay alive

### **New Strategy (v2.0):**
1. **Survey the field** - Look ahead for safe paths
2. **Plan your route** - Click where you want to go
3. **Move quickly** - Fast moves = bonus points
4. **Lane switching** - Use horizontal movement to dodge
5. **Distance matters** - More distance = higher score

---

## 📱 **Controls:**

### **Input:**
- **Click** - Move penny to clicked position
- **No keyboard** - Pure mouse/touch controls

### **Movement Rules:**
- ✅ Can move to any lane (horizontally)
- ✅ Can move forward (vertically)
- ❌ Can't move backward
- ❌ Can't move while previous move is animating

### **Visual Feedback:**
- Cursor: Crosshair (shows clickable)
- Penny: Rotates continuously
- Collision: Flashes red
- Sound: Different tones for moves and collisions

---

## 🚀 **Technical Implementation:**

### **Raycasting for Click Detection:**

```typescript
const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

// Convert click to 3D position
raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

// Intersect with road plane (y=0)
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersectPoint = new THREE.Vector3();
raycasterRef.current.ray.intersectPlane(plane, intersectPoint);
```

### **Lane Snapping:**

```typescript
const targetX = Math.round(intersectPoint.x / 4) * 4;
// Rounds to nearest lane center (-8, -4, 0, 4, 8)
```

### **Smooth Animation:**

```typescript
const duration = 200; // ms
const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

pennyRef.current.position.x = startX + (targetX - startX) * easeProgress;
pennyRef.current.position.z = startZ + (targetZ - startZ) * easeProgress;
```

---

## ✅ **Testing Checklist:**

- ✅ Click moves penny to clicked position
- ✅ Penny snaps to lane centers
- ✅ Can't move backward
- ✅ Can move horizontally (lane switching)
- ✅ Collision detection works (penny + wallets)
- ✅ Hearts decrease on collision
- ✅ Score increases with distance
- ✅ Speed bonus applies
- ✅ Timer counts down
- ✅ Game ends at 0 hearts or 0 time
- ✅ RNG seeding is deterministic
- ✅ Audit logging works
- ✅ Anti-cheat triggers correctly
- ✅ Wallets render with 3D details
- ✅ Wallets rotate smoothly
- ✅ No memory leaks
- ✅ No console errors

---

## 🎉 **Summary:**

### **v1.0 → v2.0 Changes:**

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Movement | Forward only | Click-to-move (2D) |
| Controls | Click/SPACE | Mouse click |
| Obstacles | Hands | Wallets 💰 |
| Lanes | Can't change | Can switch lanes |
| Scoring | Forward distance | Total distance |
| Theme | Generic | Money-focused |
| Visuals | Basic | Detailed wallets |

### **What's Better:**

✅ **More intuitive** - Click where you want to go
✅ **More strategic** - Plan your path, dodge obstacles
✅ **Better theme** - Wallets fit the "money game" concept
✅ **More engaging** - 2D movement instead of 1D
✅ **Fairer** - Lane snapping prevents accidental deaths
✅ **Better visuals** - 3D wallets with gold accents

---

**Deployed to GitHub!** 🚀

**Version:** v2.0 - BUILD 20251204
**Status:** ✅ Complete and tested
**Next:** Vercel will auto-deploy in ~2 minutes

Clear your browser cache and try the new controls! 🪙🎮

