/**
 * Shared pieces for changing a letter (a row of the applications <->
 * recommenders join). A letter is shown in two places, on its application's
 * page and on its recommender's page, so both caches have to be kept right.
 */

"use client";

import { toast } from "sonner";

import { api } from "@/utils/trpc/api";

/** Enough of a letter to know which cached queries show it. */
export type LetterRef = {
  id: string;
  applicationId: string;
  recommenderId: string;
};

/** Marks every query that shows this letter (or counts it) as out of date. */
export function useInvalidateLetter() {
  const apiUtils = api.useUtils();

  return ({ applicationId, recommenderId }: Omit<LetterRef, "id">) =>
    Promise.all([
      apiUtils.applications.byId.invalidate({ id: applicationId }),
      apiUtils.applications.list.invalidate(),
      apiUtils.recommenders.byId.invalidate({ id: recommenderId }),
      apiUtils.recommenders.list.invalidate(),
      apiUtils.dashboard.summary.invalidate(),
    ]);
}

/**
 * The mutation behind the inline letter status select, with an optimistic
 * update: the new status is written into both cached pages immediately and
 * put back if the server rejects the change.
 */
export function useUpdateLetterStatus(letter: LetterRef) {
  const apiUtils = api.useUtils();
  const invalidateLetter = useInvalidateLetter();
  const application = { id: letter.applicationId };
  const recommender = { id: letter.recommenderId };

  return api.recommendations.update.useMutation({
    onMutate: async ({ status }) => {
      if (!status) return;

      // Stop refetches that would overwrite the optimistic value.
      await Promise.all([
        apiUtils.applications.byId.cancel(application),
        apiUtils.recommenders.byId.cancel(recommender),
      ]);

      // Remember what the cache held, in case the change has to be undone.
      const previousApplication =
        apiUtils.applications.byId.getData(application);
      const previousRecommender =
        apiUtils.recommenders.byId.getData(recommender);

      apiUtils.applications.byId.setData(
        application,
        (page) =>
          page && {
            ...page,
            letters: page.letters.map((row) =>
              row.id === letter.id ? { ...row, status } : row,
            ),
          },
      );
      apiUtils.recommenders.byId.setData(
        recommender,
        (page) =>
          page && {
            ...page,
            letters: page.letters.map((row) =>
              row.id === letter.id ? { ...row, status } : row,
            ),
          },
      );

      return { previousApplication, previousRecommender };
    },

    onError: (_error, _input, context) => {
      if (context) {
        apiUtils.applications.byId.setData(
          application,
          context.previousApplication,
        );
        apiUtils.recommenders.byId.setData(
          recommender,
          context.previousRecommender,
        );
      }
      toast.error("Could not update the letter. The change was undone.");
    },

    onSuccess: () => {
      toast.success("Letter updated");
    },

    // Reload from the server either way, e.g. for the new `submittedAt`.
    onSettled: () => void invalidateLetter(letter),
  });
}
