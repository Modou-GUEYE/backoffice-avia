import React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { useAdministration } from "../../viewmodels/useAdministration";

interface AdministrationFormCardProps {
  vm: ReturnType<typeof useAdministration>;
}

export const AdministrationFormCard: React.FC<AdministrationFormCardProps> = ({ vm }) => {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {vm.editingAdministrationId ? "Modifier l'administration" : "Nouvelle administration"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Créez ou modifiez l'entité d'administration globale.
          </p>
        </div>
        {vm.editingAdministrationId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={vm.resetAdministrationForm}
          >
            Annuler
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Nom <span className="text-destructive">*</span></Label>
        <Input
          value={vm.administrationForm.name}
          {...invalidFieldProps(vm.formErrors.name)}
          onChange={(e) => {
            vm.clearFormError("name");
            vm.setAdministrationForm({
              ...vm.administrationForm,
              name: e.target.value,
            });
          }}
          placeholder="Administration centrale"
        />
        <FieldError message={vm.formErrors.name} />
      </div>

      <div className="space-y-2">
        <Label>Email de contact</Label>
        <Input
          type="email"
          value={vm.administrationForm.contact_email}
          onChange={(e) =>
            vm.setAdministrationForm({
              ...vm.administrationForm,
              contact_email: e.target.value,
            })
          }
          placeholder="admin@entreprise.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Téléphone de contact</Label>
        <Input
          value={vm.administrationForm.contact_phone}
          onChange={(e) =>
            vm.setAdministrationForm({
              ...vm.administrationForm,
              contact_phone: e.target.value,
            })
          }
          placeholder="+221 77 000 00 00"
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={vm.saveAdministration}
          className="gradient-accent text-accent-foreground hover:opacity-90"
        >
          <Save className="h-4 w-4 mr-2" />
          {vm.editingAdministrationId ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </div>
  );
};
