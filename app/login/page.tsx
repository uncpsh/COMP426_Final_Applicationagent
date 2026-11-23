/**
 * Route for the login page (`/login`). Public.
 *
 * This Server Component only decides who may see the form: a visitor who is
 * already signed in is sent to the dashboard. The interactive form lives in
 * `login-form.tsx`.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { getOptionalUser } from "@/utils/supabase/auth";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function Page() {
  if (await getOptionalUser()) redirect("/dashboard");

  return (
    <AuthCard
      title="Log in"
      description="Welcome back. Pick up where you left off."
      footer={
        <>
          New here?
          <Link
            href="/signup"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
