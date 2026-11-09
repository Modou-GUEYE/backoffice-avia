import React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, type FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { Landmark } from "lucide-react";
import type { CaisseForm, CaisseRead } from "../../models/types";
import type { CaisseFormField } from "../../viewmodels/useCaisses";

interface AgenceOptionItem {
  id: string;
  nom: string;
  parent_id?: string | null;
  parent_type?: "STRUCTURE" | "DISTRIBUTOR" | null;
}

interface CaisseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCaisse: CaisseRead | null;
  form: CaisseForm;
  setForm: React.Dispatch<React.SetStateAction<CaisseForm>> | ((form: CaisseForm) => void);
  agenceOptions: AgenceOptionItem[];
  onSave: () => void;
  disabled?: boolean;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<CaisseFormField>;
  /** Efface l'erreur d'un champ quand l'utilisateur le modifie. */
  onClearError?: (field: CaisseFormField) => void;
}

export const CaisseFormDialog: React.FC<CaisseFormDialogProps> = ({
  open,
  onOpenChange,
  editingCaisse,
  form,
  setForm,
  agenceOptions,
  onSave,
  disabled = false,
  errors = {},
  onClearError,
}) => {
  const isEditing = Boolean(editingCaisse);

  const updateField = <K extends keyof CaisseForm>(field: K, value: CaisseForm[K]) => {
    onClearError?.(field);
    setForm({
      ...form,
      [field]: value,
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Modifier la caisse" : "Nouvelle caisse"}
      description={
        isEditing
          ? "Modifiez les informations de la caisse opérationnelle."
          : "Ajoutez une nouvelle caisse et rattachez-la à une agence."
      }
      submitLabel={isEditing ? "Enregistrer" : "Créer la caisse"}
      onSubmit={onSave}
      submitDisabled={disabled}
      contentClassName="sm:max-w-lg max-h-[90vh] overflow-y-auto"
      submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
    >
      <div className="space-y-4 py-2">
        {/* Header Icon & Title Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center shadow-sm text-accent-foreground shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">
              {form.name || (isEditing ? editingCaisse?.name : "Nom de la caisse")}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-muted-foreground">
                {form.code || (isEditing ? editingCaisse?.code : "Code caisse")}
              </span>
              {isEditing && editingCaisse && (
                <Badge
                  className={
                    editingCaisse.is_active
                      ? "bg-accent/15 text-accent border-accent/30 text-[10px] px-1.5 py-0"
                      : "bg-destructive/15 text-destructive border-destructive/30 text-[10px] px-1.5 py-0"
                  }
                  variant="outline"
                >
                  {editingCaisse.is_active ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Sélection Agence */}
        <div className="space-y-2">
          <Label htmlFor="caisse-agency" className="text-xs font-semibold">
            Agence de rattachement <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.agency_id || undefined}
            onValueChange={(val) => updateField("agency_id", val)}
          >
            <SelectTrigger id="caisse-agency" {...invalidFieldProps(errors.agency_id, "bg-background/50")}>
              <SelectValue placeholder="Sélectionner une agence" />
            </SelectTrigger>
            <SelectContent>
              {agenceOptions.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.agency_id} />
        </div>

        {/* Nom & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="caisse-name" className="text-xs font-semibold">
              Nom de la caisse <span className="text-destructive">*</span>
            </Label>
            <Input
              id="caisse-name"
              placeholder="Ex: Caisse Principale"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              {...invalidFieldProps(errors.name, "bg-background/50")}
            />
            <FieldError message={errors.name} />
            <span className="text-[11px] text-muted-foreground block">
              2 à 255 caractères
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caisse-code" className="text-xs font-semibold">
              Code de la caisse <span className="text-destructive">*</span>
            </Label>
            <Input
              id="caisse-code"
              placeholder="Ex: CSS001"
              value={form.code ?? ""}
              onChange={(e) => updateField("code", e.target.value)}
              {...invalidFieldProps(errors.code, "bg-background/50 font-mono")}
            />
            <FieldError message={errors.code} />
            <span className="text-[11px] text-muted-foreground block">
              2 à 50 caractères
            </span>
          </div>
        </div>
      </div>
    </FormDialog>
  );
};
