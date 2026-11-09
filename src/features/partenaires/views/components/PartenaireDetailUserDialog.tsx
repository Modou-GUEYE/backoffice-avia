import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";
import { deriveLogin } from "../../viewmodels/usePartenaires";
import { FieldError, type FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { PartenaireDetailUserFormField } from "../../models/validation";

export type UserFormData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  profile: string;
};

export type PartenaireDetailUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  userForm: UserFormData;
  setUserForm: React.Dispatch<React.SetStateAction<UserFormData>>;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<PartenaireDetailUserFormField>;
  clearError?: (field: PartenaireDetailUserFormField) => void;
  onSave: () => void;
  savingUser: boolean;
  partnerCategory?: "marchand" | "facturier" | string;
  existingUsernames?: string[];
};

export const PartenaireDetailUserDialog: React.FC<PartenaireDetailUserDialogProps> = ({
  open,
  onOpenChange,
  isEditing,
  userForm,
  setUserForm,
  errors = {},
  clearError,
  onSave,
  savingUser,
  partnerCategory = "marchand",
  existingUsernames = [],
}) => {
  const availableProfiles = useMemo(() => {
    const base =
      partnerCategory === "facturier"
        ? ["profile.bo.partenaire-admin", "profile.bo.partenaire-facturier"]
        : ["profile.bo.partenaire-admin", "profile.bo.partenaire-marchand"];

    if (userForm.profile && !base.includes(userForm.profile)) {
      return [userForm.profile, ...base];
    }
    return base;
  }, [partnerCategory, userForm.profile]);

  const handleFirstNameChange = (value: string) => {
    clearError?.("firstName");
    clearError?.("username");
    if (!isEditing) {
      const generated = deriveLogin(value, userForm.lastName, existingUsernames);
      setUserForm((prev) => ({
        ...prev,
        firstName: value,
        username: generated,
      }));
    } else {
      setUserForm((prev) => ({ ...prev, firstName: value }));
    }
  };

  const handleLastNameChange = (value: string) => {
    clearError?.("lastName");
    clearError?.("username");
    if (!isEditing) {
      const generated = deriveLogin(userForm.firstName, value, existingUsernames);
      setUserForm((prev) => ({
        ...prev,
        lastName: value,
        username: generated,
      }));
    } else {
      setUserForm((prev) => ({ ...prev, lastName: value }));
    }
  };

  let submitLabel = isEditing ? "Modifier l'utilisateur" : "Ajouter l'utilisateur";
  if (savingUser) {
    submitLabel = isEditing ? "Modification..." : "Création...";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du compte rattaché à ce partenaire."
              : "Créez un compte utilisateur rattaché à ce partenaire."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              value={userForm.firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              placeholder="Prénom"
              {...invalidFieldProps(errors.firstName)}
            />
            <FieldError message={errors.firstName} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              value={userForm.lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="Nom"
              {...invalidFieldProps(errors.lastName)}
            />
            <FieldError message={errors.lastName} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Nom d'utilisateur <span className="text-destructive">*</span>
            </Label>
            <Input
              value={userForm.username}
              disabled={isEditing}
              readOnly={isEditing}
              {...invalidFieldProps(
                errors.username,
                isEditing ? "bg-muted cursor-not-allowed opacity-80 font-mono text-xs" : "",
              )}
              onChange={(e) => {
                if (isEditing) return;
                clearError?.("username");
                setUserForm((prev) => ({ ...prev, username: e.target.value }));
              }}
              placeholder="Généré automatiquement"
            />
            <FieldError message={errors.username} />
            {isEditing && (
              <p className="text-[10px] text-muted-foreground">
                L'identifiant de connexion ne peut pas être modifié.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              E-mail <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={userForm.email}
              {...invalidFieldProps(errors.email)}
              onChange={(e) => {
                clearError?.("email");
                setUserForm((prev) => ({ ...prev, email: e.target.value }));
              }}
              placeholder="utilisateur@domaine.com"
            />
            <FieldError message={errors.email} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">
              Profil / Rôle <span className="text-destructive">*</span>
            </Label>
            <Select
              value={userForm.profile}
              onValueChange={(profile) => {
                clearError?.("profile");
                setUserForm((prev) => ({ ...prev, profile }));
              }}
            >
              <SelectTrigger {...invalidFieldProps(errors.profile)}>
                <SelectValue placeholder="Sélectionner un profil" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.map((p) => (
                  <SelectItem key={p} value={p}>
                    {getProfileDisplayName(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.profile} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onSave}
            disabled={savingUser}
            className="gradient-accent text-accent-foreground"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartenaireDetailUserDialog;
