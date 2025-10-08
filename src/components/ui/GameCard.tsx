'use client';

import React from 'react';
import { ReactNode } from 'react';

interface GameCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean | 'cyan' | 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'orange' | 'pink' | 'gray';
  padding?: 'sm' | 'md' | 'lg';
}

export default function GameCard({ 
  children, 
  className = '', 
  hover = true, 
  gradient = false,
  padding = 'md'
}: GameCardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const gradientClasses = {
    cyan: 'bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700',
    blue: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700',
    green: 'bg-gradient-to-br from-green-500 via-green-600 to-green-700',
    purple: 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700',
    red: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700',
    yellow: 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700',
    orange: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700',
    pink: 'bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700',
    gray: 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700'
  };

  const getBackgroundClasses = () => {
    if (typeof gradient === 'string' && gradient in gradientClasses) {
      return gradientClasses[gradient as keyof typeof gradientClasses];
    }
    if (gradient === true) {
      return 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900';
    }
    return 'bg-white dark:bg-gray-800';
  };

  const baseClasses = `
    ${getBackgroundClasses()}
    rounded-2xl 
    shadow-lg 
    border 
    border-gray-200 
    dark:border-gray-700 
    transition-all 
    duration-300
    ${hover ? 'hover:shadow-xl hover:shadow-gray-500/10 dark:hover:shadow-gray-900/20 hover:-translate-y-1' : ''}
    ${paddingClasses[padding]}
    ${className}
  `;

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
}
