'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, ChevronDown } from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  shortLabel?: string;
  children?: NavigationItem[];
}

interface ResponsiveNavigationProps {
  items: NavigationItem[];
  className?: string;
  logo?: React.ReactNode;
  userMenu?: React.ReactNode;
}

export default function ResponsiveNavigation({ 
  items, 
  className = '', 
  logo,
  userMenu 
}: ResponsiveNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [visibleItems, setVisibleItems] = useState<NavigationItem[]>([]);
  const [hiddenItems, setHiddenItems] = useState<NavigationItem[]>([]);

  // Detect screen size
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Calculate visible items based on screen size
  useEffect(() => {
    const calculateVisibleItems = () => {
      const containerWidth = window.innerWidth;
      const logoWidth = logo ? 120 : 0;
      const userMenuWidth = userMenu ? 100 : 0;
      const availableWidth = containerWidth - logoWidth - userMenuWidth - 100; // padding
      
      let totalWidth = 0;
      const visible: NavigationItem[] = [];
      const hidden: NavigationItem[] = [];
      
      // Estimate item widths based on screen size
      const getItemWidth = (item: NavigationItem) => {
        const baseWidth = item.shortLabel ? 60 : 80;
        const textWidth = item.label.length * 8;
        return baseWidth + textWidth + 32; // padding
      };

      for (const item of items) {
        const itemWidth = getItemWidth(item);
        if (totalWidth + itemWidth <= availableWidth) {
          visible.push(item);
          totalWidth += itemWidth;
        } else {
          hidden.push(item);
        }
      }

      setVisibleItems(visible);
      setHiddenItems(hidden);
    };

    if (screenSize !== 'mobile') {
      calculateVisibleItems();
    } else {
      setVisibleItems([]);
      setHiddenItems(items);
    }
  }, [screenSize, items, logo, userMenu]);

  // Mobile Navigation with Row-based Layout
  if (screenSize === 'mobile') {
    return (
      <nav className={`bg-white border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row - Logo and Menu Button */}
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            {logo && (
              <div className="flex-shrink-0">
                {logo}
              </div>
            )}

            {/* Mobile menu button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    {logo}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                  
                  <nav className="flex-1">
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item.id}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => setIsOpen(false)}
                          >
                            {item.icon && <span className="mr-3">{item.icon}</span>}
                            {item.label}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  
                  {userMenu && (
                    <div className="mt-auto pt-4 border-t">
                      {userMenu}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Bottom Row - Quick Access Navigation */}
          <div className="pb-4">
            <div className="flex overflow-x-auto space-x-2 pb-2">
              {items.slice(0, 6).map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-10 px-3 text-xs"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel || item.label.split(' ')[0]}</span>
                </Button>
              ))}
              {items.length > 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-10 px-3 text-xs"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="mr-1">+</span>
                  More
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Desktop/Tablet Navigation
  return (
    <nav className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          {logo && (
            <div className="flex-shrink-0">
              {logo}
            </div>
          )}

          {/* Navigation Items */}
          <div className="flex items-center space-x-1 flex-1 justify-center">
            {/* Visible Items */}
            <div className="flex items-center space-x-1">
              {visibleItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className="px-3 py-2 text-sm font-medium"
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {screenSize === 'tablet' && item.shortLabel ? item.shortLabel : item.label}
                </Button>
              ))}
            </div>

            {/* More Menu (if there are hidden items) */}
            {hiddenItems.length > 0 && (
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-3 py-2 text-sm font-medium"
                >
                  More
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    {hiddenItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full justify-start px-4 py-2 text-sm"
                      >
                        {item.icon && <span className="mr-3">{item.icon}</span>}
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          {userMenu && (
            <div className="flex-shrink-0">
              {userMenu}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// Multi-row navigation for when there are many items
export function MultiRowNavigation({ 
  items, 
  className = '', 
  logo,
  userMenu,
  maxItemsPerRow = 6 
}: ResponsiveNavigationProps & { maxItemsPerRow?: number }) {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Group items into rows
  const groupItemsIntoRows = (items: NavigationItem[]) => {
    const rows: NavigationItem[][] = [];
    for (let i = 0; i < items.length; i += maxItemsPerRow) {
      rows.push(items.slice(i, i + maxItemsPerRow));
    }
    return rows;
  };

  const itemRows = groupItemsIntoRows(items);

  if (screenSize === 'mobile') {
    return (
      <nav className={`bg-white border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {logo && <div className="flex-shrink-0">{logo}</div>}
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    {logo}
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                  
                  <nav className="flex-1">
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item.id}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12"
                            onClick={() => setIsOpen(false)}
                          >
                            {item.icon && <span className="mr-3">{item.icon}</span>}
                            {item.label}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  
                  {userMenu && (
                    <div className="mt-auto pt-4 border-t">
                      {userMenu}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-16 py-2">
          {/* Logo */}
          {logo && (
            <div className="flex-shrink-0 self-start pt-2">
              {logo}
            </div>
          )}

          {/* Multi-row Navigation */}
          <div className="flex-1 flex flex-col items-center space-y-2">
            {itemRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center space-x-1">
                {row.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    className="px-3 py-2 text-sm font-medium"
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {screenSize === 'tablet' && item.shortLabel ? item.shortLabel : item.label}
                  </Button>
                ))}
              </div>
            ))}
          </div>

          {/* User Menu */}
          {userMenu && (
            <div className="flex-shrink-0 self-start pt-2">
              {userMenu}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
