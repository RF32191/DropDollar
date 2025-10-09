'use client';

import React from 'react';
import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: string;
  gradient?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'orange' | 'pink' | 'gray' | 'cyan';
  className?: string;
}

const gradientClasses = {
  blue: 'from-blue-600 via-blue-700 to-blue-800 dark:from-blue-800 dark:via-blue-900 dark:to-black',
  green: 'from-green-600 via-green-700 to-green-800 dark:from-green-800 dark:via-green-900 dark:to-black',
  purple: 'from-purple-600 via-purple-700 to-purple-800 dark:from-purple-800 dark:via-purple-900 dark:to-black',
  red: 'from-red-600 via-red-700 to-red-800 dark:from-red-800 dark:via-red-900 dark:to-black',
  yellow: 'from-yellow-600 via-yellow-700 to-yellow-800 dark:from-yellow-800 dark:via-yellow-900 dark:to-black',
  orange: 'from-orange-600 via-orange-700 to-orange-800 dark:from-orange-800 dark:via-orange-900 dark:to-black',
  pink: 'from-pink-600 via-pink-700 to-pink-800 dark:from-pink-800 dark:via-pink-900 dark:to-black',
  gray: 'from-gray-600 via-gray-700 to-gray-800 dark:from-gray-800 dark:via-gray-900 dark:to-black',
  cyan: 'from-cyan-600 via-cyan-700 to-cyan-800 dark:from-cyan-800 dark:via-cyan-900 dark:to-black'
};

export default function PageLayout({ 
  children, 
  title, 
  subtitle, 
  icon, 
  gradient = 'blue',
  className = '' 
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 transition-colors">
      {/* Hero Header */}
      {title && (
        <section className={`relative bg-gradient-to-br ${gradientClasses[gradient]} py-16 overflow-hidden`}>
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-20 right-20 w-24 h-24 bg-white/5 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-10 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-xl animate-pulse delay-2000"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-8">
                {icon && (
                  <div className="text-6xl mb-4">
                    {icon}
                  </div>
                )}
                <h1 className="text-4xl md:text-6xl font-black mb-4">
                  <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent drop-shadow-2xl">
                    {title}
                  </span>
                </h1>
                {subtitle && (
                  <p className="text-xl md:text-2xl text-gray-200 font-medium tracking-wide max-w-4xl mx-auto">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className={`${className}`}>
        {children}
      </main>
    </div>
  );
}
