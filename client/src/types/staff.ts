// Centralized type definitions for staff-related entities
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface StaffMember {
  id: number;
  userId: number;
  title: string;
  bio?: string;
  commissionType: 'commission' | 'hourly' | 'fixed';
  commissionRate: number;
  hourlyRate?: number;
  fixedRate?: number;
  photoUrl?: string;
  user: User;
}

export interface StaffSchedule {
  id?: number;
  staffId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  serviceCategories?: string[];
  startDate: string;
  endDate?: string;
  isBlocked?: boolean;
  createdAt?: string;
}

export interface CreateStaffData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title: string;
  bio?: string;
  commissionType: 'commission' | 'hourly' | 'fixed';
  commissionRate: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

// Form state types
export interface StaffFormState {
  isLoading: boolean;
  error?: string;
  data?: StaffMember[];
}

export interface ScheduleFormState {
  isLoading: boolean;
  error?: string;
  data?: StaffSchedule[];
}