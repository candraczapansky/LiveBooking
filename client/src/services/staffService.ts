import { apiRequest } from "@/lib/queryClient";

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
  user: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
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
}

export const staffService = {
  // Staff CRUD operations
  async getAllStaff(): Promise<StaffMember[]> {
    const response = await apiRequest("GET", "/api/staff");
    if (!response.ok) throw new Error("Failed to fetch staff");
    return response.json();
  },

  async createStaff(data: CreateStaffData): Promise<StaffMember> {
    // Step 1: Create user account
    const baseUsername = `${data.firstName.toLowerCase()}${data.lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now().toString().slice(-4);
    const username = `${baseUsername}${timestamp}`;
    const defaultPassword = `${data.firstName}123!`;
    
    const userData = {
      username,
      email: data.email,
      password: defaultPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || "",
      role: "staff",
    };

    const userResponse = await apiRequest("POST", "/api/register", userData);
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      throw new Error(errorData.error || "Failed to create user account");
    }

    const user = await userResponse.json();

    // Step 2: Create staff record
    const staffData = {
      userId: user.id,
      title: data.title,
      bio: data.bio || "",
      commissionType: data.commissionType,
      commissionRate: data.commissionRate / 100, // Convert percentage to decimal
      hourlyRate: data.commissionType === 'hourly' ? data.commissionRate : null,
      fixedRate: data.commissionType === 'fixed' ? data.commissionRate : null,
    };

    const staffResponse = await apiRequest("POST", "/api/staff", staffData);
    if (!staffResponse.ok) {
      const errorData = await staffResponse.json();
      throw new Error(errorData.error || "Failed to create staff member");
    }

    return staffResponse.json();
  },

  async deleteStaff(staffId: number): Promise<void> {
    const response = await apiRequest("DELETE", `/api/staff/${staffId}`);
    if (!response.ok) throw new Error("Failed to delete staff member");
  },

  // Schedule operations
  async getAllSchedules(): Promise<StaffSchedule[]> {
    const response = await apiRequest("GET", "/api/schedules");
    if (!response.ok) throw new Error("Failed to fetch schedules");
    return response.json();
  },

  async getStaffSchedules(staffId: number): Promise<StaffSchedule[]> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.filter(schedule => schedule.staffId === staffId);
  },

  async createSchedule(data: StaffSchedule): Promise<StaffSchedule> {
    const response = await apiRequest("POST", "/api/schedules", data);
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create schedule: ${errorData}`);
    }
    return response.json();
  },

  async updateSchedule(scheduleId: number, data: Partial<StaffSchedule>): Promise<StaffSchedule> {
    const response = await apiRequest("PUT", `/api/schedules/${scheduleId}`, data);
    if (!response.ok) throw new Error("Failed to update schedule");
    return response.json();
  },

  async deleteSchedule(scheduleId: number): Promise<void> {
    const response = await apiRequest("DELETE", `/api/schedules/${scheduleId}`);
    if (!response.ok) throw new Error("Failed to delete schedule");
  },
};

// Utility functions
export const getStaffFullName = (staff: StaffMember): string => {
  if (staff.user) {
    return `${staff.user.firstName || ''} ${staff.user.lastName || ''}`.trim() || 'Unknown Staff';
  }
  return 'Unknown Staff';
};

export const getStaffInitials = (staff: StaffMember): string => {
  if (staff.user) {
    const firstName = staff.user.firstName || '';
    const lastName = staff.user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'US';
  }
  return 'US';
};

export const formatCommissionRate = (staff: StaffMember): string => {
  if (staff.commissionType === 'commission') {
    return `${(staff.commissionRate * 100).toFixed(1)}%`;
  } else if (staff.commissionType === 'hourly') {
    return `$${staff.hourlyRate?.toFixed(2) || '0.00'}/hr`;
  } else {
    return `$${staff.fixedRate?.toLocaleString() || '0'}/year`;
  }
};