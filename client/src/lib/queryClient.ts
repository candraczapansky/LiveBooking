import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    try {
      const text = await res.text();
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: res.statusText };
    }

    // Prefer "error" key if present from our API, then message
    const message = (errorData.error || errorData.message || res.statusText);
    const error = new Error(message);
    (error as any).response = {
      status: res.status,
      data: errorData
    };
    throw error;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Cache for the correct API base URL
let cachedApiBaseUrl: string | null = null;

async function findCorrectApiUrl(): Promise<string> {
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  const isReplit = window.location.hostname.includes('replit.dev');
  
  if (isReplit) {
    // For Replit, we need to use the default URL without port specification
    // The Replit proxy will handle routing to the correct port
    const baseUrl = `https://${window.location.hostname}`;
    console.log('🔍 Replit detected, using base URL:', baseUrl);
    cachedApiBaseUrl = baseUrl;
    return baseUrl;
  }
  
  // For local development, use relative URLs
  console.log('🔍 Local development detected, using relative URLs');
  return '';
}

function withBaseUrl(url: string) {
  // For local development, use relative URLs to ensure proxy is used
  if (!window.location.hostname.includes('replit.dev')) {
    console.log('🔍 Local development detected, using relative URLs');
    if (url.startsWith('/')) {
      return url;
    }
    return url;
  }
  
  // For Replit, we need to find the correct port
  console.log('🔍 Replit detected, will find correct API URL');
  return url.startsWith('/') ? url : url; // We'll handle the base URL in the fetch call
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get user and token from localStorage for authentication
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add JWT token to Authorization header for authentication
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // For Replit, we need to find the correct API URL
  let fullUrl = url;
  if (window.location.hostname.includes('replit.dev')) {
    const baseUrl = await findCorrectApiUrl();
    fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
    console.log('🔍 Making API request to:', fullUrl);
  } else {
    fullUrl = withBaseUrl(url);
  }

  let res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If we get a 401, try to refresh the token and retry once
  if (res.status === 401) {
    console.log('Received 401, attempting to refresh token...');
    
    // Import the refreshToken function dynamically to avoid circular dependencies
    const { refreshToken } = await import('./auth-helper');
    const refreshSuccess = await refreshToken();
    
    if (refreshSuccess) {
      // Get the new token
      const newToken = localStorage.getItem('token');
      if (newToken) {
        // Update headers with new token
        headers["Authorization"] = `Bearer ${newToken}`;
        
        // Retry the request with the new token
        res = await fetch(fullUrl, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get user and token from localStorage for authentication
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const token = localStorage.getItem('token');
    
    const headers: Record<string, string> = {};
    
    // Add JWT token to Authorization header for authentication
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // For Replit, we need to find the correct API URL
    let fullUrl = queryKey[0] as string;
    if (window.location.hostname.includes('replit.dev')) {
      const baseUrl = await findCorrectApiUrl();
      fullUrl = (queryKey[0] as string).startsWith('/') ? `${baseUrl}${queryKey[0] as string}` : queryKey[0] as string;
      console.log('🔍 Making query request to:', fullUrl);
    } else {
      fullUrl = withBaseUrl(queryKey[0] as string);
    }

    let res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    // If we get a 401, try to refresh the token and retry once
    if (res.status === 401) {
      console.log('Query received 401, attempting to refresh token...');
      
      // Import the refreshToken function dynamically to avoid circular dependencies
      const { refreshToken } = await import('./auth-helper');
      const refreshSuccess = await refreshToken();
      
      if (refreshSuccess) {
        // Get the new token
        const newToken = localStorage.getItem('token');
        if (newToken) {
          // Update headers with new token
          headers["Authorization"] = `Bearer ${newToken}`;
          
          // Retry the request with the new token
          res = await fetch(fullUrl, {
            headers,
            credentials: "include",
          });
        }
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch when window gains focus
      staleTime: 5 * 60 * 1000, // 5 minutes - data becomes stale after 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
