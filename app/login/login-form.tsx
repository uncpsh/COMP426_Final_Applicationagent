/**
 * The login form. A Client Component, because it reacts to typing and
 * submitting and talks to Supabase Auth from the browser.
 *
 * Signing in stores the session in cookies. Every later request carries those
 * cookies, which is how the server (pages and the tRPC context) knows who the
 * user is.
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

const LoginFields = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof LoginFields>, string[]>>;

export default function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const parsed = LoginFields.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const supabase = createSupabaseComponentClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    // Nothing cached for an earlier user of this browser may be shown to
    // the user who just signed in.
    queryClient.clear();
    router.push("/dashboard");
    // Re-render the Server Components with the new session cookie.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
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
        error={fieldErrors.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          {...fieldAria("password", fieldErrors.password?.[0])}
        />
      </FormField>

      {formError && (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Log in
      </Button>
    </form>
  );
}
