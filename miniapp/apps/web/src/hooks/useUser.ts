"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { createClient } from "@/utils/supabase/client";

export interface User {
  address: string;
  cusdc_balance: number;
  gender: string | null;
  country: string | null;
  age: number | null;
  verified: boolean;
  streak: number;
  total_earnings: number;
  created_at: string;
  updated_at: string;
}

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the current user from Supabase
 * 
 * Automatically fetches user data based on the connected wallet address.
 * Returns null if no wallet is connected or user doesn't exist.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading, error, refetch } = useUser();
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!user) return <div>Please connect wallet</div>;
 * 
 *   return <div>Balance: {user.cusdc_balance}</div>;
 * }
 * ```
 */
export function useUser(): UseUserReturn {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    if (!address || !isConnected) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Normalize address to lowercase for case-insensitive comparison
      const normalizedAddress = address.toLowerCase();

      const { data, error: queryError } = await supabase
        .from("users")
        .select("*")
        .eq("address", normalizedAddress)
        .single();

      if (queryError) {
        // PGRST116 is "not found" error - user doesn't exist yet
        if (queryError.code === "PGRST116") {
          console.log("User not found in database:", normalizedAddress);
          setUser(null);
        } else {
          throw queryError;
        }
      } else {
        setUser(data as User);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch user"));
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}

