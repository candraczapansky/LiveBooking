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
    
    const error = new Error(errorData.message || res.statusText);
    (error as any).response = {
      status: res.status,
      data: errorData
    };
    throw error;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function withBaseUrl(url: string) {
  // Always use relative URLs for API calls to ensure proxy is used
  // This ensures that API calls go through the Vite proxy to the local server
  if (url.startsWith('/')) {
    return url;
  }
  
  // If the URL doesn't start with '/', it's already a full URL
  return url;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get user from localStorage for authentication
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add user ID to headers for authentication
  if (user?.id) {
    headers["x-user-id"] = user.id.toString();
  }

  const res = await fetch(withBaseUrl(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get user from localStorage for authentication
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const headers: Record<string, string> = {};
    
    // Add user ID to headers for authentication
    if (user?.id) {
      headers["x-user-id"] = user.id.toString();
    }

    const res = await fetch(withBaseUrl(queryKey[0] as string), {
      headers,
      credentials: "include",
    });

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
