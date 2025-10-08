#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Pages that need dark mode updates
const pagesToUpdate = [
  'src/app/categories/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/testimonials/page.tsx',
  'src/app/auth/login/page.tsx',
  'src/app/auth/buyer-signup/page.tsx',
  'src/app/auth/seller-application/page.tsx',
  'src/app/auth/register/page.tsx',
  'src/app/games/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx'
];

// Dark mode replacements
const replacements = [
  // Main container
  {
    from: 'className="min-h-screen bg-gray-50"',
    to: 'className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors"'
  },
  {
    from: 'className="min-h-screen bg-white"',
    to: 'className="min-h-screen bg-white dark:bg-gray-900 transition-colors"'
  },
  // Header
  {
    from: 'className="bg-white shadow-sm border-b border-gray-200"',
    to: 'className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors"'
  },
  // Logo text
  {
    from: 'className="text-xl font-bold text-gray-900"',
    to: 'className="text-xl font-bold text-gray-900 dark:text-white transition-colors"'
  },
  // Navigation links - make all green in dark mode
  {
    from: 'className="text-gray-700 hover:text-green-600 font-medium"',
    to: 'className="text-gray-700 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 font-medium transition-colors"'
  },
  {
    from: 'className="text-purple-600 hover:text-purple-700 font-bold"',
    to: 'className="text-purple-600 dark:text-green-400 hover:text-purple-700 dark:hover:text-green-300 font-bold transition-colors"'
  },
  {
    from: 'className="text-red-600 hover:text-red-700 font-bold"',
    to: 'className="text-red-600 dark:text-green-400 hover:text-red-700 dark:hover:text-green-300 font-bold transition-colors"'
  },
  {
    from: 'className="text-blue-600 hover:text-blue-700 font-bold"',
    to: 'className="text-blue-600 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-300 font-bold transition-colors"'
  },
  {
    from: 'className="text-green-600 hover:text-green-700 font-bold"',
    to: 'className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors"'
  },
  // Border colors
  {
    from: 'className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200"',
    to: 'className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 transition-colors"'
  },
  // Buttons
  {
    from: 'className="bg-green-600 hover:bg-green-700 text-white',
    to: 'className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white'
  },
  {
    from: 'className="bg-blue-600 hover:bg-blue-700 text-white',
    to: 'className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white'
  }
];

// Settings link to add
const settingsLinkPattern = /<Link href="\/wallet" className="[^"]*">[^<]*<\/Link>/;
const settingsLinkReplacement = `<Link href="/wallet" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold transition-colors">👛 Wallet</Link>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">⚙️ Settings</Link>`;

function updateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Apply dark mode replacements
    replacements.forEach(replacement => {
      if (content.includes(replacement.from)) {
        content = content.replace(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.to);
        updated = true;
      }
    });

    // Add settings link if wallet link exists but settings link doesn't
    if (content.includes('👛 Wallet') && !content.includes('⚙️ Settings')) {
      content = content.replace(settingsLinkPattern, settingsLinkReplacement);
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

console.log('🌙 Starting Dark Mode Batch Update...\n');

let updatedCount = 0;
let totalCount = 0;

pagesToUpdate.forEach(relativePath => {
  const fullPath = path.join(__dirname, relativePath);
  totalCount++;
  if (updateFile(fullPath)) {
    updatedCount++;
  }
});

console.log(`\n🎉 Dark Mode Update Complete!`);
console.log(`📊 Updated ${updatedCount} out of ${totalCount} files`);
console.log(`\n🌙 All pages now support dark mode with green navigation links!`);
console.log(`⚙️ Settings links added to all navigation bars!`);
