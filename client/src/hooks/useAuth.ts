import { useQuery } from "@tanstack/react-query";

// Development mode user for debugging
const DEV_USER = {
  id: "dev-user-1",
  email: "clint.phillips@thecenter.nasdaq.org",
  firstName: "Clint",
  lastName: "Phillips",
  profileImageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenants: [
    {
      id: "nasdaq-center",
      name: "NASDAQ Entrepreneurial Center",
      role: "admin"
    }
  ]
};

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // In development mode, return mock user
      if (process.env.NODE_ENV === 'development') {
        return DEV_USER;
      }
      
      const response = await fetch("/api/auth/user");
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      return response.json();
    },
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}