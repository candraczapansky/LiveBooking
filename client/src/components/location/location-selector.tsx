import React from 'react';
import { useLocation } from '@/contexts/LocationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Star } from 'lucide-react';

interface LocationSelectorProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'compact';
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  className = '', 
  showLabel = true,
  variant = 'default'
}) => {
  const { selectedLocation, setSelectedLocation, locations, isLoading, defaultLocation } = useLocation();

  // Debug logging
  console.log('LocationSelector: isLoading:', isLoading, 'locations count:', locations.length);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading locations...</span>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">No locations available</span>
      </div>
    );
  }

  if (locations.length === 1) {
    const location = locations[0];
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium">{location.name}</span>
        {location.isDefault && (
          <Badge variant="outline" className="text-xs">
            <Star className="h-3 w-3 mr-1" />
            Default
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <>
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Location:</span>
        </>
      )}
      
      <Select
        value={selectedLocation?.id?.toString() || ''}
        onValueChange={(value) => {
          const location = locations.find(loc => loc.id.toString() === value);
          setSelectedLocation(location || null);
        }}
      >
        <SelectTrigger className={`${variant === 'compact' ? 'h-8 text-sm' : 'h-9'}`}>
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          {locations
            .filter(location => location.isActive)
            .map((location) => (
              <SelectItem key={location.id} value={location.id.toString()}>
                <div className="flex items-center gap-2">
                  <span>{location.name}</span>
                  {location.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LocationSelector; 