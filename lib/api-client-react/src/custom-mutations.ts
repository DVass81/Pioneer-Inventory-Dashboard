import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { getListReleaseRequestsQueryKey, getGetRecentReleaseRequestsQueryKey, getGetInventoryItemQueryKey, getListInventoryQueryKey, getGetInventorySummaryQueryKey } from "./generated/api";

export type RequestStatus = "pending" | "approved" | "completed" | "rejected";

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: RequestStatus }) => {
      return customFetch(`/api/release-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListReleaseRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRecentReleaseRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount, notes }: { id: number; amount: number; notes?: string }) => {
      return customFetch(`/api/inventory/${id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ amount, notes }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["stock-movements", variables.id] });
    },
  });
}

export function useUpdateThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, threshold }: { id: number; threshold: number | null }) => {
      return customFetch(`/api/inventory/${id}/threshold`, {
        method: "PATCH",
        body: JSON.stringify({ threshold }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
    },
  });
}

export function useStockMovements(itemId: number) {
  return useQuery({
    queryKey: ["stock-movements", itemId],
    queryFn: async () => {
      const res = await customFetch(`/api/inventory/${itemId}/movements`);
      return res as Array<{
        id: number;
        inventoryItemId: number;
        changeAmount: number;
        stockAfter: number;
        reason: string;
        releaseRequestId: number | null;
        notes: string | null;
        createdAt: string;
      }>;
    },
    enabled: !!itemId,
  });
}
