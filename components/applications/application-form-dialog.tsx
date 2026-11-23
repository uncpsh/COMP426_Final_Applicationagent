/**
 * The dialog for creating an application or editing an existing one.
 *
 * The form keeps every field as the text the user typed. On submit it turns
 * that text into the API's input (a `Date` for the deadline, cents for the
 * fee) and checks it with `DraftApplication`, the same Zod model the server
 * uses, so the form and the API cannot disagree about what is valid.
 */

"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { FormField, fieldAria } from "@/components/form-field";
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
import { Textarea } from "@/components/ui/textarea";
import {
  APPLICATION_KINDS,
  APPLICATION_PRIORITIES,
  APPLICATION_STATUSES,
  Kind,
  Priority,
  Status,
} from "@/server/models/enums";
import { DraftApplication } from "@/server/models/inputs";
import { cn } from "@/utils/cn";
import {
  DEFAULT_DEADLINE_TIME,
  fromDateAndTimeInputs,
  toDateAndTimeInputs,
} from "@/utils/deadlines";
import { KIND_LABELS, PRIORITY_LABELS, statusLabel } from "@/utils/labels";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type Application = RouterOutputs["applications"]["create"];

/* ------------------------------------------------------------------ */
/* Form values                                                         */
/* ------------------------------------------------------------------ */

const NO_PRIORITY = "none";

/** What the inputs hold: text, exactly as typed. */
type FormValues = {
  kind: Kind;
  organization: string;
  position: string;
  term: string;
  status: Status;
  priority: Priority | typeof NO_PRIORITY;
  deadlineDate: string;
  deadlineTime: string;
  portalUrl: string;
  location: string;
  fee: string;
  notes: string;
};

type FieldName = keyof z.input<typeof DraftApplication>;
type FieldErrors = Partial<Record<FieldName, string>>;

function initialValues(application?: Application): FormValues {
  const deadline = application?.deadlineAt
    ? toDateAndTimeInputs(application.deadlineAt)
    : { date: "", time: DEFAULT_DEADLINE_TIME };

  return {
    kind: application?.kind ?? "grad_school",
    organization: application?.organization ?? "",
    position: application?.position ?? "",
    term: application?.term ?? "",
    status: application?.status ?? "researching",
    priority: application?.priority ?? NO_PRIORITY,
    deadlineDate: deadline.date,
    deadlineTime: deadline.time,
    portalUrl: application?.portalUrl ?? "",
    location: application?.location ?? "",
    fee:
      application?.applicationFeeCents == null
        ? ""
        : (application.applicationFeeCents / 100).toFixed(2),
    notes: application?.notes ?? "",
  };
}

/** "75" or "75.50" -> cents. Empty -> no fee. Anything else is invalid. */
function parseFee(text: string): number | null | "invalid" {
  const trimmed = text.trim().replace(/^\$/, "");
  if (trimmed === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return "invalid";
  return Math.round(Number(trimmed) * 100);
}

/** Turns the typed text into the API input, or into one message per field. */
function toInput(values: FormValues) {
  const errors: FieldErrors = {};

  const fee = parseFee(values.fee);
  if (fee === "invalid") {
    errors.applicationFeeCents = "Enter an amount such as 75 or 75.50.";
  }
  const deadline = fromDateAndTimeInputs(
    values.deadlineDate,
    values.deadlineTime,
  );
  if (deadline === "invalid") {
    errors.deadlineAt = "Enter a valid date and time.";
  }

  const parsed = DraftApplication.safeParse({
    kind: values.kind,
    organization: values.organization,
    position: values.position,
    term: values.term,
    status: values.status,
    priority: values.priority === NO_PRIORITY ? null : values.priority,
    deadlineAt: deadline === "invalid" ? null : deadline,
    portalUrl: values.portalUrl,
    location: values.location,
    applicationFeeCents: fee === "invalid" ? null : fee,
    notes: values.notes,
  });

  if (!parsed.success) {
    Object.assign(errors, firstMessages(parsed.error.flatten().fieldErrors));
  }
  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }
  return { ok: true as const, input: parsed.data };
}

/** Keeps the first message of each field. */
function firstMessages(
  fieldErrors: Record<string, string[] | undefined>,
): FieldErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages?.[0] ? [[field, messages[0]]] : [],
    ),
  );
}

/** The wording that differs between a school and a company. */
const KIND_WORDING: Record<
  Kind,
  { organization: string; position: string; examples: [string, string, string] }
> = {
  grad_school: {
    organization: "School",
    position: "Program",
    examples: [
      "Carnegie Mellon University",
      "MS in Machine Learning",
      "Fall 2027",
    ],
  },
  internship: {
    organization: "Company",
    position: "Role",
    examples: ["Stripe", "Software Engineer Intern", "Summer 2027"],
  },
};

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

type ApplicationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an application to edit it; leave out to create a new one. */
  application?: Application;
};

