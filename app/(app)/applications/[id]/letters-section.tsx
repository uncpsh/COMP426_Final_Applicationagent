/**
 * The "Recommendation letters" section of the application page.
 *
 * Placeholder for step 4.3: it already lists the letters that
 * `applications.byId` returns, read-only. Assigning a recommender and
 * changing a letter's status and due date are added in Phase 4.
 */

import { DeadlineText } from "@/components/deadline-text";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LETTER_STATUS_LABELS } from "@/utils/labels";
import type { RouterOutputs } from "@/utils/trpc/api";

type LettersSectionProps = {
  application: RouterOutputs["applications"]["byId"];
};

export function LettersSection({ application }: LettersSectionProps) {
  const { letters } = application;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendation letters</CardTitle>
        <CardDescription>
          Who is writing for this application, and where each letter stands.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {letters.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No recommenders assigned yet. Assigning recommenders is coming in
            the next phase.
          </p>
        ) : (
          <ul className="grid gap-2">
            {letters.map((letter) => (
              <li
                key={letter.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {letter.recommender.name}
                  </p>
                  {letter.recommender.title && (
                    <p className="text-muted-foreground truncate text-xs">
                      {letter.recommender.title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* A letter without its own due date follows the application's deadline. */}
                  <DeadlineText
                    dueAt={letter.dueAt ?? application.deadlineAt}
                    isOpen={
                      letter.status !== "submitted" &&
                      letter.status !== "declined"
                    }
                    className="text-right text-xs"
                  />
                  <Badge variant="secondary">
                    {LETTER_STATUS_LABELS[letter.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
