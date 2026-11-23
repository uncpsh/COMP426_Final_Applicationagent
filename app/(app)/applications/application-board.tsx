/**
 * (P1) The board view of the applications list: one column per status.
 * Dragging a card into another column changes the application's status.
 *
 * The board shows the same rows as the table (the same `applications.list`
 * query), only grouped by status. A drop reuses the mutation behind the
 * inline status select (`applications.updateStatus`, optimistic), so the
 * card moves at once and moves back if the server rejects the change.
 */

"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { STATUS_STYLES } from "@/components/applications/status-styles";
import { useUpdateApplicationStatus } from "@/components/applications/use-update-status";
import { DeadlineText } from "@/components/deadline-text";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICATION_STATUSES, Status, type Kind } from "@/server/models/enums";
import { cn } from "@/utils/cn";
import { isDeadlineOpen } from "@/utils/deadlines";
import { statusLabel } from "@/utils/labels";
import type { RouterOutputs } from "@/utils/trpc/api";

type Application = RouterOutputs["applications"]["list"][number];

type ApplicationBoardProps = {
  applications: Application[];
  /** The kind filter. It decides the wording of the `offer` column. */
  kind?: Kind;
  /** The status filter. When it is not empty, only these columns are shown. */
  statuses: Status[];
};

export function ApplicationBoard({
  applications,
  kind,
  statuses,
}: ApplicationBoardProps) {
  const updateStatus = useUpdateApplicationStatus();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const sensors = useSensors(
    // A drag starts only after the pointer has moved a little, so a plain
    // click still opens the link or the menu on a card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On a touch screen a drag starts with press-and-hold; a quick swipe
    // scrolls the board as usual.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const columns =
    statuses.length > 0
      ? APPLICATION_STATUSES.filter((status) => statuses.includes(status))
      : APPLICATION_STATUSES;
  const dragged = applications.find(
    (application) => application.id === draggedId,
  );

  function moveTo(application: Application, status: Status) {
    if (application.status !== status) {
      updateStatus.mutate({ id: application.id, status });
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggedId(null);

    // Every column is a drop target whose id is its status. Dropping a card
    // outside all columns leaves `over` empty, and nothing changes.
    const status = Status.safeParse(over?.id);
    const application = applications.find((item) => item.id === active.id);
    if (status.success && application) moveTo(application, status.data);
  }

  return (
    <DndContext
      // A fixed id keeps the ids dnd-kit generates the same on the server
      // and in the browser.
      id="application-board"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => setDraggedId(String(active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggedId(null)}
    >
      {/* Eight columns do not fit most screens, so the board scrolls sideways
          (to the screen edges on a phone). */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <ul className="flex w-max gap-3">
          {columns.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              kind={kind}
              applications={applications.filter(
                (application) => application.status === status,
              )}
              onMove={moveTo}
            />
          ))}
        </ul>
      </div>

      {/* The copy that follows the pointer while a card is being dragged. */}
      <DragOverlay>
        {dragged && (
          <div className="bg-card cursor-grabbing rounded-lg border p-3 text-sm shadow-lg">
            <CardBody application={dragged} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/* ------------------------------------------------------------------ */
/* A column: one status and the applications in it                     */
/* ------------------------------------------------------------------ */

type BoardColumnProps = {
  status: Status;
  kind?: Kind;
  applications: Application[];
  onMove: (application: Application, status: Status) => void;
};

function BoardColumn({ status, kind, applications, onMove }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const label = statusLabel(status, kind);

  return (
    <li
      ref={setNodeRef}
      aria-label={`${label}: ${applications.length}`}
      className={cn(
        "bg-muted/40 flex min-h-40 w-64 shrink-0 flex-col gap-2 rounded-xl border p-2 transition-colors",
        // The whole column lights up while a card is held over it.
        isOver && "border-ring bg-muted",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <h2 className={cn("rounded-md px-2 py-0.5", STATUS_STYLES[status])}>
          {label}
        </h2>
        {/* The column's `aria-label` already says the count. */}
        <span className="text-muted-foreground px-1 tabular-nums" aria-hidden>
          {applications.length}
        </span>
      </div>

      {applications.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
          Nothing here
        </p>
      ) : (
        <ul className="grid gap-2">
          {applications.map((application) => (
            <BoardCard
              key={application.id}
              application={application}
              onMove={(next) => onMove(application, next)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* A card: one application                                             */
/* ------------------------------------------------------------------ */

type BoardCardProps = {
  application: Application;
  onMove: (status: Status) => void;
};

function BoardCard({ application, onMove }: BoardCardProps) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: application.id,
  });

  return (
    <li
      ref={setNodeRef}
      // Only the pointer listeners are attached. Dragging is an extra for
      // mouse and touch; the "Move to" menu does the same from the keyboard.
      {...listeners}
      className={cn(
        "bg-card cursor-grab touch-manipulation rounded-lg border p-3 text-sm shadow-xs select-none [-webkit-touch-callout:none]",
        // The original stays in its column, dimmed, until the drop.
        isDragging && "opacity-40",
      )}
    >
      <CardBody
        application={application}
        menu={<MoveMenu application={application} onMove={onMove} />}
      />
    </li>
  );
}

function CardBody({
  application,
  menu,
}: {
  application: Application;
  menu?: React.ReactNode;
}) {
  const subtitle = [application.position, application.term]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/applications/${application.id}`}
            // Otherwise the browser would start dragging the link itself.
            draggable={false}
            className="font-medium break-words underline-offset-4 hover:underline"
          >
            {application.organization}
          </Link>
          <p className="text-muted-foreground text-xs break-words">
            {subtitle}
          </p>
        </div>
        {menu}
      </div>
      <DeadlineText
        dueAt={application.deadlineAt}
        isOpen={isDeadlineOpen(application.status)}
        className="mt-2 text-xs"
      />
    </>
  );
}

/** The same status change as a drag, for the keyboard and screen readers. */
function MoveMenu({ application, onMove }: BoardCardProps) {
  return (
    // A press on the button must open the menu, not pick the card up.
    <span
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="-mt-1 -mr-1 h-7 w-7 shrink-0"
            aria-label={`Move ${application.organization} to another status`}
          >
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={application.status}
            onValueChange={(value) => {
              // The menu hands back a plain string; Zod narrows it.
              const next = Status.safeParse(value);
              if (next.success) onMove(next.data);
            }}
          >
            {APPLICATION_STATUSES.map((status) => (
              <DropdownMenuRadioItem key={status} value={status}>
                {statusLabel(status, application.kind)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
