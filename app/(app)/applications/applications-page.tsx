/**
 * The applications list: filters by kind and status, search, sorting, an
 * inline status select and the "New application" dialog. The same rows can
 * also be shown as a board with one column per status (P1).
 *
 * This is a Client Component. Filtering, searching and sorting are done by
 * the server: each change of the controls becomes a new input to the
 * `applications.list` query, and React Query fetches and caches the result.
 */

"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  ClipboardList,
  FileText,
  List,
  ListFilter,
  Mail,
  Plus,
  Search,
  SearchX,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ApplicationFormDialog } from "@/components/applications/application-form-dialog";
import { StatusSelect } from "@/components/applications/status-select";
import { DeadlineText } from "@/components/deadline-text";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPLICATION_STATUSES, Kind, type Status } from "@/server/models/enums";
import { cn } from "@/utils/cn";
import { isDeadlineOpen } from "@/utils/deadlines";
import { KIND_LABELS, PRIORITY_LABELS, statusLabel } from "@/utils/labels";
import { api, type RouterOutputs } from "@/utils/trpc/api";
import { useDebouncedValue } from "@/utils/use-debounced-value";
import { ApplicationBoard } from "./application-board";

type Application = RouterOutputs["applications"]["list"][number];
// The API checks these against its own list: a value it does not know would
// be a type error where the query is called.
const SORTS = ["deadline", "updated", "organization"] as const;
type Sort = (typeof SORTS)[number];

const ALL_KINDS = "all";

/** The two ways of showing the same rows. */
const VIEWS = ["list", "board"] as const;
type View = (typeof VIEWS)[number];

const SORT_LABELS: Record<Sort, string> = {
  deadline: "Deadline",
  updated: "Recently updated",
  organization: "Name (A to Z)",
};

type ApplicationsPageProps = {
  /** From the `?view=` part of the URL, read by the server component. */
  initialView: View;
};

export default function ApplicationsPage({
  initialView,
}: ApplicationsPageProps) {
  const [view, setView] = useState<View>(initialView);
  const [kind, setKind] = useState<Kind | typeof ALL_KINDS>(ALL_KINDS);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("deadline");
  const [isCreating, setIsCreating] = useState(false);

  // Wait until typing pauses before asking the server.
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const {
    data: applications,
    isPending,
    isError,
    isPlaceholderData,
    refetch,
  } = api.applications.list.useQuery(
    {
      kind: kind === ALL_KINDS ? undefined : kind,
      statuses: statuses.length > 0 ? statuses : undefined,
      search: debouncedSearch || undefined,
      sort,
    },
    // While a new filter loads, keep showing the previous rows (dimmed)
    // instead of flashing the loading skeleton.
    { placeholderData: keepPreviousData },
  );

  const hasFilters =
    kind !== ALL_KINDS || statuses.length > 0 || debouncedSearch !== "";

  function clearFilters() {
    setKind(ALL_KINDS);
    setStatuses([]);
    setSearch("");
  }

  function changeView(next: View) {
    setView(next);
    // Keep the view in the URL, so a reload or a shared link opens the same
    // one. `replaceState` does not add a step to the Back button.
    window.history.replaceState(
      null,
      "",
      next === "board" ? "?view=board" : window.location.pathname,
    );
  }

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every program and role you are applying to."
      >
        <Button onClick={() => setIsCreating(true)}>
          <Plus aria-hidden /> New application
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={kind}
            onValueChange={(value) => {
              const parsed = Kind.safeParse(value);
              setKind(parsed.success ? parsed.data : ALL_KINDS);
            }}
          >
            <TabsList>
              <TabsTrigger value={ALL_KINDS}>All</TabsTrigger>
              <TabsTrigger value="grad_school">Grad school</TabsTrigger>
              <TabsTrigger value="internship">Internships</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs
            value={view}
            onValueChange={(value) => {
              const next = VIEWS.find((option) => option === value);
              if (next) changeView(next);
            }}
          >
            <TabsList aria-label="View">
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" aria-hidden /> List
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5">
                <SquareKanban className="h-4 w-4" aria-hidden /> Board
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              aria-label="Search applications"
              placeholder="Search school, company or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
            />
          </div>
          <StatusFilter
            kind={kind === ALL_KINDS ? undefined : kind}
            selected={statuses}
            onChange={setStatuses}
          />
          <Select
            value={sort}
            onValueChange={(value) => {
              const next = SORTS.find((option) => option === value);
              if (next) setSort(next);
            }}
          >
            <SelectTrigger aria-label="Sort by" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((option) => (
                <SelectItem key={option} value={option}>
                  {SORT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Could not load your applications"
          onRetry={() => void refetch()}
        />
      ) : applications.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No applications match"
            description="Nothing fits the current search and filters."
          >
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No applications yet"
            description="Add the first program or role you are considering. You can fill in the deadline and details later."
          >
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus aria-hidden /> New application
            </Button>
          </EmptyState>
        )
      ) : (
        <div
          className={cn(
            "transition-opacity",
            isPlaceholderData && "opacity-60",
          )}
        >
          {view === "board" ? (
            <ApplicationBoard
              applications={applications}
              kind={kind === ALL_KINDS ? undefined : kind}
              statuses={statuses}
            />
          ) : (
            <>
              <ApplicationTable applications={applications} />
              <ApplicationCards applications={applications} />
            </>
          )}
        </div>
      )}

      <ApplicationFormDialog open={isCreating} onOpenChange={setIsCreating} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Status filter                                                       */
