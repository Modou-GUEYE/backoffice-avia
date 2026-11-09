import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, type FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";
import { Edit, Trash2, Truck, Upload, UserPlus } from "lucide-react";
import type {
  Distributeur,
  DistributeurForm,
  DistributeurUser,
  DistributeurUserForm,
} from "../../models/types";
import type { DistributeurFormField, DistributeurUserFormField } from "../../models/validation";

interface DistributeurFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDistributeur: Distributeur | null;
  form: DistributeurForm;
  setForm: React.Dispatch<React.SetStateAction<DistributeurForm>>;
  structureOptions: Array<{ id: string; nom: string }>;
  singleStructureMode?: boolean;
  onSubmit: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  onFileSelected?: (file: File | null) => void;
  onLogoFileSelected?: (file: File | null) => void;
  /** Erreurs de validation affichées sous les champs du distributeur. */
  formErrors?: FieldErrors<DistributeurFormField>;
  clearFormError?: (field: DistributeurFormField) => void;
  // Utilisateurs tab props
  users?: DistributeurUser[];
  userForm?: DistributeurUserForm;
  setUserForm?: React.Dispatch<React.SetStateAction<DistributeurUserForm>>;
  /** Erreurs de validation affichées sous les champs de l'utilisateur. */
  userFormErrors?: FieldErrors<DistributeurUserFormField>;
  clearUserFormError?: (field: DistributeurUserFormField) => void;
  availableUserRoles?: string[];
  showUserForm?: boolean;
  selectedUserId?: string | null;
  isUpdatingUser?: boolean;
  deriveLogin?: (prenom?: string, nom?: string, existing?: string[]) => string;
  openAddUserForm?: () => void;
  cancelUserForm?: () => void;
  addUser?: () => void;
  editUser?: (userId: string) => void;
  removeUser?: (userId: string) => void;
  updateUser?: () => Promise<void>;
}

