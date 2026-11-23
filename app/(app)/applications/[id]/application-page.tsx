/**
 * The page of one application: its details, the inline status select,
 * "Edit" and "Delete", and the Letters and Documents sections.
 *
 * This is a Client Component. Everything it shows comes from one tRPC query,
 * `applications.byId`.
 */

"use client";

import { ArrowLeft, ExternalLink, Pencil, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApplicationFormDialog } from "@/components/applications/application-form-dialog";
import { DeleteApplicationDialog } from "@/components/applications/delete-application-dialog";
import { StatusSelect } from "@/components/applications/status-select";
import { DeadlineText } from "@/components/deadline-text";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, isDeadlineOpen } from "@/utils/deadlines";
import { KIND_LABELS, PRIORITY_LABELS, formatCents } from "@/utils/labels";
import { api } from "@/utils/trpc/api";
import { DocumentsSection } from "./documents-section";
import { LettersSection } from "./letters-section";

// The id in the URL is wrong or belongs to someone else. Asking again
// cannot change that, so these errors are not retried.
const MISSING_CODES = ["NOT_FOUND", "BAD_REQUEST"];

type ApplicationPageProps = { applicationId: string };

export default function ApplicationPage({
  applicationId,
}: ApplicationPageProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: application,
    isPending,
    error,
    refetch,
  } = api.applications.byId.useQuery(
    { id: applicationId },
    {
      retry: (failureCount, failure) =>
        !MISSING_CODES.includes(failure.data?.code ?? "") && failureCount < 2,
    },
  );

  if (isPending) return <PageSkeleton />;

  if (error) {
    return (
      <>
        <BackLink />
        {MISSING_CODES.includes(error.data?.code ?? "") ? (
          <EmptyState
            icon={SearchX}
            title="Application not found"
            description="It may have been deleted, or the link is wrong."
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/applications">Back to applications</Link>
            </Button>
          </EmptyState>
        ) : (
          <ErrorState
            title="Could not load this application"
            onRetry={() => void refetch()}
          />
        )}
      </>
    );
  }

  return (
    <>
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">
            {application.organization}
          </h1>
          <p className="text-muted-foreground mt-1 wrap-anywhere">
            {[application.position, application.term]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            <Badge variant="outline">{KIND_LABELS[application.kind]}</Badge>
            {application.priority && (
              <Badge variant="secondary">
                {PRIORITY_LABELS[application.priority]}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect
            applicationId={application.id}
            kind={application.kind}
            status={application.status}
            label="Status"
            className="h-9"
          />
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
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <Detail label="Deadline">
                <DeadlineText
                  dueAt={application.deadlineAt}
                  isOpen={isDeadlineOpen(application.status)}
                  emptyLabel="No deadline (rolling)"
                />
              </Detail>
              {application.submittedAt && (
                <Detail label="Submitted">
                  <time dateTime={application.submittedAt.toISOString()}>
                    {formatDateTime(application.submittedAt)}
                  </time>
                </Detail>
              )}
              {application.location && (
                <Detail label="Location">{application.location}</Detail>
              )}
              {application.applicationFeeCents != null && (
                <Detail label="Application fee">
                  {formatCents(application.applicationFeeCents)}
                </Detail>
              )}
              {application.portalUrl && (
                <Detail label="Application portal">
                  <a
                    href={application.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 underline underline-offset-4"
                  >
                    <span className="truncate">
                      {new URL(application.portalUrl).hostname}
                    </span>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Detail>
              )}
              {application.notes && (
                <Detail label="Notes">
                  <p className="wrap-anywhere whitespace-pre-wrap">
                    {application.notes}
                  </p>
                </Detail>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:col-span-2">
          <LettersSection application={application} />
          <DocumentsSection application={application} />
        </div>
      </div>

      <ApplicationFormDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        application={application}
      />
      <DeleteApplicationDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        application={application}
        onDeleted={() => router.push("/applications")}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/applications"
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Applications
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

function PageSkeleton() {
  return (
    <div
      className="grid gap-4"
      aria-busy="true"
      aria-label="Loading application"
    >
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-5 w-1/3" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
