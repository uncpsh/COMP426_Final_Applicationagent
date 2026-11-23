/**
 * The sign-up form. A Client Component, because it reacts to typing and
 * submitting and talks to Supabase Auth from the browser.
 *
 * The display name is sent to Supabase as user metadata. A database trigger
 * (`handle_new_user`) reads it when the user row is created and inserts the
 * matching row into our `profiles` table, so the app never has to create a
 * profile itself.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { FormField, fieldAria } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters.`;

const SignupFields = z.object({
  // Same limits as `ProfileUpdate`, which edits this name later.
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Use at most 80 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_HINT),
});

type FieldErrors = Partial<
  Record<keyof z.infer<typeof SignupFields>, string[]>
>;

export default function SignupForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const parsed = SignupFields.safeParse({
      displayName: form.get("displayName"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    setIsSubmitting(true);

    const { displayName, email, password } = parsed.data;
    const supabase = createSupabaseComponentClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Read by the `handle_new_user` trigger to fill `profiles.display_name`.
      options: { data: { display_name: displayName } },
    });
    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    // With "Confirm email" turned on in Supabase there is no session until
    // the user clicks the link in their inbox, so there is nowhere to go yet.
    if (!data.session) {
      setNotice("Check your inbox to confirm your email, then log in.");
      setIsSubmitting(false);
      return;
    }

    queryClient.clear();
    router.push("/dashboard");
    // Re-render the Server Components with the new session cookie.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField
        id="displayName"
        label="Name"
        error={fieldErrors.displayName?.[0]}
      >
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Ada Lovelace"
          {...fieldAria("displayName", fieldErrors.displayName?.[0])}
        />
      </FormField>

      <FormField id="email" label="Email" error={fieldErrors.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...fieldAria("email", fieldErrors.email?.[0])}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        hint={PASSWORD_HINT}
        error={fieldErrors.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          {...fieldAria("password", fieldErrors.password?.[0], PASSWORD_HINT)}
        />
      </FormField>

      {formError && (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Create account
      </Button>
    </form>
  );
}
