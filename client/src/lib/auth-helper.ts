// Auth helper functions for managing authentication state

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  staffId?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

/**
 * Get current authentication state from localStorage
 */
export function getAuthState(): AuthState {
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  
  let user: User | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
    }
  }
  
  return {
    user,
    token,
    isAuthenticated: !!(user && token)
  };
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
  const { user, token } = getAuthState();
  return !!(user && token);
}

/**
 * Get current user data
 */
export function getCurrentUser(): User | null {
  const { user } = getAuthState();
  return user;
}

/**
 * Get current authentication token
 */
export function getAuthToken(): string | null {
  const { token } = getAuthState();
  return token;
}

/**
 * Login with default credentials (for development/testing)
 */
export async function loginWithDefaultCredentials(): Promise<boolean> {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123"
      }),
    });

    if (!response.ok) {
      console.error('Login failed:', response.status, response.statusText);
      return false;
    }

    const userData = await response.json();
    
    if (userData.success && userData.user) {
      // Store user data and token
      localStorage.setItem('user', JSON.stringify(userData.user));
      localStorage.setItem('token', userData.token);
      
      console.log('Successfully logged in with default credentials');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error during login:', error);
    return false;
  }
}

/**
 * Clear authentication data
 */
export function logout(): void {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('profilePicture');
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123"
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status, response.statusText);
      return false;
    }

    const userData = await response.json();
    
    if (userData.success && userData.user) {
      // Store fresh user data and token
      localStorage.setItem('user', JSON.stringify(userData.user));
      localStorage.setItem('token', userData.token);
      
      console.log('Successfully refreshed authentication token');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error during token refresh:', error);
    return false;
  }
}

/**
 * Ensure user is authenticated, login if needed (development only)
 */
export async function ensureAuthenticated(): Promise<boolean> {
  if (isAuthenticated()) {
    // Check if token is still valid by making a test request
    try {
      const response = await fetch("/api/locations", {
        headers: {
          "Authorization": `Bearer ${getAuthToken()}`
        }
      });
      
      if (response.status === 401) {
        console.log('Token expired, refreshing...');
        return await refreshToken();
      }
      
      return true;
    } catch (error) {
      console.log('Token validation failed, refreshing...');
      return await refreshToken();
    }
  }
  
  // In development mode, try to login with default credentials
  if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
    console.log('Development mode: Attempting to login with default credentials...');
    return await loginWithDefaultCredentials();
  }
  
  return false;
}

