/**
 * The "Documents" section of the application page.
 *
 * Placeholder for step 5.3: it already lists the document versions that
 * `applications.byId` returns, read-only. Attaching, detaching and
 * downloading a version are added in Phase 5.
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DOC_TYPE_LABELS } from "@/utils/labels";
import type { RouterOutputs } from "@/utils/trpc/api";

type DocumentsSectionProps = {
  application: RouterOutputs["applications"]["byId"];
};

export function DocumentsSection({ application }: DocumentsSectionProps) {
  const { documents } = application;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          The exact version of each essay or resume sent with this application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No documents attached yet. Attaching document versions is coming in
            a later phase.
          </p>
        ) : (
          <ul className="grid gap-2">
            {documents.map((attached) => (
              <li
                key={attached.versionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {attached.document.title}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {DOC_TYPE_LABELS[attached.document.type]} ·{" "}
                    {attached.fileName}
                  </p>
                </div>
                <Badge variant="secondary">
                  Version {attached.versionNumber}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
