/**
 * The mutation behind the inline status select, with an optimistic update:
 * the new status is written into the cached data immediately, so the UI
 * changes before the server has answered. If the server then rejects the
 * change, the cached data is put back and a toast explains what happened.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { toast } from "sonner";

import { api, type RouterOutputs } from "@/utils/trpc/api";

type ApplicationList = RouterOutputs["applications"]["list"];

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  const apiUtils = api.useUtils();

  // Without an input this key matches every cached `applications.list`
  // query, whatever filters it was loaded with.
  const listKey = getQueryKey(api.applications.list);

  return api.applications.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      // A refetch that is already in flight would overwrite the optimistic
      // value with old data when it lands, so cancel it first.
      await Promise.all([
        apiUtils.applications.list.cancel(),
        apiUtils.applications.byId.cancel({ id }),
      ]);

      // Remember what the cache held, in case the change has to be undone.
      const previousLists = queryClient.getQueriesData<ApplicationList>({
        queryKey: listKey,
      });
      const previousDetail = apiUtils.applications.byId.getData({ id });

      queryClient.setQueriesData<ApplicationList>(
        { queryKey: listKey },
        (list) =>
          list?.map((application) =>
            application.id === id ? { ...application, status } : application,
          ),
      );
      apiUtils.applications.byId.setData({ id }, (application) =>
        application ? { ...application, status } : application,
      );

      return { previousLists, previousDetail };
    },

    onError: (_error, { id }, context) => {
      // Roll back to the snapshot taken in `onMutate`.
      context?.previousLists.forEach(([key, list]) =>
        queryClient.setQueryData(key, list),
      );
      apiUtils.applications.byId.setData({ id }, context?.previousDetail);
      toast.error("Could not update the status. The change was undone.");
    },

    onSuccess: () => {
      toast.success("Status updated");
    },

    // Whether it worked or not, reload from the server so that the cache
    // matches the database (for example `submittedAt` and `updatedAt`).
    onSettled: (_data, _error, { id }) => {
      void apiUtils.applications.list.invalidate();
      void apiUtils.applications.byId.invalidate({ id });
      void apiUtils.dashboard.summary.invalidate();
    },
  });
}
