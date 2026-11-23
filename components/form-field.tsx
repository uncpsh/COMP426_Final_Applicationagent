import { Label } from "@/components/ui/label";

type FormFieldProps = {
  /** The id of the input inside this field. */
  id: string;
  label: string;
  /** A validation message. When set it replaces the hint. */
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

/** A label, an input (passed as children) and its hint or error message. */
export function FormField({
  id,
  label,
  error,
  hint,
  children,
}: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The aria attributes that tie an input to the messages `FormField` renders,
 * so a screen reader announces the error or hint together with the input.
 */
export function fieldAria(id: string, error?: string, hint?: string) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;
}