/* ------------------------------------------------------------------ */

type StatusFilterProps = {
  kind?: Kind;
  selected: Status[];
  onChange: (statuses: Status[]) => void;
};

/** A menu of checkboxes: any number of statuses can be selected. */
function StatusFilter({ kind, selected, onChange }: StatusFilterProps) {
  function toggle(status: Status, checked: boolean) {
    onChange(
      checked
        ? [...selected, status]
        : selected.filter((value) => value !== status),
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="font-normal">
          <ListFilter aria-hidden /> Status
          {selected.length > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {selected.length}
              <span className="sr-only"> selected</span>
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {APPLICATION_STATUSES.map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={selected.includes(status)}
            onCheckedChange={(checked) => toggle(status, checked)}
            // Keep the menu open so several statuses can be ticked in a row.
            onSelect={(event) => event.preventDefault()}
          >
            {statusLabel(status, kind)}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              Clear status filter
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* The list, as a table (wide screens) and as cards (phones)           */
/* ------------------------------------------------------------------ */

type ApplicationListProps = { applications: Application[] };

/** "MS in Machine Learning · Fall 2027". */
function subtitle(application: Application) {
  return [application.position, application.term].filter(Boolean).join(" · ");
}

function ApplicationBadges({ application }: { application: Application }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge variant="outline">{KIND_LABELS[application.kind]}</Badge>
      {application.priority && (
        <Badge variant="secondary">
          {PRIORITY_LABELS[application.priority]}
        </Badge>
      )}
    </span>
  );
}

/** "1 of 2 letters in" and "2 documents", or nothing when there are none. */
function Counts({ application }: { application: Application }) {
  const { letters, documentCount } = application;
  if (letters.total === 0 && documentCount === 0) {
    return <span className="text-muted-foreground">None yet</span>;
  }

  return (
    <span className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
      {letters.total > 0 && (
        <span className="inline-flex items-center gap-1">
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {letters.submitted} of {letters.total}{" "}
          {letters.total === 1 ? "letter" : "letters"} in
        </span>
      )}
      {documentCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {documentCount} {documentCount === 1 ? "document" : "documents"}
        </span>
      )}
    </span>
  );
}

function ApplicationTable({ applications }: ApplicationListProps) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Application</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Letters and documents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell>
                <Link
                  href={`/applications/${application.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {application.organization}
                </Link>
                <p className="text-muted-foreground mb-1.5 text-xs">
                  {subtitle(application)}
                </p>
                <ApplicationBadges application={application} />
              </TableCell>
              <TableCell>
                <DeadlineText
                  dueAt={application.deadlineAt}
                  isOpen={isDeadlineOpen(application.status)}
                />
              </TableCell>
              <TableCell>
                <StatusSelect
                  applicationId={application.id}
                  kind={application.kind}
                  status={application.status}
                  label={`Status of ${application.organization}`}
                />
              </TableCell>
              <TableCell className="text-xs">
                <Counts application={application} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ApplicationCards({ applications }: ApplicationListProps) {
  return (
    <ul className="grid gap-3 md:hidden">
      {applications.map((application) => (
        <li key={application.id} className="rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/applications/${application.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {application.organization}
              </Link>
              <p className="text-muted-foreground text-xs">
                {subtitle(application)}
              </p>
            </div>
            <StatusSelect
              applicationId={application.id}
              kind={application.kind}
              status={application.status}
              label={`Status of ${application.organization}`}
              className="shrink-0"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3 text-sm">
            <DeadlineText
              dueAt={application.deadlineAt}
              isOpen={isDeadlineOpen(application.status)}
            />
            <ApplicationBadges application={application} />
          </div>
          <div className="mt-3 border-t pt-3 text-xs">
            <Counts application={application} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div
      className="grid gap-3"
      aria-busy="true"
      aria-label="Loading applications"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
