/**
 * Route for the sign-up page (`/signup`). Public.
 *
 * This Server Component only decides who may see the form: a visitor who is
 * already signed in is sent to the dashboard. The interactive form lives in
 * `signup-form.tsx`.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { getOptionalUser } from "@/utils/supabase/auth";
import SignupForm from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function Page() {
  if (await getOptionalUser()) redirect("/dashboard");

  return (
    <AuthCard
      title="Create your account"
      description="Track every application, letter and document in one place."
      footer={
        <>
          Already have an account?
          <Link
            href="/login"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
