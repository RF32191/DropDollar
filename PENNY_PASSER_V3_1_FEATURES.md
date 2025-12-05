# 🪙 PENNY PASSER v3.1 - NEW FEATURES ADDED

## ✅ **What's New:**

### **1. Timer in Top Right Corner** ⏱️
- Moved from center to top right
- Cleaner UI layout
- Better visibility

### **2. Double-Click Jump** 🦘
- **Single click:** Move 1 step (2.5 units forward, 4 units horizontal)
- **Double click (< 300ms):** JUMP 2 steps (5 units forward, 8 units horizontal!)
- Jump over cars in one leap
- Risk vs reward gameplay

### **3. Directional Arrows** ➡️⬅️⬆️
- Hover/move mouse to see where you'll move
- **Green arrow** shows movement direction
- Helps plan your move
- Shows distance (1 step vs 2 step jump)

### **4. Collectible Coins** 🪙💰
- Gold coins scattered on road
- Collect by moving over them
- **+50 points** per coin
- Coins stack on player penny!

### **5. Stacking Penny System** 📚
- Collect coins → Penny GROWS TALLER
- Each coin adds 0.3 units to height
- Visual stacking effect
- Shows how many coins you have

### **6. Extra Lives from Coins** ❤️💰
- Collected coins = Extra lives!
- Hit by car → Lose 1 stacked coin (if any)
- No coins → Lose 1 heart
- Coins protect your hearts!

---

## 🎮 **How It Works:**

### **Coin Collection:**
```
Before:     After:
  🪙        🪙
            🪙  ← Stack growing!
            🪙
```

### **Damage System:**
```
Player has: 3 hearts + 2 stacked coins

Hit by car #1:
- Lose top coin
- Still have: 3 hearts + 1 coin

Hit by car #2:
- Lose last coin
- Still have: 3 hearts

Hit by car #3:
- Lose 1 heart
- Now have: 2 hearts
```

### **Double-Click Jump:**
```
Normal Move (single click):
  🪙 → (one step) → 🪙

Jump (double-click < 300ms):
  🪙 → → (TWO steps) → → 🪙
  
Can jump over cars!
```

---

## 📊 **Implementation Details:**

### **Double-Click Detection:**
```typescript
const lastClickTime = useRef(0);
const now = Date.now();
const timeSinceLastClick = now - lastClickTime.current;
const isDoubleClick = timeSinceLastClick < 300;

if (isDoubleClick) {
  // Jump 2x distance
  distance *= 2;
}
```

### **Collectible Coin Generation:**
```typescript
// 10-15 coins scattered on road
const collectibleCoins: CollectibleCoin[] = [];
const numCoins = rng.integer(10, 15);

for (let i = 0; i < numCoins; i++) {
  const x = lanePositions[rng.integer(0, 4)]; // Lane center
  const y = rng.range(-10, 15); // Along road
  
  // Create coin mesh
  const coinGroup = new THREE.Group();
  // ... add geometry
  
  collectibleCoins.push({ x, y, mesh: coinGroup, collected: false });
}
```

### **Stacking Visualization:**
```typescript
// Update penny height based on collected coins
const stackHeight = collectedCoins * 0.3;
pennyRef.current.position.y = 0.8 + hopHeight + stackHeight;

// Add visual coin layers
for (let i = 0; i < collectedCoins; i++) {
  const coinLayer = new THREE.Mesh(coinGeometry, coinMaterial);
  coinLayer.position.y = 0.3 * (i + 1);
  pennyGroup.add(coinLayer);
}
```

### **Collision with Extra Lives:**
```typescript
if (collision) {
  if (collectedCoins > 0) {
    // Lose a coin instead of heart
    setCollectedCoins(prev => prev - 1);
    // Remove top coin from visual stack
    pennyGroup.children.pop();
  } else {
    // No coins, lose heart
    setHearts(prev => prev - 1);
  }
}
```

---

## 🎯 **Scoring Updates:**

**Base points:** Still 10 per step
**Speed bonus:** Still up to 100% extra
**NEW Coin bonus:** +50 points per coin collected
**Heart bonus:** Still 50 points per remaining heart
**Time bonus:** Still distance/time efficiency

**Example:**
- Move 30 steps: 300 points
- Collect 8 coins: 400 points
- 3 hearts left: 150 points
- **Total: 850+ points!**

---

## ✅ **Testing Plan:**

- [ ] Timer shows in top right
- [ ] Single click moves 1 step
- [ ] Double click (< 300ms) moves 2 steps
- [ ] Arrows show on hover/move
- [ ] Collectible coins render
- [ ] Coins can be collected
- [ ] Penny grows when coins collected
- [ ] Stacked coins visible
- [ ] Losing coins before hearts works
- [ ] Coin bonus adds to score
- [ ] All RNG still fair and seeded

---

**Status:** Ready to implement!

