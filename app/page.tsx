/**
 * Route for the landing page (`/`). Public: no login required.
 *
 * Placeholder that proves the template renders and deploys. The real landing
 * page (value proposition, screenshots, sign-up button) is built in step 2.2.
 */

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-bold">AppTrail</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        One place to track grad school and internship applications: deadlines,
        status, recommendation letters and document versions.
      </p>
    </main>
  );
}
