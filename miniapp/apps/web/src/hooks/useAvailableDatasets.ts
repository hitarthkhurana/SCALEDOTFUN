"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface Dataset {
  dataset_id: number;
  funder_address: string;
  curator_address: string;
  file_url: string | null;
  task: string;
  annotations: number;
  minimum_annotations: number;
  cusdc_payout_per_annotation: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  allowed_countries: string[];
  file_type: "text" | "audio" | "image";
  filecoin_cid: string | null;
  on_chain_dataset_id: number | null;
}

export interface TaskCounts {
  audio: number;
  text: number;
  image: number;
}

interface UseAvailableDatasetsReturn {
  datasets: Dataset[];
  taskCounts: TaskCounts;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch available datasets for a user based on their country and annotation history
 * 
 * Returns datasets where:
 * - The dataset is active
 * - The user's country is in the allowed_countries array (or allowed_countries is empty)
 * - The user has not already annotated the dataset
 * 
 * @param userCountry - The user's country code (e.g., "AR", "US")
 * @param userAddress - The user's wallet address (to exclude already annotated datasets)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { datasets, taskCounts, loading } = useAvailableDatasets(user?.country, user?.address);
 *   
 *   return <div>Audio tasks: {taskCounts.audio}</div>;
 * }
 * ```
 */
export function useAvailableDatasets(
  userCountry: string | null | undefined,
  userAddress: string | null | undefined
): UseAvailableDatasetsReturn {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({
    audio: 0,
    text: 0,
    image: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDatasets = useCallback(async () => {
    console.log("[useAvailableDatasets] 🔄 Fetching datasets...", { userCountry, userAddress });
    
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Fetch all active datasets
      const { data, error: queryError } = await supabase
        .from("datasets")
        .select("*")
        .eq("active", true);

      if (queryError) {
        console.error("[useAvailableDatasets] ❌ Query error:", queryError);
        throw queryError;
      }

      console.log("[useAvailableDatasets] ✅ Fetched datasets from DB:", data?.length || 0);

      // Fetch datasets that user has already annotated (if user is logged in)
      let annotatedDatasetIds: Set<number> = new Set();
      if (userAddress) {
        console.log("[useAvailableDatasets] 🔍 Checking for user's existing annotations...");
        const { data: annotations, error: annotationsError } = await supabase
          .from("annotations")
          .select("dataset_id")
          .eq("user_address", userAddress.toLowerCase());

        if (annotationsError) {
          console.error("[useAvailableDatasets] ⚠️ Error fetching annotations:", annotationsError);
          // Don't throw - just proceed without filtering by annotations
        } else if (annotations) {
          annotatedDatasetIds = new Set(annotations.map(a => a.dataset_id));
          console.log("[useAvailableDatasets] 📝 User has already annotated:", annotatedDatasetIds.size, "datasets:", Array.from(annotatedDatasetIds));
        }
      }

      // Filter datasets based on user's country and annotation history
      const filteredDatasets = (data as Dataset[]).filter((dataset) => {
        // Check if user has already annotated this dataset
        if (annotatedDatasetIds.has(dataset.dataset_id)) {
          console.log(`[useAvailableDatasets] ✗ Dataset ${dataset.dataset_id} excluded (already annotated by user)`);
          return false;
        }

        // If no country restriction (empty array), allow all users
        if (!dataset.allowed_countries || dataset.allowed_countries.length === 0) {
          console.log(`[useAvailableDatasets] ✓ Dataset ${dataset.dataset_id} has no country restriction`);
          return true;
        }
        
        // If user has no country, exclude datasets with country restrictions
        if (!userCountry) {
          console.log(`[useAvailableDatasets] ✗ Dataset ${dataset.dataset_id} excluded (user has no country, dataset requires: ${dataset.allowed_countries.join(", ")})`);
          return false;
        }

        // Check if user's country is in the allowed list
        const isAllowed = dataset.allowed_countries.includes(userCountry);
        console.log(`[useAvailableDatasets] ${isAllowed ? "✓" : "✗"} Dataset ${dataset.dataset_id} ${isAllowed ? "allowed" : "excluded"} for country: ${userCountry} (allowed: ${dataset.allowed_countries.join(", ")})`);
        return isAllowed;
      });

      console.log("[useAvailableDatasets] 📊 Filtered datasets:", filteredDatasets.length, "available for user");

      setDatasets(filteredDatasets);

      // Count tasks by file type
      const counts: TaskCounts = {
        audio: 0,
        text: 0,
        image: 0,
      };

      filteredDatasets.forEach((dataset) => {
        if (dataset.file_type === "audio") {
          counts.audio++;
        } else if (dataset.file_type === "text") {
          counts.text++;
        } else if (dataset.file_type === "image") {
          counts.image++;
        }
      });

      console.log("[useAvailableDatasets] 📈 Task counts by type:", counts);
      setTaskCounts(counts);
    } catch (err) {
      console.error("[useAvailableDatasets] ❌ Failed to fetch datasets:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch datasets"));
    } finally {
      setLoading(false);
      console.log("[useAvailableDatasets] ✅ Fetch complete");
    }
  }, [userCountry, userAddress]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  return {
    datasets,
    taskCounts,
    loading,
    error,
    refetch: fetchDatasets,
  };
}

