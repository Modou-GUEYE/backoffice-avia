import { Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { useReleveDetail } from "../../viewmodels/useReleveDetail";

type NotificationReleveDialogProps = {
  vm: ReturnType<typeof useReleveDetail>;
};

const copy = (value: string, label: string) => {
  void navigator.clipboard.writeText(value);
  toast.success(`${label} copié dans le presse-papiers`);
};

const CopyButton = ({ value, label }: { value: string; label: string }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
    onClick={() => copy(value, label)}
    aria-label={`Copier : ${label}`}
    title={`Copier : ${label}`}
  >
    <Copy className="h-3.5 w-3.5" />
  </Button>
);

/** Notification renvoyée par l'API : objet, message et lien de téléchargement. */
export const NotificationReleveDialog = ({ vm }: NotificationReleveDialogProps) => {
  const notification = vm.notification;

  return (
    <Dialog open={Boolean(notification)} onOpenChange={(open) => !open && vm.closeNotification()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-accent" />
            Notification du relevé
          </DialogTitle>
          <DialogDescription>
            {notification ? `${vm.structureLabel} · ${notification.periode}` : ""}
          </DialogDescription>
        </DialogHeader>

        {notification && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Objet</span>
                <CopyButton value={notification.objet} label="Objet" />
              </div>
              <p className="text-sm font-semibold text-foreground rounded-lg border border-border/60 bg-background px-3 py-2">
                {notification.objet}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Message</span>
                <CopyButton value={notification.message} label="Message" />
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg border border-border/60 bg-background px-3 py-2">
                {notification.message}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Lien de téléchargement</span>
                <CopyButton value={notification.lien_telechargement} label="Lien" />
              </div>
              <p className="text-xs font-mono text-foreground break-all rounded-lg border border-border/60 bg-background px-3 py-2 select-all">
                {notification.lien_telechargement}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {notification && (
            <Button
              variant="outline"
              onClick={() =>
                copy(`${notification.objet}\n\n${notification.message}\n\n${notification.lien_telechargement}`, "Notification")
              }
            >
              <Copy className="h-4 w-4 mr-2" />
              Tout copier
            </Button>
          )}
          <Button onClick={vm.closeNotification} className="gradient-accent text-accent-foreground">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationReleveDialog;
