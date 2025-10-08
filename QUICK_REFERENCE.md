# 🚀 Quick Reference - Dollar Drop Development

## 📋 **COMMON COMMANDS**

### **Development**
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run start        # Start production server locally
./update-site.sh     # Build and package for GoDaddy
```

### **Git Commands**
```bash
git add .                    # Stage all changes
git commit -m "message"      # Commit changes
git status                   # Check status
git log --oneline           # View commit history
```

## 📁 **KEY FILES TO EDIT**

### **Games**
- `src/components/games/MultiTargetGame.tsx` - Multi-Target Reaction game
- `src/components/games/FallingObjectGame.tsx` - Falling Objects game
- `src/components/games/ColorSequenceGame.tsx` - Color Sequence game
- `src/app/games/page.tsx` - Games page layout

### **Tournaments**
- `src/app/hot-sell/page.tsx` - Tournament page with prizes
- `src/components/games/GameEntryFlow.tsx` - Tournament entry system

### **Site Content**
- `src/app/page.tsx` - Homepage
- `src/app/how-it-works/page.tsx` - How it works page
- `src/components/layout/Header.tsx` - Navigation
- `src/components/layout/Footer.tsx` - Footer

### **Styling**
- `src/app/globals.css` - Global styles
- `tailwind.config.js` - Tailwind configuration

### **Configuration**
- `next.config.js` - Next.js configuration
- `package.json` - Dependencies and scripts

## 🎯 **QUICK EDITS**

### **Change Tournament Prizes**
Edit `src/app/hot-sell/page.tsx`:
```javascript
const tournaments = [
  {
    id: 'micro-10',
    name: '$10 Micro Tournament',
    prize: 10,  // Change this number
    // ...
  }
];
```

### **Update Homepage Text**
Edit `src/app/page.tsx`:
```jsx
<h1>Your New Title</h1>
<p>Your new description</p>
```

### **Add New Game**
1. Create `src/components/games/YourGame.tsx`
2. Add to `src/app/games/page.tsx`
3. Update game lists in other components

### **Change Colors/Styling**
Edit Tailwind classes in any `.tsx` file:
```jsx
<div className="bg-blue-500 text-white">  // Change colors
```

## 🔄 **UPDATE WORKFLOW**

### **Quick Update (5 min)**
1. Edit files
2. `npm run dev` (test locally)
3. `./update-site.sh` (build package)
4. Upload to GoDaddy
5. Test live site

### **Major Update (15-30 min)**
1. `git checkout -b feature-name` (create branch)
2. Make changes
3. `npm run dev` (test thoroughly)
4. `npm run build` (test production build)
5. `git add . && git commit -m "description"`
6. `git checkout main && git merge feature-name`
7. `./update-site.sh`
8. Upload and test

## 🚨 **EMERGENCY FIXES**

### **Site Down**
1. Check GoDaddy hosting status
2. Verify files in `public_html`
3. Check `.htaccess` file exists
4. Re-upload deployment package

### **Games Not Working**
1. Check browser console (F12)
2. Verify `_next/` folder uploaded
3. Clear browser cache
4. Test in different browser

### **Quick Text Fix**
1. GoDaddy File Manager
2. Edit file directly
3. Save changes (live immediately)

## 📊 **MONITORING**

### **Check Site Performance**
- Google PageSpeed Insights
- GTmetrix
- Browser dev tools (F12 → Network)

### **Check for Errors**
- Browser console (F12 → Console)
- GoDaddy error logs (cPanel → Error Logs)

## 📞 **SUPPORT CONTACTS**

- **GoDaddy Support:** 1-480-505-8877
- **GoDaddy Help:** [godaddy.com/help](https://godaddy.com/help)

## 🎯 **FILE LOCATIONS**

### **Your Mac**
- Project: `/Users/ryanjoshuafermoselle/Desktop/CryptoMarket/`
- Deployment package: `dollar-drop-godaddy-deployment.zip`

### **GoDaddy Server**
- Website files: `public_html/`
- Main entry: `public_html/index.html`
- Assets: `public_html/_next/`

---

## 🚀 **READY TO EDIT!**

Your site is fully editable with professional development tools. Make changes locally, test thoroughly, then deploy with confidence!


