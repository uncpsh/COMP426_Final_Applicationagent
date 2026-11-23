"use client";

import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/utils/trpc/api";

type DeleteApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: { id: string; organization: string; position: string };
  /** Called after the application is gone, e.g. to leave its page. */
  onDeleted: () => void;
};

/** Asks for confirmation before deleting, because it cannot be undone. */
export function DeleteApplicationDialog({
  open,
  onOpenChange,
  application,
  onDeleted,
}: DeleteApplicationDialogProps) {
  const apiUtils = api.useUtils();

  const deleteApplication = api.applications.delete.useMutation({
    onSuccess: async () => {
      // Its letters and attachments went with it (cascade), so the
      // recommender and document pages are out of date as well.
      await Promise.all([
        apiUtils.applications.list.invalidate(),
        apiUtils.recommenders.invalidate(),
        apiUtils.documents.invalidate(),
        apiUtils.dashboard.summary.invalidate(),
      ]);
      toast.success("Application deleted");
      onOpenChange(false);
      onDeleted();
    },
    onError: () => {
      toast.error("Could not delete the application. Try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this application?</DialogTitle>
          <DialogDescription>
            {application.organization} · {application.position} will be deleted,
            together with its letter requests and document attachments. Your
            recommenders and documents are kept. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-destructive hover:bg-destructive/90 text-white"
            disabled={deleteApplication.isPending}
            onClick={() => deleteApplication.mutate({ id: application.id })}
          >
            {deleteApplication.isPending && (
              <Loader2Icon className="animate-spin" aria-hidden />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
