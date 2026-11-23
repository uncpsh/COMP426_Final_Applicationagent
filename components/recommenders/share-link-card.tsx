/**
 * (P1) The "Portal link" card on a recommender's page: turn their private
 * page (`/r/[token]`) on or off, copy its link, or replace the link.
 *
 * The link contains a secret, so the server never sends it along with the
 * recommender's other data. It only comes back as the answer to
 * `recommenders.setSharing`, which is why an existing link has to be asked
 * for with "Show link".
 */

"use client";

import { Copy, Link2, Loader2Icon, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/trpc/api";

type ShareLinkCardProps = {
  recommender: { id: string; name: string; shareEnabled: boolean };
};

export function ShareLinkCard({ recommender }: ShareLinkCardProps) {
  const apiUtils = api.useUtils();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const setSharing = api.recommenders.setSharing.useMutation({
    onSuccess: async (state) => {
      setShareUrl(state.shareUrl);
      // `shareEnabled` is part of the recommender, so reload it.
      await Promise.all([
        apiUtils.recommenders.byId.invalidate({ id: recommender.id }),
        apiUtils.recommenders.list.invalidate(),
      ]);
    },
    onError: () => {
      toast.error("Could not change the link. Try again.");
    },
  });

  /** Runs `setSharing` and says what happened once it has worked. */
  function change(
    options: { enabled: boolean; regenerateToken?: boolean },
    message?: string,
  ) {
    setSharing.mutate(
      { id: recommender.id, ...options },
      {
        onSuccess: () => {
          if (message) toast.success(message);
          setIsResetting(false);
        },
      },
    );
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  }

  const spinner = setSharing.isPending && (
    <Loader2Icon className="animate-spin" aria-hidden />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal link</CardTitle>
        <CardDescription>
          A private page for {recommender.name}: the letters you have asked for,
          each with a button to mark it as submitted. No account needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {!recommender.shareEnabled ? (
          <>
            <p className="text-muted-foreground">
              The link is off. Nobody can open the page.
            </p>
            <Button
              variant="outline"
              className="justify-self-start"
              disabled={setSharing.isPending}
              onClick={() => change({ enabled: true }, "Link turned on")}
            >
              {spinner || <Link2 aria-hidden />} Turn on link
            </Button>
          </>
        ) : (
          <>
            <p>
              The link is <span className="font-medium">on</span>. Anyone who
              has it can open the page.
            </p>
            {shareUrl ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  aria-label={`Portal link for ${recommender.name}`}
                  value={shareUrl}
                  // One click selects the whole link, ready to copy.
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 font-mono text-xs md:text-xs"
                />
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => void copyLink(shareUrl)}
                >
                  <Copy aria-hidden /> Copy
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="justify-self-start"
                disabled={setSharing.isPending}
                onClick={() => change({ enabled: true })}
              >
                {spinner || <Link2 aria-hidden />} Show link
              </Button>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={setSharing.isPending}
                onClick={() => setIsResetting(true)}
              >
                <RotateCcw aria-hidden /> Replace link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={setSharing.isPending}
                onClick={() => change({ enabled: false }, "Link turned off")}
              >
                Turn off
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={isResetting}
        onOpenChange={setIsResetting}
        title="Replace this link?"
        description={`The current link stops working at once. ${recommender.name} will need the new link to open the page again.`}
        confirmLabel="Replace"
        isPending={setSharing.isPending}
        onConfirm={() =>
          change({ enabled: true, regenerateToken: true }, "Link replaced")
        }
      />
    </Card>
  );
}
