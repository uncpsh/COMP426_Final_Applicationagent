/**
 * (P1) The recommender portal: the letters one recommender has been asked
 * for, each with a button to mark it as submitted.
 *
 * This is a Client Component. It reads through the public `portal.byToken`
 * query and writes through `portal.markSubmitted`; both take the token from
 * the address, because the visitor is not signed in.
 */

"use client";

import { CircleCheck, Loader2Icon, Mail, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { DeadlineText } from "@/components/deadline-text";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type Letter = RouterOutputs["portal"]["byToken"]["letters"][number];

// The token is wrong, or the applicant switched the link off or replaced
// it. Asking again cannot change that, so these errors are not retried.
const INACTIVE_CODES = ["NOT_FOUND", "BAD_REQUEST"];

type PortalPageProps = { token: string };

export default function PortalPage({ token }: PortalPageProps) {
  const {
    data: portal,
    isPending,
    error,
    refetch,
  } = api.portal.byToken.useQuery(
    { token },
    {
      retry: (failureCount, failure) =>
        !INACTIVE_CODES.includes(failure.data?.code ?? "") && failureCount < 2,
    },
  );

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-4">
          <Brand />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {isPending ? (
          <div
            className="grid gap-3"
            aria-busy="true"
            aria-label="Loading letters"
          >
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-4 h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : error ? (
          INACTIVE_CODES.includes(error.data?.code ?? "") ? (
            <EmptyState
              icon={Unlink}
              title="This link is not active"
              description="It may have been turned off or replaced. Ask the applicant to send you a new link."
            />
          ) : (
            <ErrorState
              title="Could not load the letters"
              onRetry={() => void refetch()}
            />
          )
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">
              Letters for {portal.applicantName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Hello {portal.recommenderName}. These are the recommendation
              letters {portal.applicantName} has asked you for. Once you have
              sent one, mark it here so they know.
            </p>

            {portal.letters.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={Mail}
                  title="No letters requested yet"
                  description={`When ${portal.applicantName} asks you for a letter, it will appear here.`}
                />
              </div>
            ) : (
              <>
                <ul className="mt-6 grid gap-3">
                  {portal.letters.map((letter) => (
                    <PortalLetter
                      key={letter.id}
                      token={token}
                      letter={letter}
                    />
                  ))}
                </ul>
                <p className="text-muted-foreground mt-4 text-xs">
                  Dates and times are shown in your own time zone.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PortalLetter({ token, letter }: { token: string; letter: Letter }) {
  const apiUtils = api.useUtils();

  const markSubmitted = api.portal.markSubmitted.useMutation({
    onSuccess: async () => {
      await apiUtils.portal.byToken.invalidate({ token });
      toast.success("Marked as submitted. Thank you!");
    },
    onError: () => {
      toast.error("Could not save that. Try again.");
    },
  });

  const isSubmitted = letter.status === "submitted";

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border p-4 text-sm">
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-medium wrap-anywhere">{letter.organization}</p>
        <p className="text-muted-foreground text-xs wrap-anywhere">
          {letter.position}
        </p>
      </div>

      {isSubmitted ? (
        // The icon repeats the word next to it; the colour is an extra cue.
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
          <CircleCheck className="h-4 w-4" aria-hidden /> Submitted
        </span>
      ) : (
        <>
          <DeadlineText
            dueAt={letter.dueAt}
            emptyLabel="No due date"
            className="text-xs"
          />
          <Button
            size="sm"
            disabled={markSubmitted.isPending}
            aria-label={`Mark the letter for ${letter.organization} as submitted`}
            onClick={() =>
              markSubmitted.mutate({ token, requestId: letter.id })
            }
          >
            {markSubmitted.isPending && (
              <Loader2Icon className="animate-spin" aria-hidden />
            )}
            Mark as submitted
          </Button>
        </>
      )}
    </li>
  );
}
