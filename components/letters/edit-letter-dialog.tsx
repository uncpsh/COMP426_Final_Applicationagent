/**
 * The dialog for a letter's own due date and notes. The status is changed
 * with the inline select instead.
 */

"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FormField, fieldAria } from "@/components/form-field";
import {
  useInvalidateLetter,
  type LetterRef,
} from "@/components/letters/use-letter-mutations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_DEADLINE_TIME,
  formatDateTime,
  fromDateAndTimeInputs,
  toDateAndTimeInputs,
} from "@/utils/deadlines";
import { api } from "@/utils/trpc/api";

export type EditableLetter = LetterRef & {
  dueAt: Date | null;
  notes: string | null;
};

type EditLetterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter: EditableLetter;
  /** Who and what the letter is for, e.g. "Prof. Rivera · MIT". */
  subject: string;
  /** The due date the letter falls back to when it has none of its own. */
  applicationDeadlineAt: Date | null;
};

export function EditLetterDialog({
  open,
  onOpenChange,
  subject,
  ...formProps
}: EditLetterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit letter</DialogTitle>
          <DialogDescription>{subject}</DialogDescription>
        </DialogHeader>
        {/* The form mounts with the dialog, so its state starts fresh each time. */}
        <EditLetterForm {...formProps} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type EditLetterFormProps = Pick<
  EditLetterDialogProps,
  "letter" | "applicationDeadlineAt"
> & { onDone: () => void };

function EditLetterForm({
  letter,
  applicationDeadlineAt,
  onDone,
}: EditLetterFormProps) {
  const invalidateLetter = useInvalidateLetter();

  const initial = letter.dueAt
    ? toDateAndTimeInputs(letter.dueAt)
    : { date: "", time: DEFAULT_DEADLINE_TIME };
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [notes, setNotes] = useState(letter.notes ?? "");
  const [errors, setErrors] = useState<{ dueAt?: string; notes?: string }>({});

  const updateLetter = api.recommendations.update.useMutation({
    onSuccess: async () => {
      await invalidateLetter(letter);
      toast.success("Letter saved");
      onDone();
    },
    onError: (error) => {
      const notesError = error.data?.zodError?.fieldErrors.notes?.[0];
      if (notesError) setErrors({ notes: notesError });
      else toast.error("Could not save the letter. Try again.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dueAt = fromDateAndTimeInputs(date, time);
    if (dueAt === "invalid") {
      setErrors({ dueAt: "Enter a valid date and time." });
      return;
    }

    setErrors({});
    // `null` clears the letter's own date, so it follows the application.
    updateLetter.mutate({ id: letter.id, dueAt, notes });
  }

  const fallback = applicationDeadlineAt
    ? `the application's deadline (${formatDateTime(applicationDeadlineAt)})`
    : "the application's deadline, once it has one";
  const dueHint = `Leave the date empty to use ${fallback}.`;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField
        id="letter-due-date"
        label="Letter due"
        hint={dueHint}
        error={errors.dueAt}
      >
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            id="letter-due-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            {...fieldAria("letter-due-date", errors.dueAt, dueHint)}
          />
          <Input
            type="time"
            aria-label="Letter due time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-32"
          />
        </div>
      </FormField>

      <FormField id="letter-notes" label="Notes" error={errors.notes}>
        <Textarea
          id="letter-notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Sent the draft SOP on Nov 2"
          {...fieldAria("letter-notes", errors.notes)}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateLetter.isPending}>
          {updateLetter.isPending && (
            <Loader2Icon className="animate-spin" aria-hidden />
          )}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
