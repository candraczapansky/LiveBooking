import React from 'react';
import { useBusinessSettings } from '@/contexts/BusinessSettingsContext';

interface BusinessBrandProps {
  showLogo?: boolean;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const BusinessBrand: React.FC<BusinessBrandProps> = ({
  showLogo = true,
  showName = false,
  size = 'md',
  className = ''
}) => {
  const { businessSettings, isLoading } = useBusinessSettings();

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        {showLogo && (
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-6"></div>
        )}
      </div>
    );
  }

  const businessName = showName ? businessSettings?.businessName : '';
  const businessLogo = businessSettings?.businessLogo;

  const sizeClasses = {
    sm: {
      logo: 'h-6 w-6',
      text: 'text-sm',
      container: 'gap-2'
    },
    md: {
      logo: 'h-8 w-8',
      text: 'text-base',
      container: 'gap-3'
    },
    lg: {
      logo: 'h-12 w-12',
      text: 'text-lg',
      container: 'gap-4'
    },
    xl: {
      logo: 'h-16 w-16',
      text: 'text-xl',
      container: 'gap-5'
    },
    '2xl': {
      logo: 'h-24 w-24',
      text: 'text-2xl',
      container: 'gap-6'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      {showLogo && businessLogo && (
        <img
          src={businessLogo}
          alt={showName ? businessName : "Business logo"}
          className={`${currentSize.logo} object-contain`}
        />
      )}
      {showName && businessName && businessName.trim() !== '' && (
        <span className={`font-semibold ${currentSize.text}`}>
          {businessName}
        </span>
      )}
    </div>
  );
}; 