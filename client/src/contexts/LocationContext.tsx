import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthProvider';
import { useQuery } from '@tanstack/react-query';

type Location = {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  businessHours?: string;
  createdAt: string;
  updatedAt: string;
};

type LocationContextType = {
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  locations: Location[];
  isLoading: boolean;
  defaultLocation: Location | null;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

type LocationProviderProps = {
  children: ReactNode;
};

export const LocationProvider = ({ children }: LocationProviderProps) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Fetch locations only when authenticated to avoid 401-driven redirect loops
  const { isAuthenticated } = useContext(AuthContext);
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Ensure refetch on first mount after login
    refetchOnWindowFocus: true, // Refetch when window gains focus
    queryFn: async () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Bypass potential 304 cached responses on initial load
      const res = await fetch(`/api/locations?_ts=${Date.now()}`, {
        headers,
        credentials: 'include',
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      if (!res.ok) {
        let message = res.statusText;
        try {
          const text = await res.text();
          const json = JSON.parse(text);
          message = (json.error || json.message || message);
        } catch {}
        const error: any = new Error(message);
        error.response = { status: res.status };
        throw error;
      }

      return await res.json();
    },
  });

  // Debug logging
  useEffect(() => {
    console.log('LocationContext: locations updated:', locations.length, 'locations');
    if (locations.length > 0) {
      console.log('LocationContext: sample location:', locations[0]);
    }
  }, [locations]);

  // Find default location
  const defaultLocation = locations.find(location => location.isDefault) || null;

  // Set default location as selected if no location is selected
  useEffect(() => {
    if (!selectedLocation && defaultLocation) {
      setSelectedLocation(defaultLocation);
    }
  }, [selectedLocation, defaultLocation]);

  // If no default location exists but we have locations, select the first active one
  useEffect(() => {
    if (!selectedLocation && locations.length > 0 && !defaultLocation) {
      const firstActiveLocation = locations.find(location => location.isActive);
      if (firstActiveLocation) {
        setSelectedLocation(firstActiveLocation);
      }
    }
  }, [selectedLocation, locations, defaultLocation]);

  const value: LocationContextType = {
    selectedLocation,
    setSelectedLocation,
    locations,
    isLoading,
    defaultLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}; 