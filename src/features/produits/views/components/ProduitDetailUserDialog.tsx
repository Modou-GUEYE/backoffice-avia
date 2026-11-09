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
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { ProduitDetailUserFormField } from "../../models/validation";

export type UserFormData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  profile: string;
};

export type ProduitDetailUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  userForm: UserFormData;
  setUserForm: React.Dispatch<React.SetStateAction<UserFormData>>;
  onSave: () => void;
  savingUser: boolean;
  /** Erreurs de validation affichées sous les champs concernés. */
  errors?: FieldErrors<ProduitDetailUserFormField>;
  /** Efface l'erreur d'un champ quand l'utilisateur le modifie. */
  onClearError?: (field: ProduitDetailUserFormField) => void;
  availableProfiles?: string[];
  existingUsernames?: string[];
};

export const deriveLogin = (prenom: string, nom?: string, existingUsernames?: string[]): string => {
  const p = (prenom || "").trim().toLowerCase();
  const n = (nom || "").trim().toLowerCase();
  if (!p && !n) return "";
  const firstLetter = p.charAt(0);
  const cleanNom = n.replace(/[^a-z0-9]/g, "");
  let base = `${firstLetter}.${cleanNom}`;
  if (!cleanNom) base = p.replace(/[^a-z0-9]/g, "");

  if (!existingUsernames || existingUsernames.length === 0) return base;

  let candidate = base;
  let counter = 1;
  while (existingUsernames.includes(candidate)) {
    candidate = `${base}${counter}`;
    counter++;
  }
  return candidate;
};

export const ProduitDetailUserDialog: React.FC<ProduitDetailUserDialogProps> = ({
  open,
  onOpenChange,
  isEditing,
  userForm,
  setUserForm,
  onSave,
  savingUser,
  availableProfiles = [],
  existingUsernames = [],
  errors = {},
  onClearError,
}) => {
  const profilesList = useMemo(() => {
    const defaultProfiles = [
      "profile.bo.produit-central",
      "profile.bo-admin",
      "profile.bo-controller",
    ];
    const set = new Set([...availableProfiles, ...defaultProfiles]);
    if (userForm.profile) {
      set.add(userForm.profile);
    }
    return Array.from(set).filter(Boolean);
  }, [availableProfiles, userForm.profile]);

  const handleFirstNameChange = (value: string) => {
    onClearError?.("firstName");
    if (!isEditing) onClearError?.("username");
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
    onClearError?.("lastName");
    if (!isEditing) onClearError?.("username");
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
              ? "Modifiez les informations du compte rattaché à ce produit."
              : "Créez un compte utilisateur rattaché à ce produit."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              {...invalidFieldProps(errors.firstName)}
              value={userForm.firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              placeholder="Prénom"
            />
            <FieldError message={errors.firstName} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              {...invalidFieldProps(errors.lastName)}
              value={userForm.lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="Nom"
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
                setUserForm((prev) => ({ ...prev, username: e.target.value }));
                onClearError?.("username");
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
              {...invalidFieldProps(errors.email)}
              type="email"
              value={userForm.email}
              onChange={(e) => {
                setUserForm((prev) => ({ ...prev, email: e.target.value }));
                onClearError?.("email");
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
                setUserForm((prev) => ({ ...prev, profile }));
                onClearError?.("profile");
              }}
            >
              <SelectTrigger {...invalidFieldProps(errors.profile)}>
                <SelectValue placeholder="Sélectionner un profil" />
              </SelectTrigger>
              <SelectContent>
                {profilesList.map((p) => (
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

export default ProduitDetailUserDialog;
