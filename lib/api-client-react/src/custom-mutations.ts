import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { getListReleaseRequestsQueryKey, getGetRecentReleaseRequestsQueryKey } from "./generated/api";

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
    },
  });
}
