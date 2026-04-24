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

export function useAddInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      category: string;
      product: string;
      unit: string;
      thickness?: string;
      sheetSize?: string;
      weightPerSheet?: number | null;
      currentStock?: number;
      lowStockThreshold?: number | null;
    }) => {
      return customFetch("/api/inventory", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
    },
  });
}

export function useEditInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: number;
      category?: string;
      product?: string;
      unit?: string;
      thickness?: string;
      sheetSize?: string;
      weightPerSheet?: number | null;
      lowStockThreshold?: number | null;
    }) => {
      return customFetch(`/api/inventory/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async (data: { fromName: string; fromEmail: string; subject: string; message: string }) => {
      return customFetch("/api/email/compose", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  });
}

export function useResendRequestEmail() {
  return useMutation({
    mutationFn: async (requestId: number) => {
      return customFetch(`/api/email/resend/${requestId}`, { method: "POST" });
    },
  });
}
