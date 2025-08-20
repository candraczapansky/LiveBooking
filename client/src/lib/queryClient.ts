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

// Always use relative URLs for API requests
// This ensures proper handling of both development and production environments

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Always use relative URLs
  const fullUrl = url.startsWith('/') ? url : `/${url}`;

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Handle 401 Unauthorized
    if (res.status === 401) {
      // Clear invalid auth state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Always use relative URLs
    const fullUrl = (queryKey[0] as string).startsWith('/') ? queryKey[0] as string : `/${queryKey[0]}`;

    try {
      const res = await fetch(fullUrl, {
        headers,
        credentials: "include",
      });

      // Handle 401 Unauthorized
      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        
        // Clear invalid auth state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
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
