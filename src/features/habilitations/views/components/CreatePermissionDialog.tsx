import React from "react";
import { KeyRound, Tag, MonitorSmartphone, Power, AlignLeft, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionForm } from "../../models/types";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { PermissionFormField } from "../../viewmodels/useHabilitations";

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit?: boolean;
  /** Code d'origine en modification, pour signaler un renommage. */
  originalCode?: string;
  form: PermissionForm;
  setForm: React.Dispatch<React.SetStateAction<PermissionForm>>;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<PermissionFormField>;
  clearError?: (field: PermissionFormField) => void;
}

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <section className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
    <div>
      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {children}
  </section>
);

export const CreatePermissionDialog: React.FC<PermissionDialogProps> = ({
  open,
  onOpenChange,
  isEdit = false,
  originalCode,
  form,
  setForm,
  isSaving,
  onConfirm,
  onCancel,
  errors = {},
  clearError,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {isSaving && (
          <LoadingOverlay
            title={isEdit ? "Modification de la permission" : "Création de la permission"}
            description="Veuillez patienter pendant l'enregistrement de la permission..."
          />
        )}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-foreground">
              {isEdit ? "Modifier la permission" : "Nouvelle permission"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? "Modifiez les paramètres de cette permission."
                : "Créez une nouvelle permission attribuable aux profils."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Identification */}
          <Section icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="perm-code" className="text-xs font-semibold">
                  Code technique <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="perm-code"
                  type="text"
                  value={form.code}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, code: e.target.value }));
                    clearError?.("code");
                  }}
                  placeholder="Ex. perm.bo.user.list"
                  {...invalidFieldProps(errors.code, "h-9 text-xs bg-background font-mono")}
                />
                <FieldError message={errors.code} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="perm-libelle" className="text-xs font-semibold">
                  Libellé <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="perm-libelle"
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    clearError?.("name");
                  }}
                  placeholder="Ex. Lister les utilisateurs"
                  {...invalidFieldProps(errors.name, "h-9 text-xs bg-background")}
                />
                <FieldError message={errors.name} />
              </div>
            </div>
            {isEdit && originalCode !== undefined && form.code.trim() !== originalCode && (
              <p className="text-[11px] text-amber-600 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                Changer le code renomme le rôle dans Keycloak. Les écrans qui vérifient l'ancien code ne le
                reconnaîtront plus, et les utilisateurs concernés devront se reconnecter.
              </p>
            )}
          </Section>

          {/* Client */}
          {!isEdit && (
            <Section
              icon={<MonitorSmartphone className="h-3.5 w-3.5 text-accent" />}
              title="Application cible"
              description="Client Keycloak auquel la permission est rattachée."
            >
              <Select
                value={form.clientId}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, clientId: val as "backoffice-web" | "mobile-app" }))
                }
              >
                <SelectTrigger id="perm-client" className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Sélectionner le client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backoffice-web" className="text-xs">
                    Back-office (backoffice-web)
                  </SelectItem>
                  <SelectItem value="mobile-app" className="text-xs">
                    Application mobile (mobile-app)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Section>
          )}

          {/* Description */}
          <Section
            icon={<AlignLeft className="h-3.5 w-3.5 text-accent" />}
            title="Description"
            description="Optionnelle. Précisez l'action autorisée par cette permission."
          >
            <Textarea
              id="perm-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ex. Afficher la liste des utilisateurs du back-office..."
              className="text-xs bg-background resize-none"
            />
          </Section>

          {/* Statut */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 flex items-center justify-between gap-4">
            <div>
              <Label
                htmlFor="perm-enabled"
                className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer"
              >
                <Power className="h-3.5 w-3.5 text-accent" />
                Permission active
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Activez ou désactivez cette permission.
              </p>
            </div>
            <Switch
              id="perm-enabled"
              checked={form.enabled ?? true}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
          <Button variant="ghost" disabled={isSaving} onClick={onCancel} className="text-xs h-9">
            Annuler
          </Button>
          <Button
            disabled={isSaving}
            onClick={onConfirm}
            className="gradient-accent text-accent-foreground text-xs h-9"
          >
            Enregistrer la permission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePermissionDialog;
