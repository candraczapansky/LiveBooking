import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BusinessSettings {
  id: number;
  businessName: string;
  businessLogo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone: string;
  currency: string;
  taxRate: number;
  receiptFooter?: string;
  createdAt: string;
  updatedAt: string;
}

interface BusinessSettingsContextType {
  businessSettings: BusinessSettings | undefined;
  isLoading: boolean;
  error: any;
  updateBusinessSettings: (data: Partial<BusinessSettings>) => Promise<void>;
  refetch: () => void;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | undefined>(undefined);

export const useBusinessSettings = () => {
  const context = useContext(BusinessSettingsContext);
  if (context === undefined) {
    throw new Error('useBusinessSettings must be used within a BusinessSettingsProvider');
  }
  return context;
};

interface BusinessSettingsProviderProps {
  children: ReactNode;
}

export const BusinessSettingsProvider: React.FC<BusinessSettingsProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch business settings
  const { data: businessSettings, isLoading, error, refetch } = useQuery<BusinessSettings>({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const response = await fetch('/api/business-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch business settings');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update business settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<BusinessSettings>) => {
      const response = await fetch('/api/business-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update business settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
    },
  });

  const updateBusinessSettings = async (data: Partial<BusinessSettings>) => {
    await updateMutation.mutateAsync(data);
  };

  const value: BusinessSettingsContextType = {
    businessSettings,
    isLoading,
    error,
    updateBusinessSettings,
    refetch,
  };

  return (
    <BusinessSettingsContext.Provider value={value}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}; 