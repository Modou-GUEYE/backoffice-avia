import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Server, Tag, Globe, Power } from "lucide-react";
import { IntegrationFormField, useIntegrations } from "../../viewmodels/useIntegrations";
import { FormSection } from "./FormSection";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface IntegrationDialogProps {
  integrationsVm: ReturnType<typeof useIntegrations>;
}

type IntegrationFormData = ReturnType<typeof useIntegrations>["integrationFormData"];

export const IntegrationDialog: React.FC<IntegrationDialogProps> = ({ integrationsVm }) => {
  const formData = integrationsVm.integrationFormData;
  const isEditing = Boolean(integrationsVm.editingIntegration);

  const errors = integrationsVm.integrationFormErrors;

  const updateField = <K extends keyof IntegrationFormData>(field: K, value: IntegrationFormData[K]) => {
    integrationsVm.setIntegrationFormData({ ...formData, [field]: value });
    if (field !== "active") integrationsVm.clearIntegrationFormError(field as IntegrationFormField);
  };

  return (
    <Dialog
      open={integrationsVm.showIntegrationDialog}
      onOpenChange={integrationsVm.setShowIntegrationDialog}
    >
      <DialogContent className="sm:max-w-lg bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {integrationsVm.isSavingIntegration && (
          <LoadingOverlay
            title={isEditing ? "Modification de l'intégration" : "Création de l'intégration"}
            description="Veuillez patienter pendant l'enregistrement de l'intégration..."
          />
        )}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <Server className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-foreground">
              {isEditing ? "Modifier l'intégration" : "Nouvelle intégration"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? "Modifiez les paramètres de cette intégration."
                : "Créez une nouvelle intégration vers un service externe."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Identification */}
          <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="integKey" className="text-xs font-semibold">
                  Clé unique <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="integKey"
                  {...invalidFieldProps(errors.key, "h-9 text-xs bg-background font-mono")}
                  placeholder="Ex. fees-service"
                  value={formData.key}
                  disabled={isEditing}
                  onChange={(e) => updateField("key", e.target.value)}
                />
                <FieldError message={errors.key} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="integLabel" className="text-xs font-semibold">
                  Libellé <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="integLabel"
                  {...invalidFieldProps(errors.label, "h-9 text-xs bg-background")}
                  placeholder="Ex. Service de calcul des frais"
                  value={formData.label}
                  onChange={(e) => updateField("label", e.target.value)}
                />
                <FieldError message={errors.label} />
              </div>
            </div>
          </FormSection>

          {/* Connexion */}
          <FormSection
            icon={<Globe className="h-3.5 w-3.5 text-accent" />}
            title="Connexion"
            description="Adresse du service, accessible par le moteur de workflows."
          >
            <div className="space-y-1.5">
              <Label htmlFor="integBaseUrl" className="text-xs font-semibold">
                URL de base <span className="text-destructive">*</span>
              </Label>
              <Input
                id="integBaseUrl"
                {...invalidFieldProps(errors.base_url, "h-9 text-xs bg-background font-mono")}
                placeholder="Ex. http://fees-service:8000"
                value={formData.base_url}
                onChange={(e) => updateField("base_url", e.target.value)}
              />
              <FieldError message={errors.base_url} />
            </div>
          </FormSection>

          {/* Statut */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="integActive" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                <Power className="h-3.5 w-3.5 text-accent" />
                Intégration active
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Une intégration inactive ne peut pas être appelée par les workflows.
              </p>
            </div>
            <Switch
              id="integActive"
              checked={formData.active}
              onCheckedChange={(checked) => updateField("active", checked)}
            />
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
          <Button
            variant="ghost"
            onClick={() => integrationsVm.setShowIntegrationDialog(false)}
            className="text-xs h-9"
          >
            Annuler
          </Button>
          <Button
            className="gradient-accent text-accent-foreground text-xs h-9"
            disabled={integrationsVm.isSavingIntegration}
            onClick={() => void integrationsVm.handleSaveIntegration()}
          >
            Enregistrer l'intégration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
