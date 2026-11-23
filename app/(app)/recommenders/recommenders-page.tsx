/**
 * The recommenders list: one card per recommender with how many of their
 * letters are in each status and when the next one is due.
 *
 * This is a Client Component. Everything comes from one tRPC query,
 * `recommenders.list`, which computes the counts on the server.
 */

"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DeadlineText } from "@/components/deadline-text";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { RecommenderFormDialog } from "@/components/recommenders/recommender-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LETTER_STATUSES } from "@/server/models/enums";
import { LETTER_STATUS_LABELS } from "@/utils/labels";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type Recommender = RouterOutputs["recommenders"]["list"][number];

export default function RecommendersPage() {
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: recommenders,
    isPending,
    isError,
    refetch,
  } = api.recommenders.list.useQuery();

  return (
    <>
      <PageHeader
        title="Recommenders"
        description="Who is writing letters for you, and for which applications."
      >
        <Button onClick={() => setIsCreating(true)}>
          <Plus aria-hidden /> New recommender
        </Button>
      </PageHeader>

      {isPending ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading recommenders"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load your recommenders"
          onRetry={() => void refetch()}
        />
      ) : recommenders.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No recommenders yet"
          description="Add the people who will write your letters. Then assign them to applications to track each letter."
        >
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus aria-hidden /> New recommender
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recommenders.map((recommender) => (
            <RecommenderCard key={recommender.id} recommender={recommender} />
          ))}
        </ul>
      )}

      <RecommenderFormDialog open={isCreating} onOpenChange={setIsCreating} />
    </>
  );
}

function RecommenderCard({ recommender }: { recommender: Recommender }) {
  const { counts } = recommender;
  const total = LETTER_STATUSES.reduce(
    (sum, status) => sum + counts[status],
    0,
  );
  const outstanding = counts.planned + counts.requested + counts.confirmed;

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="min-w-0">
        <Link
          href={`/recommenders/${recommender.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {recommender.name}
        </Link>
        <p className="text-muted-foreground truncate text-xs">
          {[recommender.title, recommender.organization]
            .filter(Boolean)
            .join(" · ") || "No title added"}
        </p>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">No letters yet</p>
      ) : (
        <ul className="flex flex-wrap gap-1" aria-label="Letters by status">
          {LETTER_STATUSES.filter((status) => counts[status] > 0).map(
            (status) => (
              <li key={status}>
                <Badge variant="secondary">
                  {counts[status]} {LETTER_STATUS_LABELS[status].toLowerCase()}
                </Badge>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="mt-auto border-t pt-3 text-sm">
        <p className="text-muted-foreground mb-1 text-xs">Next letter due</p>
        {outstanding === 0 ? (
          <span className="text-muted-foreground">Nothing outstanding</span>
        ) : (
          <DeadlineText
            dueAt={recommender.nextDueAt}
            emptyLabel="No due date"
          />
        )}
      </div>
    </li>
  );
}
