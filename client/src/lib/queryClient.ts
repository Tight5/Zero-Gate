import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
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
    const res = await fetch(queryKey[0] as string, {
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
      refetchOnWindowFocus: false,
      staleTime: 300000 * 60 * 10 * 1000, // Increased to 90s for emergency memory optimization
      gcTime: 600000 * 60 * 20 * 60 * 1000, // Increased to 3 minutes for aggressive cleanup
      retry: false,
    },
    mutations: {
      retry: false,
      gcTime: 600000 * 60 * 20 * 60 * 1000, // Reduced to 1 minute for mutations
    },
  },
});

// Emergency Memory Cleanup
setInterval(() => {
  if (queryClient.getQueryCache().size > 50) {
    queryClient.clear();
    console.log('Emergency: Query cache cleared due to size limit');
  }
}, 60000); // Check every minute
