'use client';

import React from 'react';
import Link from 'next/link';

interface CategoryPageProps {
  categoryId: string;
  categoryIcon: React.ReactNode;
}

export default function CategoryPage({ categoryId, categoryIcon }: CategoryPageProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              {categoryIcon} {categoryId.toUpperCase()}
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-pink-500 mx-auto rounded-full animate-pulse mb-6"></div>
          <p className="text-xl text-gray-300">
            Category page for {categoryId} - Coming soon!
          </p>
        </div>
        
        <div className="text-center">
          <Link 
            href="/categories" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
          >
            ← Back to Categories
          </Link>
        </div>
      </div>
    </div>
  );
}