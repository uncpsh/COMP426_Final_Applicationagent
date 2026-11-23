/**
 * The page of one recommender: their details, "Edit" and "Delete", and
 * every letter they owe across all of the user's applications. It also has
 * the two P1 extras: a reminder email draft and the portal link.
 *
 * This is a Client Component. Everything it shows comes from one tRPC query,
 * `recommenders.byId` (plus the user's own name, for the email signature).
 */

"use client";

import {
  ArrowLeft,
  Mail,
  MailPlus,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/applications/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LetterItem } from "@/components/letters/letter-item";
import { RecommenderFormDialog } from "@/components/recommenders/recommender-form-dialog";
import { ShareLinkCard } from "@/components/recommenders/share-link-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isLetterOutstanding, letterDueAt } from "@/utils/letters";
import { reminderMailto } from "@/utils/reminder-email";
import { api } from "@/utils/trpc/api";

// The id in the URL is wrong or belongs to someone else. Asking again
// cannot change that, so these errors are not retried.
const MISSING_CODES = ["NOT_FOUND", "BAD_REQUEST"];

type RecommenderPageProps = { recommenderId: string };

export default function RecommenderPage({
  recommenderId,
}: RecommenderPageProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: recommender,
    isPending,
    error,
    refetch,
  } = api.recommenders.byId.useQuery(
    { id: recommenderId },
    {
      retry: (failureCount, failure) =>
        !MISSING_CODES.includes(failure.data?.code ?? "") && failureCount < 2,
    },
  );

  // Already loaded by the user menu, so this is answered from the cache.
  const { data: me } = api.profile.me.useQuery();

  const deleteRecommender = api.recommenders.delete.useMutation({
    onSuccess: async () => {
      // Their letters went with them (cascade), so application pages and
      // counts are out of date as well.
      await Promise.all([
        apiUtils.recommenders.list.invalidate(),
        apiUtils.applications.invalidate(),
        apiUtils.dashboard.summary.invalidate(),
      ]);
      toast.success("Recommender deleted");
      router.push("/recommenders");
    },
    onError: () => {
      toast.error("Could not delete the recommender. Try again.");
    },
  });

  if (isPending) {
    return (
      <div
        className="grid gap-4"
        aria-busy="true"
        aria-label="Loading recommender"
      >
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <BackLink />
        {MISSING_CODES.includes(error.data?.code ?? "") ? (
          <EmptyState
            icon={SearchX}
            title="Recommender not found"
            description="They may have been deleted, or the link is wrong."
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/recommenders">Back to recommenders</Link>
            </Button>
          </EmptyState>
        ) : (
          <ErrorState
            title="Could not load this recommender"
            onRetry={() => void refetch()}
          />
        )}
      </>
    );
  }

  const { letters } = recommender;
  const role = [recommender.title, recommender.organization]
    .filter(Boolean)
    .join(" · ");

  // The letters a reminder is about: the ones still owed. They arrive most
  // urgent first, and the email lists them in that order.
  const pendingLetters = letters
    .filter((letter) => isLetterOutstanding(letter.status))
    .map((letter) => ({
      organization: letter.application.organization,
      position: letter.application.position,
      dueAt: letterDueAt(letter.dueAt, letter.application.deadlineAt),
    }));

  return (
    <>
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">
            {recommender.name}
          </h1>
          {role && (
            <p className="text-muted-foreground mt-1 wrap-anywhere">{role}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil aria-hidden /> Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setIsDeleting(true)}
          >
            <Trash2 aria-hidden /> Delete
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <Detail label="Email">
                  {recommender.email ? (
                    <a
                      href={`mailto:${recommender.email}`}
                      className="inline-flex max-w-full items-center gap-1 underline underline-offset-4"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{recommender.email}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not added</span>
                  )}
                </Detail>
                {recommender.relationship && (
                  <Detail label="How you know them">
                    {recommender.relationship}
                  </Detail>
                )}
                {recommender.notes && (
                  <Detail label="Notes">
                    <p className="wrap-anywhere whitespace-pre-wrap">
                      {recommender.notes}
                    </p>
                  </Detail>
                )}
              </dl>
            </CardContent>
          </Card>
          <ShareLinkCard recommender={recommender} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row flex-wrap items-start justify-between space-y-0 gap-x-4 gap-y-3">
            <div className="grid gap-1.5">
              <CardTitle>Letters</CardTitle>
              <CardDescription>
                Every letter {recommender.name} is writing, most urgent first.
              </CardDescription>
            </div>
            {pendingLetters.length > 0 && (
              <div className="grid gap-1">
                {/* A link, not a request: it opens the user's mail program
                    with the draft filled in. The app sends nothing. */}
                <Button asChild variant="outline" size="sm">
                  <a
                    href={reminderMailto({
                      recommenderName: recommender.name,
                      recommenderEmail: recommender.email,
                      senderName: me?.displayName,
                      letters: pendingLetters,
                    })}
                  >
                    <MailPlus aria-hidden /> Draft reminder email
                  </a>
                </Button>
                {!recommender.email && (
                  <p className="text-muted-foreground text-xs">
                    No email on file: add the address in the draft.
                  </p>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {letters.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                No letters yet. Open an application and assign{" "}
                {recommender.name} in its “Recommendation letters” section.{" "}
                <Link
                  href="/applications"
                  className="text-foreground underline underline-offset-4"
                >
                  Go to applications
                </Link>
              </div>
            ) : (
              <ul className="grid gap-2">
                {letters.map((letter) => (
                  <LetterItem
                    key={letter.id}
                    letter={letter}
                    applicationDeadlineAt={letter.application.deadlineAt}
                    subject={`${recommender.name} · ${letter.application.organization}`}
                  >
                    <Link
                      href={`/applications/${letter.application.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {letter.application.organization}
                    </Link>
                    <p className="text-muted-foreground mb-1 truncate text-xs">
                      {letter.application.position}
                    </p>
                    <StatusBadge status={letter.application.status} />
                  </LetterItem>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <RecommenderFormDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        recommender={recommender}
      />
      <ConfirmDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        title="Delete this recommender?"
        description={
          letters.length === 0
            ? `${recommender.name} will be deleted. This cannot be undone.`
            : `${recommender.name} will be deleted, together with ${letters.length === 1 ? "their 1 letter request" : `their ${letters.length} letter requests`}. Your applications are kept. This cannot be undone.`
        }
        confirmLabel="Delete"
        isPending={deleteRecommender.isPending}
        onConfirm={() => deleteRecommender.mutate({ id: recommender.id })}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/recommenders"
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Recommenders
    </Link>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
