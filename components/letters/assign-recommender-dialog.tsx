/**
 * The dialog that assigns one of the user's recommenders to an application,
 * which creates a letter (a row in the applications <-> recommenders join).
 */

"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { FormField, fieldAria } from "@/components/form-field";
import { useInvalidateLetter } from "@/components/letters/use-letter-mutations";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_DEADLINE_TIME,
  fromDateAndTimeInputs,
} from "@/utils/deadlines";
import { api } from "@/utils/trpc/api";

type AssignRecommenderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: { id: string; organization: string };
  /** Recommenders who already have a letter for this application. */
  assignedRecommenderIds: string[];
};

export function AssignRecommenderDialog({
  open,
  onOpenChange,
  application,
  assignedRecommenderIds,
}: AssignRecommenderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign a recommender</DialogTitle>
          <DialogDescription>
            Who will write a letter for {application.organization}?
          </DialogDescription>
        </DialogHeader>
        {/* The form mounts with the dialog, so its state starts fresh each time. */}
        <AssignRecommenderForm
          applicationId={application.id}
          assignedRecommenderIds={assignedRecommenderIds}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type AssignRecommenderFormProps = {
  applicationId: string;
  assignedRecommenderIds: string[];
  onDone: () => void;
};

function AssignRecommenderForm({
  applicationId,
  assignedRecommenderIds,
  onDone,
}: AssignRecommenderFormProps) {
  const invalidateLetter = useInvalidateLetter();
  const [recommenderId, setRecommenderId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(DEFAULT_DEADLINE_TIME);
  const [errors, setErrors] = useState<{
    recommenderId?: string;
    dueAt?: string;
  }>({});

  const recommenders = api.recommenders.list.useQuery();

  const assign = api.recommendations.assign.useMutation({
    onSuccess: async (letter) => {
      await invalidateLetter(letter);
      toast.success("Recommender assigned");
      onDone();
    },
    onError: (error) => {
      // Someone (another tab) assigned the same recommender a moment ago.
      toast.error(
        error.data?.code === "CONFLICT"
          ? "That recommender is already assigned to this application."
          : "Could not assign the recommender. Try again.",
      );
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dueAt = fromDateAndTimeInputs(date, time);
    const nextErrors = {
      recommenderId: recommenderId ? undefined : "Choose a recommender.",
      dueAt: dueAt === "invalid" ? "Enter a valid date and time." : undefined,
    };
    setErrors(nextErrors);
    if (!recommenderId || dueAt === "invalid") return;

    assign.mutate({ applicationId, recommenderId, dueAt });
  }

  if (recommenders.isPending) return <Skeleton className="h-32 w-full" />;
  if (recommenders.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        Could not load your recommenders. Close this dialog and try again.
      </p>
    );
  }

  const available = recommenders.data.filter(
    (recommender) => !assignedRecommenderIds.includes(recommender.id),
  );

  // Nothing to choose from: explain why and point to the page that fixes it.
  if (available.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          {recommenders.data.length === 0
            ? "You have not added any recommenders yet. Add one first, then assign them here."
            : "All of your recommenders are already assigned to this application."}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Close
          </Button>
          <Button asChild>
            <Link href="/recommenders">Go to recommenders</Link>
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const dueHint =
    "Optional. Leave the date empty to use the application's deadline.";

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField
        id="assign-recommender"
        label="Recommender"
        error={errors.recommenderId}
      >
        <Select value={recommenderId} onValueChange={setRecommenderId}>
          <SelectTrigger
            id="assign-recommender"
            {...fieldAria("assign-recommender", errors.recommenderId)}
          >
            <SelectValue placeholder="Choose a recommender" />
          </SelectTrigger>
          <SelectContent>
            {available.map((recommender) => (
              <SelectItem key={recommender.id} value={recommender.id}>
                {recommender.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        id="assign-due-date"
        label="Letter due"
        hint={dueHint}
        error={errors.dueAt}
      >
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            id="assign-due-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            {...fieldAria("assign-due-date", errors.dueAt, dueHint)}
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={assign.isPending}>
          {assign.isPending && (
            <Loader2Icon className="animate-spin" aria-hidden />
          )}
          Assign
        </Button>
      </DialogFooter>
    </form>
  );
}