export const DistributeurFormDialog: React.FC<DistributeurFormDialogProps> = ({
  open,
  onOpenChange,
  editingDistributeur,
  form,
  setForm,
  structureOptions,
  singleStructureMode = false,
  onSubmit,
  loading = false,
  disabled = false,
  onFileSelected,
  onLogoFileSelected,
  formErrors = {},
  clearFormError,
  // Utilisateurs props
  users = [],
  userForm = { nom: "", prenom: "", username: "", email: "", profil: "" },
  setUserForm,
  userFormErrors = {},
  clearUserFormError,
  availableUserRoles = [],
  showUserForm = false,
  selectedUserId = null,
  isUpdatingUser = false,
  deriveLogin,
  openAddUserForm,
  cancelUserForm,
  addUser,
  editUser,
  removeUser,
  updateUser,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setActiveTab("general");
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = "";
      }
    }
  }, [open]);

  const handleLogoChange = (file: File | null) => {
    const onSelect = onFileSelected || onLogoFileSelected;
    if (onSelect) {
      onSelect(file);
    } else {
      if (!file) {
        setForm((prev) => ({ ...prev, previewUrl: "", file: null }));
      } else {
        const preview = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
        setForm((prev) => ({ ...prev, previewUrl: preview, file }));
      }
    }
  };

  const generatedLogin = deriveLogin
    ? deriveLogin(userForm.prenom, userForm.nom, users.map((u) => u.username))
    : "";

  const submitLabel = loading
    ? "Enregistrement..."
    : editingDistributeur
    ? "Enregistrer"
    : "Créer le distributeur";

  const dialogTitle = editingDistributeur
    ? "Modifier le distributeur"
    : "Nouveau distributeur";

  const dialogDescription = editingDistributeur
    ? "Modifiez les informations du distributeur."
    : "Renseignez les informations du nouveau distributeur.";

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setActiveTab("general");
        onOpenChange(isOpen);
      }}
      title={dialogTitle}
      description={dialogDescription}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      loading={loading}
      submitDisabled={disabled}
      contentClassName="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
      submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
      hideFooter={activeTab !== "general"}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="utilisateur">Utilisateur</TabsTrigger>
        </TabsList>

        {/* Tab 1 - Général */}
        <TabsContent value="general" className="space-y-4 py-2">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="dist-name">
              Nom du distributeur <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dist-name"
              placeholder="Ex: Distributeur Express SARL"
              value={form.nom}
              onChange={(e) => {
                clearFormError?.("nom");
                setForm((prev) => ({ ...prev, nom: e.target.value }));
              }}
              required
              {...invalidFieldProps(formErrors.nom)}
            />
            <FieldError message={formErrors.nom} />
          </div>

          {/* Logo du distributeur */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Logo du distributeur</Label>
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 transition-colors hover:border-border"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file?.type.startsWith("image/")) {
                  handleLogoChange(file);
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg border bg-background overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                  {form.previewUrl ? (
                    <img
                      src={form.previewUrl}
                      alt="Aperçu logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Truck className="h-5 w-5 text-muted-foreground/60" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {form.file ? form.file.name : form.previewUrl ? "Logo configuré" : "Aucun logo sélectionné"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    PNG, JPG ou SVG (max. 2 Mo)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file || !file.type.startsWith("image/")) return;
                    handleLogoChange(file);
                  }}
                  aria-label="Sélectionner un logo pour le distributeur"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1.5"
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {form.previewUrl ? "Changer" : "Choisir"}
                </Button>
                {form.previewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      handleLogoChange(null);
                      if (logoFileInputRef.current) {
                        logoFileInputRef.current.value = "";
                      }
                    }}
                    title="Retirer le logo"
                    aria-label="Retirer le logo du distributeur"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Structure */}
          <div className="space-y-2">
            <Label htmlFor="dist-structure">
              Structure de rattachement <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.structureId}
              onValueChange={(val) => {
                clearFormError?.("structureId");
                setForm((prev) => ({ ...prev, structureId: val }));
              }}
              disabled={singleStructureMode}
            >
              <SelectTrigger id="dist-structure" {...invalidFieldProps(formErrors.structureId)}>
                <SelectValue placeholder="Sélectionner une structure" />
              </SelectTrigger>
              <SelectContent>
                {structureOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={formErrors.structureId} />
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dist-email">Email de contact</Label>
              <Input
                id="dist-email"
                type="email"
                placeholder="contact@distributeur.com"
                value={form.contact_email ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dist-phone">Téléphone de contact</Label>
              <Input
                id="dist-phone"
                placeholder="+221 77 000 00 00"
                value={form.contact_phone ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="dist-address">Adresse physique</Label>
            <Input
              id="dist-address"
              placeholder="Ex: Boulevard de la République, Dakar"
              value={form.address ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
        </TabsContent>

        {/* Tab 2 - Utilisateur */}
        <TabsContent value="utilisateur" className="space-y-4 py-2">
          {users.length === 0 && !showUserForm ? (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  Premier utilisateur du distributeur
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Prénom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...invalidFieldProps(userFormErrors.prenom, "text-xs")}
                    value={userForm.prenom}
                    onChange={(e) => {
                      clearUserFormError?.("prenom");
                      clearUserFormError?.("username");
                      const prenom = e.target.value;
                      const login = deriveLogin
                        ? deriveLogin(prenom, userForm.nom, users.map((u) => u.username))
                        : "";
                      setUserForm?.((prev) => ({ ...prev, prenom, username: login }));
                    }}
                    placeholder="Prénom"
                  />
                  <FieldError message={userFormErrors.prenom} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...invalidFieldProps(userFormErrors.nom, "text-xs")}
                    value={userForm.nom}
                    onChange={(e) => {
                      clearUserFormError?.("nom");
                      clearUserFormError?.("username");
                      const nom = e.target.value;
                      const login = deriveLogin
                        ? deriveLogin(userForm.prenom, nom, users.map((u) => u.username))
                        : "";
                      setUserForm?.((prev) => ({ ...prev, nom, username: login }));
                    }}
                    placeholder="Nom"
                  />
                  <FieldError message={userFormErrors.nom} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Login <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...invalidFieldProps(userFormErrors.username, "text-xs")}
                    value={userForm.username || generatedLogin}
                    placeholder="Généré automatiquement"
                    disabled
                    readOnly
                  />
                  <FieldError message={userFormErrors.username} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...invalidFieldProps(userFormErrors.email, "text-xs")}
                    type="email"
                    value={userForm.email}
                    onChange={(e) => {
                      clearUserFormError?.("email");
                      setUserForm?.((prev) => ({ ...prev, email: e.target.value }));
                    }}
                    placeholder="utilisateur@domaine.com"
                  />
                  <FieldError message={userFormErrors.email} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Profil <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={userForm.profil}
                    onValueChange={(v) => {
                      clearUserFormError?.("profil");
                      setUserForm?.((prev) => ({ ...prev, profil: v }));
                    }}
                  >
                    <SelectTrigger {...invalidFieldProps(userFormErrors.profil, "text-xs")}>
                      <SelectValue placeholder="Profil" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUserRoles.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          Aucun profil disponible
                        </SelectItem>
                      ) : (
                        availableUserRoles.map((p) => (
                          <SelectItem key={p} value={p}>
                            {getProfileDisplayName(p)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FieldError message={userFormErrors.profil} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={selectedUserId ? updateUser : addUser}
                  className="gradient-accent text-accent-foreground"
                >
                  {selectedUserId ? "Modifier" : "Ajouter"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openAddUserForm}
                >
                  <UserPlus className="h-4 w-4 mr-1.5" /> Nouvel utilisateur
                </Button>
              </div>

              {showUserForm && (
                <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Prénom <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...invalidFieldProps(userFormErrors.prenom, "text-xs")}
                        value={userForm.prenom}
                        onChange={(e) => {
                          clearUserFormError?.("prenom");
                          clearUserFormError?.("username");
                          const prenom = e.target.value;
                          const login = deriveLogin
                            ? deriveLogin(prenom, userForm.nom, users.map((u) => u.username))
                            : "";
                          setUserForm?.((prev) => ({ ...prev, prenom, username: login }));
                        }}
                        placeholder="Prénom"
                      />
                      <FieldError message={userFormErrors.prenom} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Nom <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...invalidFieldProps(userFormErrors.nom, "text-xs")}
                        value={userForm.nom}
                        onChange={(e) => {
                          clearUserFormError?.("nom");
                          clearUserFormError?.("username");
                          const nom = e.target.value;
                          const login = deriveLogin
                            ? deriveLogin(userForm.prenom, nom, users.map((u) => u.username))
                            : "";
                          setUserForm?.((prev) => ({ ...prev, nom, username: login }));
                        }}
                        placeholder="Nom"
                      />
                      <FieldError message={userFormErrors.nom} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Login <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...invalidFieldProps(
                          userFormErrors.username,
                          `text-xs ${selectedUserId ? "bg-muted cursor-not-allowed opacity-80" : ""}`,
                        )}
                        value={userForm.username || generatedLogin}
                        disabled={Boolean(selectedUserId)}
                        readOnly={Boolean(selectedUserId)}
                        onChange={(e) => {
                          clearUserFormError?.("username");
                          setUserForm?.((prev) => ({ ...prev, username: e.target.value }));
                        }}
                        placeholder="Généré automatiquement"
                      />
                      <FieldError message={userFormErrors.username} />
                      {selectedUserId && (
                        <p className="text-[11px] text-muted-foreground">
                          L'identifiant de connexion ne peut pas être modifié.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        E-mail <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        {...invalidFieldProps(userFormErrors.email, "text-xs")}
                        type="email"
                        value={userForm.email}
                        onChange={(e) => {
                          clearUserFormError?.("email");
                          setUserForm?.((prev) => ({ ...prev, email: e.target.value }));
                        }}
                        placeholder="utilisateur@domaine.com"
                      />
                      <FieldError message={userFormErrors.email} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Profil <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={userForm.profil}
                        onValueChange={(v) => {
                          clearUserFormError?.("profil");
                          setUserForm?.((prev) => ({ ...prev, profil: v }));
                        }}
                      >
                        <SelectTrigger {...invalidFieldProps(userFormErrors.profil, "text-xs")}>
                          <SelectValue placeholder="Profil" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUserRoles.length === 0 ? (
                            <SelectItem value="__none__" disabled>
                              Aucun profil disponible
                            </SelectItem>
                          ) : (
                            availableUserRoles.map((p) => (
                              <SelectItem key={p} value={p}>
                                {getProfileDisplayName(p)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FieldError message={userFormErrors.profil} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelUserForm}
                    >
                      Annuler
                    </Button>
                    {selectedUserId ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={updateUser}
                        disabled={isUpdatingUser}
                        className="gradient-accent text-accent-foreground"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        {isUpdatingUser ? "Modification..." : "Modifier l'utilisateur"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={addUser}
                        className="gradient-accent text-accent-foreground"
                      >
                        Ajouter l'utilisateur
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {users.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Utilisateurs rattachés au distributeur ({users.length})
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs bg-muted/20 transition-colors ${
                          userForm.username === u.username
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex-1 text-left"
                          onClick={() => editUser?.(u.id)}
                        >
                          <div className="font-medium text-foreground">
                            {u.nom} {u.prenom}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            Login: <span className="font-semibold text-foreground">{u.username}</span> • Email: {u.email || "-"}
                            {u.matricule ? ` • Matricule: ${u.matricule}` : ""}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {getProfileDisplayName(u.profil || "")}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUser?.(u.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </FormDialog>
  );
};
