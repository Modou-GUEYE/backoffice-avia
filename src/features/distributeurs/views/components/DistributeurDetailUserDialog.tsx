import React, { useMemo } from "react";
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
import {
  getProfileDisplayName,
  getDefaultProfileRoles,
} from "@/features/utilisateurs/models/profileLabels";
import { deriveLogin } from "../../viewmodels/useDistributeurUsers";
import type { DistributeurUserForm } from "../../models/types";
import type { DistributeurUserFormField } from "../../models/validation";

export interface DistributeurDetailUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  userForm: DistributeurUserForm;
  setUserForm: React.Dispatch<React.SetStateAction<DistributeurUserForm>>;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<DistributeurUserFormField>;
  clearError?: (field: DistributeurUserFormField) => void;
  onSubmit: () => Promise<void>;
  loading?: boolean;
  availableRoles?: string[];
  existingUsernames?: string[];
}

export const DistributeurDetailUserDialog: React.FC<DistributeurDetailUserDialogProps> = ({
  open,
  onOpenChange,
  isEditing,
  userForm,
  setUserForm,
  errors = {},
  clearError,
  onSubmit,
  loading = false,
  availableRoles = [],
  existingUsernames = [],
}) => {
  const rolesList = useMemo(() => {
    const defaultRoles = getDefaultProfileRoles("Distributeur");
    const merged = new Set([...availableRoles, ...defaultRoles]);
    if (userForm.profil) {
      merged.add(userForm.profil);
    }
    return Array.from(merged).filter(Boolean);
  }, [availableRoles, userForm.profil]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
      description={
        isEditing
          ? "Mettez à jour les informations du compte utilisateur."
          : "Renseignez les informations pour créer un nouvel utilisateur."
      }
      submitLabel={isEditing ? "Modifier" : "Ajouter"}
      onSubmit={onSubmit}
      submitDisabled={loading}
      contentClassName="max-w-2xl"
      submitClassName="gradient-accent text-accent-foreground"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Prénom */}
        <div className="space-y-1.5">
          <Label>
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Prénom"
            value={userForm.prenom}
            {...invalidFieldProps(errors.prenom)}
            onChange={(e) => {
              clearError?.("prenom");
              clearError?.("username");
              const prenom = e.target.value;
              const generatedLogin = isEditing
                ? userForm.username
                : deriveLogin(prenom, userForm.nom, existingUsernames);
              setUserForm((prev) => ({
                ...prev,
                prenom,
                username: generatedLogin,
              }));
            }}
          />
          <FieldError message={errors.prenom} />
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <Label>
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Nom"
            value={userForm.nom}
            {...invalidFieldProps(errors.nom)}
            onChange={(e) => {
              clearError?.("nom");
              clearError?.("username");
              const nom = e.target.value;
              const generatedLogin = isEditing
                ? userForm.username
                : deriveLogin(userForm.prenom, nom, existingUsernames);
              setUserForm((prev) => ({
                ...prev,
                nom,
                username: generatedLogin,
              }));
            }}
          />
          <FieldError message={errors.nom} />
        </div>

        {/* Login (généré automatiquement depuis prénom + nom) */}
        <div className="space-y-1.5">
          <Label>
            Login <span className="text-destructive">*</span>
          </Label>
          <Input
            value={userForm.username}
            placeholder="Généré automatiquement"
            disabled
            readOnly
            {...invalidFieldProps(errors.username)}
          />
          <FieldError message={errors.username} />
        </div>

        {/* E-mail */}
        <div className="space-y-1.5">
          <Label>
            E-mail <span className="text-destructive">*</span>
          </Label>
          <Input
            type="email"
            placeholder="utilisateur@domaine.com"
            value={userForm.email}
            {...invalidFieldProps(errors.email)}
            onChange={(e) => {
              clearError?.("email");
              setUserForm((prev) => ({ ...prev, email: e.target.value }));
            }}
          />
          <FieldError message={errors.email} />
        </div>

        {/* Téléphone */}
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input
            type="tel"
            placeholder="Ex: +221770000000"
            value={userForm.telephone ?? ""}
            onChange={(e) => setUserForm((prev) => ({ ...prev, telephone: e.target.value }))}
          />
        </div>

        {/* Matricule */}
        <div className="space-y-1.5">
          <Label>Matricule</Label>
          <Input
            placeholder="Matricule"
            value={userForm.matricule ?? ""}
            onChange={(e) => setUserForm((prev) => ({ ...prev, matricule: e.target.value }))}
          />
        </div>

        {/* Profil */}
        <div className="space-y-1.5 col-span-2">
          <Label>
            Profil <span className="text-destructive">*</span>
          </Label>
          <Select
            value={userForm.profil}
            onValueChange={(val) => {
              clearError?.("profil");
              setUserForm((prev) => ({ ...prev, profil: val }));
            }}
          >
            <SelectTrigger {...invalidFieldProps(errors.profil)}>
              <SelectValue placeholder="Sélectionner un profil" />
            </SelectTrigger>
            <SelectContent>
              {rolesList.map((role) => (
                <SelectItem key={role} value={role}>
                  {getProfileDisplayName(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.profil} />
        </div>
      </div>
    </FormDialog>
  );
};
