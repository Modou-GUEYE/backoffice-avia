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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText, Tag, AlignLeft } from "lucide-react";
import { useForms } from "../../viewmodels/useForms";
import { FormSection } from "./FormSection";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface FormModalDialogProps {
  formsVm: ReturnType<typeof useForms>;
}

type FormFormData = ReturnType<typeof useForms>["formFormData"];

export const FormModalDialog: React.FC<FormModalDialogProps> = ({ formsVm }) => {
  const formData = formsVm.formFormData;
  const isEditing = Boolean(formsVm.editingForm);

  const errors = formsVm.formFormErrors;

  const updateField = <K extends keyof FormFormData>(field: K, value: FormFormData[K]) => {
    formsVm.setFormFormData({ ...formData, [field]: value });
    if (field === "code" || field === "title") formsVm.clearFormFormError(field);
  };

  return (
    <Dialog open={formsVm.showFormDialog} onOpenChange={formsVm.setShowFormDialog}>
      <DialogContent className="sm:max-w-lg bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {formsVm.isSavingForm && (
          <LoadingOverlay
            title={isEditing ? "Modification du formulaire" : "Création du formulaire"}
            description="Veuillez patienter pendant l'enregistrement du formulaire..."
          />
        )}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-foreground">
              {isEditing ? "Modifier le formulaire" : "Nouveau formulaire"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? "Modifiez les paramètres de ce formulaire."
                : "Créez un nouveau formulaire de saisie pour les workflows."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Identification */}
          <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="formCode" className="text-xs font-semibold">
                  Code unique <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="formCode"
                  {...invalidFieldProps(errors.code, "h-9 text-xs bg-background font-mono")}
                  placeholder="Ex. DEB_FORM"
                  value={formData.code}
                  onChange={(e) => updateField("code", e.target.value)}
                />
                <FieldError message={errors.code} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="formTitle" className="text-xs font-semibold">
                  Titre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="formTitle"
                  {...invalidFieldProps(errors.title, "h-9 text-xs bg-background")}
                  placeholder="Ex. Formulaire d'enrôlement"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
                <FieldError message={errors.title} />
              </div>
            </div>
          </FormSection>

          {/* Description */}
          <FormSection
            icon={<AlignLeft className="h-3.5 w-3.5 text-accent" />}
            title="Description"
            description="Optionnelle. Précisez l'usage de ce formulaire."
          >
            <Textarea
              id="formDesc"
              rows={4}
              className="text-xs bg-background resize-none"
              placeholder="Décrivez l'usage de ce formulaire..."
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </FormSection>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
          <Button
            variant="ghost"
            onClick={() => formsVm.setShowFormDialog(false)}
            className="text-xs h-9"
            disabled={formsVm.isSavingForm}
          >
            Annuler
          </Button>
          <Button
            onClick={() => void formsVm.handleCreateOrUpdateForm()}
            disabled={formsVm.isSavingForm}
            className="gradient-accent text-accent-foreground text-xs h-9"
          >
            Enregistrer le formulaire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
