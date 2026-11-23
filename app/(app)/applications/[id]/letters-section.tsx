/**
 * The "Recommendation letters" section of the application page: assign a
 * recommender, and change each letter's status, due date and notes.
 *
 * The letters come from `applications.byId` (passed in as a prop); every
 * change goes through the `recommendations` router and then reloads it.
 */

"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AssignRecommenderDialog } from "@/components/letters/assign-recommender-dialog";
import { LetterItem } from "@/components/letters/letter-item";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RouterOutputs } from "@/utils/trpc/api";

type LettersSectionProps = {
  application: RouterOutputs["applications"]["byId"];
};

export function LettersSection({ application }: LettersSectionProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const { letters } = application;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="grid gap-1.5">
          <CardTitle>Recommendation letters</CardTitle>
          <CardDescription>
            Who is writing for this application, and where each letter stands.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setIsAssigning(true)}
        >
          <Plus aria-hidden /> Assign
        </Button>
      </CardHeader>
      <CardContent>
        {letters.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No recommenders assigned yet. Assign one to start tracking their
            letter.
          </p>
        ) : (
          <ul className="grid gap-2">
            {letters.map((letter) => (
              <LetterItem
                key={letter.id}
                letter={letter}
                applicationDeadlineAt={application.deadlineAt}
                subject={`${letter.recommender.name} · ${application.organization}`}
              >
                <Link
                  href={`/recommenders/${letter.recommender.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {letter.recommender.name}
                </Link>
                {letter.recommender.title && (
                  <p className="text-muted-foreground truncate text-xs">
                    {letter.recommender.title}
                  </p>
                )}
              </LetterItem>
            ))}
          </ul>
        )}
      </CardContent>

      <AssignRecommenderDialog
        open={isAssigning}
        onOpenChange={setIsAssigning}
        application={application}
        assignedRecommenderIds={letters.map((letter) => letter.recommenderId)}
      />
    </Card>
  );
}
