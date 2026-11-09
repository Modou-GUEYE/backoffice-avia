import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Mail,
  Plus,
  MoreHorizontal,
  Edit,
  KeyRound,
  Power,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createBackofficeUser,
  updateAccessSecurityUser,
  activateAccessSecurityUser,
  deactivateAccessSecurityUser,
  deleteAccessSecurityUser,
  requestAccessSecurityPasswordReset,
  HierarchyMemberUser,
} from "@/core/security/accessSecurityService";
import {
  StructureDetailUserDialog,
  UserFormData,
} from "../components/StructureDetailUserDialog";
import type { StructureDetailVm } from "./types";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { validateStructureDetailUserForm } from "../../viewmodels/useStructures";

export const StructureUsersTab: React.FC<{ vm: StructureDetailVm }> = ({ vm }) => {
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<HierarchyMemberUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    profile: "profile.bo.structure-admin",
  });
  const [savingUser, setSavingUser] = useState(false);
  const {
    errors: userFormErrors,
    setErrors: setUserFormErrors,
    clearError: clearUserFormError,
    resetErrors: resetUserFormErrors,
  } = useFieldErrors<keyof UserFormData>();

  const handleUserDialogOpenChange = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetUserFormErrors();
    setUserDialogOpen(open);
  };

  const existingUsernames = useMemo(
    () => vm.utilisateurs.map((u) => u.username).filter(Boolean),
    [vm.utilisateurs]
  );

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      profile: "profile.bo.structure-admin",
    });
    handleUserDialogOpenChange(true);
  };

  const openEditUser = (user: HierarchyMemberUser) => {
    setEditingUser(user);
    const parts = vm.parseNameParts(user.username);
    setUserForm({
      firstName: user.first_name || parts.prenom || "",
      lastName: user.last_name || parts.nom || "",
      username: user.username,
      email: user.email || "",
      profile: user.profiles?.[0] || "profile.bo.structure-admin",
    });
    handleUserDialogOpenChange(true);
  };

  const handleSaveUser = async () => {
    if (!vm.structure?.id) return;
    const validationErrors = validateStructureDetailUserForm(userForm);
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;
    setSavingUser(true);
    try {
      const firstName = userForm.firstName.trim();
      const lastName = userForm.lastName.trim();
      const username = userForm.username.trim();
      const email = userForm.email.trim();
      const profile = userForm.profile.trim();

      if (editingUser) {
        const updated = await updateAccessSecurityUser(editingUser.user_id, {
          login: username,
          profiles: [profile],
          profile_client_id: "backoffice-web",
          first_name: firstName || null,
          last_name: lastName || null,
          email,
        });
        vm.setUtilisateurs((prev) =>
          prev.map((u) =>
            u.user_id === editingUser.user_id
              ? {
                  ...u,
                  username,
                  first_name: updated.first_name ?? firstName,
                  last_name: updated.last_name ?? lastName,
                  email: updated.email ?? email,
                  profiles: [profile],
                }
              : u
          )
        );
        setUserDialogOpen(false);
        toast.success("Utilisateur modifié avec succès");
      } else {
        const createdUser = await createBackofficeUser({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          target_scope: [{ ref_type: "STRUCTURE", ref_id: vm.structure.id }],
          profiles: [profile],
        });
        vm.setUtilisateurs((prev) => [
          {
            user_id: createdUser.account_user_id,
            username: createdUser.account_username,
            email,
            first_name: firstName,
            last_name: lastName,
            profiles: [profile],
            active: true,
          },
          ...prev,
        ]);
        setUserDialogOpen(false);
        toast.success("Utilisateur créé avec succès");
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : editingUser
          ? "Impossible de modifier l'utilisateur"
          : "Impossible de créer l'utilisateur"
      );
    } finally {
      setSavingUser(false);
    }
  };

  const handleUserAction = async (
    user: HierarchyMemberUser,
    action: "reset" | "toggle" | "delete"
  ) => {
    try {
      if (action === "reset") {
        await requestAccessSecurityPasswordReset(user.email || user.username, user.email);
        toast.success("Demande de réinitialisation envoyée");
      } else if (action === "delete") {
        await deleteAccessSecurityUser(user.user_id);
        vm.setUtilisateurs((prev) => prev.filter((u) => u.user_id !== user.user_id));
        toast.success("Utilisateur supprimé avec succès");
      } else {
        const updated =
          user.active === false
            ? await activateAccessSecurityUser(user.user_id)
            : await deactivateAccessSecurityUser(user.user_id);
        vm.setUtilisateurs((prev) =>
          prev.map((u) =>
            u.user_id === user.user_id ? { ...u, active: user.active === false } : u
          )
        );
        toast.success(updated.message || "Statut utilisateur mis à jour");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'effectuer l'action");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Utilisateurs de la structure</h2>
          <p className="text-xs text-muted-foreground">{vm.utilisateurs.length} utilisateur(s)</p>
        </div>
        <Button
          size="sm"
          onClick={openAddUser}
          className="gradient-accent text-accent-foreground"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvel utilisateur
        </Button>
      </div>

      {/* Filtres Utilisateurs : username, email, profil, statut */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom d'utilisateur..."
              value={vm.userUsername}
              onChange={(e) => vm.setUserUsername(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Email..."
              type="email"
              value={vm.userEmail}
              onChange={(e) => vm.setUserEmail(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select
            value={vm.userProfile || "all"}
            onValueChange={(val) => vm.setUserProfile(val === "all" ? "" : val)}
          >
            <SelectTrigger aria-label="Filtrer par profil">
              <SelectValue placeholder="Profil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les profils</SelectItem>
              {vm.availableProfiles.map((p) => (
                <SelectItem key={p} value={p}>
                  {vm.getProfileDisplayName(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={vm.userStatus}
            onValueChange={(val) => vm.setUserStatus(val)}
          >
            <SelectTrigger aria-label="Filtrer par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {vm.usersLoading ? (
        <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span>Chargement des utilisateurs...</span>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Nom & Prénom</TableHead>
                <TableHead className="font-semibold">Nom d'utilisateur</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Profil</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.utilisateurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Aucun utilisateur associé à cette structure
                  </TableCell>
                </TableRow>
              ) : (
                vm.utilisateurs.map((u) => {
                  const fullName =
                    u.first_name || u.last_name
                      ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                      : (() => {
                          const { prenom, nom } = vm.parseNameParts(u.username || u.email);
                          return `${prenom} ${nom}`.trim();
                        })();

                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{fullName || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{u.username || "—"}</TableCell>
                      <TableCell className="break-words">{u.email || "—"}</TableCell>
                      <TableCell>{u.telephone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/30 text-xs">
                          {u.profiles && u.profiles.length > 0
                            ? vm.getProfileDisplayName(u.profiles[0])
                            : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.active !== false
                              ? "bg-accent/15 text-accent border-accent/30"
                              : "bg-destructive/15 text-destructive border-destructive/30"
                          }
                          variant="outline"
                        >
                          {u.active !== false ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Actions utilisateur"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditUser(u)}>
                              <Edit className="h-4 w-4 mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUserAction(u, "reset")}>
                              <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser le mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUserAction(u, "toggle")}>
                              <Power className="h-4 w-4 mr-2" />
                              {u.active !== false ? "Désactiver" : "Activer"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUserAction(u, "delete")}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogue de création / modification utilisateur */}
      <StructureDetailUserDialog
        open={userDialogOpen}
        onOpenChange={handleUserDialogOpenChange}
        isEditing={Boolean(editingUser)}
        userForm={userForm}
        setUserForm={setUserForm}
        onSave={handleSaveUser}
        savingUser={savingUser}
        availableProfiles={vm.availableProfiles}
        existingUsernames={existingUsernames}
        errors={userFormErrors}
        onFieldChange={clearUserFormError}
      />
    </div>
  );
};