export function ApplicationFormDialog({
  open,
  onOpenChange,
  application,
}: ApplicationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {application ? "Edit application" : "New application"}
          </DialogTitle>
          <DialogDescription>
            Only the first two fields are required. You can fill in the rest
            later.
          </DialogDescription>
        </DialogHeader>
        {/* The form mounts with the dialog, so its state starts fresh each time. */}
        <ApplicationForm
          application={application}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type ApplicationFormProps = { application?: Application; onDone: () => void };

function ApplicationForm({ application, onDone }: ApplicationFormProps) {
  const apiUtils = api.useUtils();
  const [values, setValues] = useState(() => initialValues(application));
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  /** After a save, every query that shows this application is out of date. */
  async function handleSaved(saved: Application, message: string) {
    await Promise.all([
      apiUtils.applications.list.invalidate(),
      apiUtils.applications.byId.invalidate({ id: saved.id }),
      apiUtils.dashboard.summary.invalidate(),
    ]);
    toast.success(message);
    onDone();
  }

  /** The server validates again; show its field messages if it disagrees. */
  function handleFailed(
    serverFieldErrors?: Record<string, string[] | undefined>,
  ) {
    if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
      setErrors(firstMessages(serverFieldErrors));
    } else {
      toast.error("Could not save the application. Try again.");
    }
  }

  const createApplication = api.applications.create.useMutation({
    onSuccess: (saved) => handleSaved(saved, "Application added"),
    onError: (error) => handleFailed(error.data?.zodError?.fieldErrors),
  });
  const updateApplication = api.applications.update.useMutation({
    onSuccess: (saved) => handleSaved(saved, "Application saved"),
    onError: (error) => handleFailed(error.data?.zodError?.fieldErrors),
  });
  const isSaving = createApplication.isPending || updateApplication.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = toInput(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    if (application) {
      // Every field is sent, so a field the user emptied is cleared (null).
      updateApplication.mutate({ id: application.id, ...result.input });
    } else {
      createApplication.mutate(result.input);
    }
  }

  const wording = KIND_WORDING[values.kind];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const deadlineHint = `Leave the date empty for a rolling deadline. Times are in your time zone (${timeZone}).`;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">Type</legend>
        <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
          {APPLICATION_KINDS.map((kind) => (
            <label
              key={kind}
              className={cn(
                "has-[:focus-visible]:ring-ring cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-1",
                values.kind === kind
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={kind}
                checked={values.kind === kind}
                onChange={() => set("kind", kind)}
                className="sr-only"
              />
              {KIND_LABELS[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="organization"
          label={wording.organization}
          error={errors.organization}
        >
          <Input
            id="organization"
            value={values.organization}
            onChange={(event) => set("organization", event.target.value)}
            placeholder={wording.examples[0]}
            {...fieldAria("organization", errors.organization)}
          />
        </FormField>

        <FormField
          id="position"
          label={wording.position}
          error={errors.position}
        >
          <Input
            id="position"
            value={values.position}
            onChange={(event) => set("position", event.target.value)}
            placeholder={wording.examples[1]}
            {...fieldAria("position", errors.position)}
          />
        </FormField>

        <FormField id="term" label="Term" error={errors.term}>
          <Input
            id="term"
            value={values.term}
            onChange={(event) => set("term", event.target.value)}
            placeholder={wording.examples[2]}
            {...fieldAria("term", errors.term)}
          />
        </FormField>

        <FormField id="location" label="Location" error={errors.location}>
          <Input
            id="location"
            value={values.location}
            onChange={(event) => set("location", event.target.value)}
            placeholder="Pittsburgh, PA"
            {...fieldAria("location", errors.location)}
          />
        </FormField>

        <FormField id="status" label="Status" error={errors.status}>
          <Select
            value={values.status}
            onValueChange={(value) => {
              const status = Status.safeParse(value);
              if (status.success) set("status", status.data);
            }}
          >
            <SelectTrigger id="status" {...fieldAria("status", errors.status)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPLICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status, values.kind)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField id="priority" label="Priority" error={errors.priority}>
          <Select
            value={values.priority}
            onValueChange={(value) => {
              const priority = Priority.safeParse(value);
              set("priority", priority.success ? priority.data : NO_PRIORITY);
            }}
          >
            <SelectTrigger
              id="priority"
              {...fieldAria("priority", errors.priority)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PRIORITY}>Not set</SelectItem>
              {APPLICATION_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField
        id="deadline-date"
        label="Deadline"
        hint={deadlineHint}
        error={errors.deadlineAt}
      >
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            id="deadline-date"
            type="date"
            value={values.deadlineDate}
            onChange={(event) => set("deadlineDate", event.target.value)}
            {...fieldAria("deadline-date", errors.deadlineAt, deadlineHint)}
          />
          <Input
            type="time"
            aria-label="Deadline time"
            value={values.deadlineTime}
            onChange={(event) => set("deadlineTime", event.target.value)}
            className="w-32"
          />
        </div>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="portal-url"
          label="Application portal"
          error={errors.portalUrl}
        >
          <Input
            id="portal-url"
            type="url"
            inputMode="url"
            value={values.portalUrl}
            onChange={(event) => set("portalUrl", event.target.value)}
            placeholder="https://"
            {...fieldAria("portal-url", errors.portalUrl)}
          />
        </FormField>

        <FormField
          id="fee"
          label="Application fee (USD)"
          error={errors.applicationFeeCents}
        >
          <Input
            id="fee"
            inputMode="decimal"
            value={values.fee}
            onChange={(event) => set("fee", event.target.value)}
            placeholder="75.00"
            {...fieldAria("fee", errors.applicationFeeCents)}
          />
        </FormField>
      </div>

      <FormField id="notes" label="Notes" error={errors.notes}>
        <Textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          {...fieldAria("notes", errors.notes)}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2Icon className="animate-spin" aria-hidden />}
          {application ? "Save changes" : "Add application"}
        </Button>
      </DialogFooter>
    </form>
  );
}
