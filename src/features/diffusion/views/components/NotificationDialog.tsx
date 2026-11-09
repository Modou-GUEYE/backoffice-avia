import { useState } from "react";
import { NotificationRead, NotificationFormState, NotificationCanal } from "../../models/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { NotificationFormField } from "../../viewmodels/useDiffusion";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNotification: NotificationRead | null;
  form: NotificationFormState;
  setForm: (form: NotificationFormState | ((prev: NotificationFormState) => NotificationFormState)) => void;
  transactionTypes: string[];
  channels: string[];
  onSave: () => void;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<NotificationFormField>;
  clearError?: (field: NotificationFormField) => void;
  /** Valide le formulaire (et affiche les erreurs) avant la confirmation de modification. */
  onValidate?: () => boolean;
}

export const NotificationDialog = ({
  open,
  onOpenChange,
  editingNotification,
  form,
  setForm,
  transactionTypes,
  channels,
  onSave,
  errors = {},
  clearError,
  onValidate,
}: NotificationDialogProps) => {
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingNotification ? "Modifier la notification" : "Nouvelle notification automatique"}
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres du message automatique déclenché lors des transactions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Libellé <span className="text-destructive">*</span></Label>
            <Input
              value={form.libelle}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, libelle: e.target.value }));
                clearError?.("libelle");
              }}
              placeholder="Ex: Notification de virement standard"
              {...invalidFieldProps(errors.libelle, "text-xs")}
            />
            <FieldError message={errors.libelle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type de transaction <span className="text-destructive">*</span></Label>
              <Select
                value={form.type_transaction}
                onValueChange={(val) => {
                  setForm((prev) => ({ ...prev, type_transaction: val }));
                  clearError?.("type_transaction");
                }}
              >
                <SelectTrigger {...invalidFieldProps(errors.type_transaction, "text-xs")}>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((tt) => (
                    <SelectItem key={tt} value={tt} className="text-xs capitalize">
                      {tt === "transfert_b2w" ? "Transfert B2W" : tt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.type_transaction} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Canal de diffusion <span className="text-destructive">*</span></Label>
              <Select
                value={form.canal}
                onValueChange={(val: NotificationCanal) => {
                  setForm((prev) => ({ ...prev, canal: val }));
                  clearError?.("canal");
                }}
              >
                <SelectTrigger {...invalidFieldProps(errors.canal, "text-xs")}>
                  <SelectValue placeholder="Sélectionnez un canal" />
                </SelectTrigger>
                <SelectContent>
                  {(channels.length > 0 ? channels : ["sms", "email", "app"]).map((ch) => (
                    <SelectItem key={ch} value={ch === "email" ? "mail" : ch} className="text-xs">
                      {ch === "email" ? "E-mail" : ch.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.canal} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Contenu pour l'envoyeur</Label>
            <Textarea
              value={form.contenu_envoyeur}
              onChange={(e) => setForm((prev) => ({ ...prev, contenu_envoyeur: e.target.value }))}
              placeholder="Ex: Votre virement de {montant} a bien été émis le {date}."
              className="text-xs min-h-[70px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Contenu pour le destinataire</Label>
            <Textarea
              value={form.contenu_destinataire}
              onChange={(e) => setForm((prev) => ({ ...prev, contenu_destinataire: e.target.value }))}
              placeholder="Ex: Vous avez reçu un virement de {montant} de la part de {emetteur}."
              className="text-xs min-h-[70px]"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (editingNotification) {
                if (onValidate && !onValidate()) return;
                onOpenChange(false);
                setConfirmUpdate(true);
              } else {
                onSave();
              }
            }}
            className="text-xs gradient-accent text-accent-foreground"
          >
            {editingNotification ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation de modification */}
    <Dialog
      open={confirmUpdate}
      onOpenChange={(open) => {
        setConfirmUpdate(open);
        if (!open && editingNotification) {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer la modification</DialogTitle>
          <DialogDescription>
            Voulez-vous vraiment effectuer cette action ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConfirmUpdate(false);
              onOpenChange(true);
            }}
            className="text-xs"
          >
            Non
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setConfirmUpdate(false);
              onSave();
            }}
            className="gradient-accent text-accent-foreground text-xs"
          >
            Oui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default NotificationDialog;
