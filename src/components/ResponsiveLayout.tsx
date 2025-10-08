'use client';

import React from 'react';
import useDeviceDetection, { getResponsiveClasses } from '@/hooks/useDeviceDetection';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = '',
  mobileClassName = '',
  tabletClassName = '',
  desktopClassName = ''
}) => {
  const deviceInfo = useDeviceDetection();
  const responsiveClasses = getResponsiveClasses(deviceInfo);

  const getDeviceSpecificClass = () => {
    if (deviceInfo.isMobile && mobileClassName) return mobileClassName;
    if (deviceInfo.isTablet && tabletClassName) return tabletClassName;
    if (deviceInfo.isDesktop && desktopClassName) return desktopClassName;
    return '';
  };

  return (
    <div className={`${className} ${getDeviceSpecificClass()} ${responsiveClasses.container}`}>
      {children}
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  gap = 'md'
}) => {
  const deviceInfo = useDeviceDetection();
  const responsiveClasses = getResponsiveClasses(deviceInfo);
  
  const gapClass = {
    sm: 'gap-2 sm:gap-4',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  }[gap];

  return (
    <div className={`grid ${responsiveClasses.grid} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant: 'heading' | 'subheading' | 'body';
  className?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant,
  className = ''
}) => {
  const deviceInfo = useDeviceDetection();
  const responsiveClasses = getResponsiveClasses(deviceInfo);
  
  const textClass = responsiveClasses[variant];

  return (
    <div className={`${textClass} ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  children,
  isOpen,
  onClose,
  className = ''
}) => {
  const deviceInfo = useDeviceDetection();
  const responsiveClasses = getResponsiveClasses(deviceInfo);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className={`bg-white dark:bg-gray-800 rounded-2xl ${responsiveClasses.modal} ${className} relative max-w-full`}
        style={{
          maxWidth: deviceInfo.isMobile ? '95vw' : deviceInfo.isTablet ? '80vw' : '70vw'
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};

interface ResponsiveNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  children,
  className = ''
}) => {
  const deviceInfo = useDeviceDetection();

  return (
    <nav className={`${className} ${deviceInfo.isMobile ? 'px-2' : 'px-4 sm:px-6 lg:px-8'}`}>
      {deviceInfo.isMobile ? (
        <div className="flex flex-col space-y-2">
          {children}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {children}
        </div>
      )}
    </nav>
  );
};

export default ResponsiveLayout;
