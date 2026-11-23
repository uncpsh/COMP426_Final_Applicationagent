/**
 * One letter, as a row with its controls: the status select, "edit" (due
 * date and notes) and "remove".
 *
 * The same row is used on the application page (where `children` names the
 * recommender) and on the recommender page (where it names the application).
 */

"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeadlineText } from "@/components/deadline-text";
import {
  EditLetterDialog,
  type EditableLetter,
} from "@/components/letters/edit-letter-dialog";
import { LetterStatusSelect } from "@/components/letters/letter-status-select";
import { useInvalidateLetter } from "@/components/letters/use-letter-mutations";
import { Button } from "@/components/ui/button";
import type { LetterStatus } from "@/server/models/enums";
import { formatDateTime } from "@/utils/deadlines";
import { isLetterOutstanding, letterDueAt } from "@/utils/letters";
import { api } from "@/utils/trpc/api";

type LetterItemProps = {
  letter: EditableLetter & { status: LetterStatus; submittedAt: Date | null };
  applicationDeadlineAt: Date | null;
  /** Who and what the letter is for, e.g. "Prof. Rivera · MIT". */
  subject: string;
  /** The other side of the letter: a link to the recommender or application. */
  children: React.ReactNode;
};

export function LetterItem({
  letter,
  applicationDeadlineAt,
  subject,
  children,
}: LetterItemProps) {
  const invalidateLetter = useInvalidateLetter();
  const [isEditing, setIsEditing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const removeLetter = api.recommendations.remove.useMutation({
    onSuccess: async () => {
      await invalidateLetter(letter);
      toast.success("Letter removed");
      setIsRemoving(false);
    },
    onError: () => {
      toast.error("Could not remove the letter. Try again.");
    },
  });

  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-40">{children}</div>

        {letter.status === "submitted" && letter.submittedAt ? (
          <span className="text-muted-foreground text-xs">
            Submitted {formatDateTime(letter.submittedAt)}
          </span>
        ) : (
          <DeadlineText
            dueAt={letterDueAt(letter.dueAt, applicationDeadlineAt)}
            isOpen={isLetterOutstanding(letter.status)}
            emptyLabel="No due date"
            className="text-xs"
          />
        )}

        <div className="flex items-center gap-1">
          <LetterStatusSelect
            letter={letter}
            label={`Letter status: ${subject}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Edit letter: ${subject}`}
            onClick={() => setIsEditing(true)}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-8 w-8"
            aria-label={`Remove letter: ${subject}`}
            onClick={() => setIsRemoving(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      {letter.notes && (
        <p className="text-muted-foreground mt-2 border-t pt-2 text-xs wrap-anywhere whitespace-pre-wrap">
          {letter.notes}
        </p>
      )}

      <EditLetterDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        letter={letter}
        subject={subject}
        applicationDeadlineAt={applicationDeadlineAt}
      />
      <ConfirmDialog
        open={isRemoving}
        onOpenChange={setIsRemoving}
        title="Remove this letter?"
        description={`${subject}: the letter request, its status and its notes will be deleted. The recommender and the application are kept.`}
        confirmLabel="Remove"
        isPending={removeLetter.isPending}
        onConfirm={() => removeLetter.mutate({ id: letter.id })}
      />
    </li>
  );
}
