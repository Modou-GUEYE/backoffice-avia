import React from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriptionPeriodicity, ServiceResponse } from "../../models/types";
import { SubscriptionFormField, SubscriptionFormState } from "../../viewmodels/useAbonnements";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { StructureRead } from "@/features/structures/models/types";

interface AbonnementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  form: SubscriptionFormState;
  setForm: React.Dispatch<React.SetStateAction<SubscriptionFormState>>;
  errors?: FieldErrors<SubscriptionFormField>;
  onClearError?: (field: SubscriptionFormField) => void;
  structures: StructureRead[];
  /** Structure imposée par le périmètre de l'utilisateur (non modifiable). */
  structureLocked?: boolean;
  services: ServiceResponse[];
  actionLoading: boolean;
  onSubmit: () => void | Promise<void>;
}

export const AbonnementDialog: React.FC<AbonnementDialogProps> = ({
  open,
  onOpenChange,
  isEdit,
  form,
  setForm,
  errors = {},
  onClearError,
  structures,
  structureLocked = false,
  services,
  actionLoading,
  onSubmit,
}) => {
  const safeServices = Array.isArray(services) ? services : [];
  const activeServices = safeServices.filter((s) => s.status?.toUpperCase() === "ACTIVE");

  const handleCheckboxChange = (srvId: string, checked: boolean) => {
    setForm((prev) => {
      const current = prev.service_ids || [];
      if (checked) {
        return { ...prev, service_ids: [...current, srvId] };
      } else {
        return { ...prev, service_ids: current.filter((id) => id !== srvId) };
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEdit ? "Modifier l'abonnement" : "Ajouter un abonnement"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Libellé */}
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">
                Libellé de l'abonnement <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex: Formule Premium, Standard..."
                value={form.label}
                {...invalidFieldProps(errors.label)}
                onChange={(e) => {
                  onClearError?.("label");
                  setForm((prev) => ({ ...prev, label: e.target.value }));
                }}
              />
              <FieldError message={errors.label} />
            </div>

            {/* Structure Selector */}
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold flex items-center gap-1">
                Structure cible <span className="text-destructive">*</span>
                {structureLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <Select
                value={form.structure_id}
                onValueChange={(val) => {
                  onClearError?.("structure_id");
                  setForm((prev) => ({ ...prev, structure_id: val }));
                }}
                disabled={isEdit || structureLocked}
              >
                <SelectTrigger {...invalidFieldProps(errors.structure_id, "w-full")}>
                  <SelectValue placeholder="Sélectionner la structure" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.structure_id} />
            </div>

            {/* Periodicity */}
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">
                Périodicité <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.periodicity}
                onValueChange={(val: SubscriptionPeriodicity) => {
                  onClearError?.("periodicity");
                  setForm((prev) => ({ ...prev, periodicity: val }));
                }}
              >
                <SelectTrigger {...invalidFieldProps(errors.periodicity, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensuelle</SelectItem>
                  <SelectItem value="QUARTERLY">Trimestrielle</SelectItem>
                  <SelectItem value="SEMI_ANNUAL">Semestrielle</SelectItem>
                  <SelectItem value="ANNUAL">Annuelle</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.periodicity} />
            </div>

            {/* Amount */}
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">
                Tarif (F CFA) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                placeholder="Ex: 5000"
                value={form.amount}
                {...invalidFieldProps(errors.amount)}
                onChange={(e) => {
                  onClearError?.("amount");
                  setForm((prev) => ({ ...prev, amount: e.target.value }));
                }}
              />
              <FieldError message={errors.amount} />
            </div>

            {/* Expiration Date */}
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">Date d'expiration</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((prev) => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>

            {/* Spacer for 2-column alignment */}
            <div className="hidden sm:block col-span-1" />

            {/* Description */}
            <div className="space-y-1.5 col-span-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                placeholder="Description détaillée de la formule..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="min-h-[85px] resize-y"
              />
            </div>

            {/* Services Checkbox List */}
            <div className="space-y-2 col-span-2">
              <Label className="text-sm font-semibold block">
                Fonctionnalités à restreindre
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Cochez les fonctionnalités qui ne doivent pas être prises en compte.
              </p>
              <div className="grid grid-cols-2 gap-3 border p-3 rounded-lg max-h-[160px] overflow-y-auto bg-muted/20">
                {activeServices.length === 0 ? (
                  <p className="text-xs text-muted-foreground col-span-2 py-2 text-center">
                    Aucune fonctionnalité active disponible.
                  </p>
                ) : (
                  activeServices.map((srv) => (
                    <div key={srv.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`srv-${srv.id}`}
                        className="rounded-[4px] border-2 h-5 w-5"
                        checked={form.service_ids.includes(srv.id)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(srv.id, Boolean(checked))
                        }
                      />
                      <label
                        htmlFor={`srv-${srv.id}`}
                        className="text-xs text-foreground cursor-pointer select-none font-medium"
                      >
                        {srv.label}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={actionLoading}>
            Annuler
          </Button>
          <Button
            onClick={onSubmit}
            disabled={actionLoading}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            {actionLoading ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
