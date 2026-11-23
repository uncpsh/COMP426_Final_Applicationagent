"use client";

import {
  useUpdateLetterStatus,
  type LetterRef,
} from "@/components/letters/use-letter-mutations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LETTER_STATUSES, LetterStatus } from "@/server/models/enums";
import { cn } from "@/utils/cn";
import { LETTER_STATUS_LABELS } from "@/utils/labels";

/** One colour per letter status. The status is always written out too. */
const LETTER_STATUS_STYLES: Record<LetterStatus, string> = {
  planned: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  requested: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  confirmed: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  submitted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  declined: "bg-red-500/15 text-red-700 dark:text-red-300",
};

type LetterStatusSelectProps = {
  letter: LetterRef & { status: LetterStatus };
  /** Names the letter for screen readers, e.g. "Letter status for MIT". */
  label: string;
};

/** The inline select that changes a letter's status in one click. */
export function LetterStatusSelect({ letter, label }: LetterStatusSelectProps) {
  const updateStatus = useUpdateLetterStatus(letter);

  function handleChange(value: string) {
    // The select hands back a plain string; Zod narrows it to a status.
    const next = LetterStatus.safeParse(value);
    if (next.success && next.data !== letter.status) {
      updateStatus.mutate({ id: letter.id, status: next.data });
    }
  }

  return (
    <Select value={letter.status} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-8 w-32 border-transparent font-medium shadow-none",
          LETTER_STATUS_STYLES[letter.status],
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LETTER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {LETTER_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
