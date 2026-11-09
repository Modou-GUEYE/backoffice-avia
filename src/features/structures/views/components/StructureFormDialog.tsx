import React, { useState, useRef, useMemo, useEffect } from "react";
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
import {
  Building2,
  Check,
  ChevronDown,
  Edit,
  FileText,
  Package,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import BrandingForm from "@/shared/components/BrandingForm";
import ImportUsersDialog, { type ImportedUserRow } from "@/shared/components/ImportUsersDialog";
import { getProfileDisplayName, requiresAgence, requiresCaisse } from "@/features/utilisateurs/models/profileLabels";
import { paysOptions, typeOptions } from "../../models/data";
import type { useStructures } from "../../viewmodels/useStructures";

interface StructureFormDialogProps {
  vm: ReturnType<typeof useStructures>;
}

export const StructureFormDialog: React.FC<StructureFormDialogProps> = ({ vm }) => {
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [produitSelectOpen, setProduitSelectOpen] = useState(false);
  const [produitSearch, setProduitSearch] = useState("");

  const errors = vm.formErrors;
  const userErrors = vm.userFormErrors;

  const generatedLogin = vm.deriveLogin(
    vm.userForm.prenom,
    vm.userForm.nom,
    vm.users.map((u) => u.username)
  );

  const filteredProduitOptions = useMemo(() => {
    const q = produitSearch.trim().toLowerCase();
    if (!q) return vm.produitOptions;
    return vm.produitOptions.filter((p) => p.nom.toLowerCase().includes(q));
  }, [vm.produitOptions, produitSearch]);

  const selectedProduct = useMemo(
    () => vm.produitOptions.find((p) => p.id === vm.form.produitId),
    [vm.produitOptions, vm.form.produitId]
  );

  useEffect(() => {
    if (!vm.dialogOpen) {
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = "";
      }
      setActiveTab("general");
      setProduitSelectOpen(false);
      setProduitSearch("");
    }
  }, [vm.dialogOpen]);

  const submitLabel = vm.isSaving
    ? "Enregistrement..."
    : vm.editingStructure
    ? "Enregistrer"
    : "Ajouter la structure";

  const dialogTitle = vm.editingStructure ? "Modifier la structure" : "Nouvelle structure";
  const dialogDescription = vm.editingStructure
    ? "Modifiez les informations de la structure."
    : "Renseignez les informations de la nouvelle structure.";

  return (
    <>
      <FormDialog
        open={vm.dialogOpen}
        onOpenChange={(open) => {
          if (!open) setActiveTab("general");
          vm.setDialogOpen(open);
        }}
        title={dialogTitle}
        description={dialogDescription}
        submitLabel={submitLabel}
        onSubmit={vm.handleSave}
        loading={vm.isSaving}
        contentClassName="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
        submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
        hideFooter={activeTab !== "general"}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="branding">Couleurs</TabsTrigger>
            <TabsTrigger value="utilisateur">Utilisateur</TabsTrigger>
          </TabsList>

          {/* Tab 1 - Général */}
          <TabsContent value="general" className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nom de la structure"
                  value={vm.form.name}
                  {...invalidFieldProps(errors.name)}
                  onChange={(e) => {
                    vm.clearFormError("name");
                    vm.setForm({ ...vm.form, name: e.target.value });
                  }}
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label>Libellé expéditeur (SMS)</Label>
                <Input
                  placeholder="Ex: MABANQUE"
                  maxLength={10}
                  value={vm.form.libelleExpediteurSMS}
                  onChange={(e) => vm.setForm({ ...vm.form, libelleExpediteurSMS: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select
                  value={vm.form.type}
                  onValueChange={(v) => {
                    vm.clearFormError("type");
                    vm.setForm({ ...vm.form, type: v });
                  }}
                >
                  <SelectTrigger {...invalidFieldProps(errors.type)}><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.type} />
              </div>
              <div className="space-y-2">
                <Label>Pays <span className="text-destructive">*</span></Label>
                <Select
                  value={vm.form.address}
                  onValueChange={(v) => {
                    vm.clearFormError("address");
                    vm.setForm({ ...vm.form, address: v });
                  }}
                >
                  <SelectTrigger {...invalidFieldProps(errors.address)}><SelectValue placeholder="Pays" /></SelectTrigger>
                  <SelectContent>
                    {paysOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.address} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email de contact</Label>
                <Input
                  type="email"
                  placeholder="contact@structure.com"
                  value={vm.form.contact_email}
                  onChange={(e) => vm.setForm({ ...vm.form, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone de contact</Label>
                <Input
                  placeholder="+221 77 000 00 00"
                  value={vm.form.contact_phone}
                  onChange={(e) => vm.setForm({ ...vm.form, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Logo de la structure</Label>
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 transition-colors hover:border-border"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) {
                    vm.onLogoFileSelected(file);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg border bg-background overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {vm.form.logoUrl ? (
                      <img
                        src={vm.form.logoUrl}
                        alt="Aperçu logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {vm.form.logoFile ? vm.form.logoFile.name : vm.pendingLogoFile ? vm.pendingLogoFile.name : vm.form.logoUrl ? "Logo configuré" : "Aucun logo sélectionné"}
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
                      vm.onLogoFileSelected(file);
                    }}
                    aria-label="Sélectionner un logo pour la structure"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5"
                    onClick={() => logoFileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {vm.form.logoUrl ? "Changer" : "Choisir"}
                  </Button>
                  {vm.form.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        vm.onLogoFileSelected(null);
                        if (logoFileInputRef.current) {
                          logoFileInputRef.current.value = "";
                        }
                      }}
                      title="Retirer le logo"
                      aria-label="Retirer le logo de la structure"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-medium">Package</Label>
                  {vm.form.packageId && (
                    <button
                      type="button"
                      onClick={() => vm.setForm((prev) => ({ ...prev, packageId: "" }))}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <Select value={vm.form.packageId} onValueChange={(v) => vm.setForm({ ...vm.form, packageId: v })}>
                  <SelectTrigger className="h-9 text-xs bg-background/50">
                    <SelectValue placeholder="Sélectionner un package" />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.packageOptions.map((pkg) => (
                      <SelectItem key={pkg.id} value={String(pkg.id)}>{pkg.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-medium">
                    Produit <span className="text-destructive">*</span>
                  </Label>
                  {vm.form.produitId && (
                    <button
                      type="button"
                      onClick={() => vm.setForm((prev) => ({ ...prev, produitId: "", ajouterProduit: false }))}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      Effacer la sélection
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setProduitSelectOpen((prev) => !prev)}
                  {...invalidFieldProps(
                    errors.produitId,
                    `w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs bg-background/50 transition-all cursor-pointer ${
                      produitSelectOpen
                        ? "border-accent ring-1 ring-accent/30"
                        : "border-input hover:bg-muted/30"
                    }`,
                  )}
                  aria-expanded={produitSelectOpen}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={selectedProduct ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {selectedProduct ? selectedProduct.nom : "Sélectionner un produit..."}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        produitSelectOpen ? "rotate-180 text-accent" : ""
                      }`}
                    />
                  </div>
                </button>
                <FieldError message={errors.produitId} />

                {selectedProduct && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5 pr-1">
                    <Badge
                      variant="secondary"
                      className="gap-1 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/40 hover:bg-muted/70 transition-colors"
                    >
                      <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="max-w-[160px] truncate">{selectedProduct.nom}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          vm.setForm((prev) => ({ ...prev, produitId: "", ajouterProduit: false }));
                        }}
                        className="rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                        title={`Retirer ${selectedProduct.nom}`}
                        aria-label={`Retirer ${selectedProduct.nom}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                )}

                {produitSelectOpen && (
                  <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-2 space-y-2 animate-in fade-in-50 slide-in-from-top-1 duration-150 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Rechercher un produit..."
                          value={produitSearch}
                          onChange={(e) => setProduitSearch(e.target.value)}
                          className="h-8 text-xs pl-2"
                        />
                      </div>
                      {vm.form.produitId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                          onClick={() => {
                            vm.setForm((prev) => ({ ...prev, produitId: "", ajouterProduit: false }));
                          }}
                        >
                          Effacer
                        </Button>
                      )}
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                      {filteredProduitOptions.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          Aucun produit trouvé.
                        </p>
                      ) : (
                        filteredProduitOptions.map((p) => {
                          const isSelected = vm.form.produitId === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                if (isSelected) {
                                  vm.setForm((prev) => ({ ...prev, produitId: "", ajouterProduit: false }));
                                } else {
                                  vm.clearFormError("produitId");
                                  vm.setForm((prev) => ({ ...prev, produitId: p.id, ajouterProduit: true }));
                                  setProduitSelectOpen(false);
                                }
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-accent/10 border border-accent/30 text-foreground"
                                  : "hover:bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-accent border-accent text-accent-foreground"
                                      : "border-muted-foreground/40 bg-background"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate font-medium">{p.nom}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 2 - Utilisateur */}
          <TabsContent value="utilisateur" className="space-y-4 py-2">
            {vm.pendingImportFile && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-primary">Fichier en attente d'importation</h4>
                    <p className="text-xs text-muted-foreground">{vm.pendingImportFile.name} ({(vm.pendingImportFile.size / 1024).toFixed(1)} KB) - {vm.pendingImportUsersCount} utilisateur(s) détecté(s) et seront importés lors de l'enregistrement de la structure.</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                  vm.setPendingImportFile(null);
                  vm.setPendingImportUsersCount(0);
                }}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Retirer le fichier
                </Button>
              </div>
            )}

            {vm.users.length === 0 && !vm.showUserForm && !vm.pendingImportFile ? (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Premier utilisateur de la structure</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportDialog(true)}
                  >
                    <Upload className="h-4 w-4 mr-1.5" /> Importer CSV / Excel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prénom <span className="text-destructive">*</span></Label>
                    <Input
                      value={vm.userForm.prenom}
                      {...invalidFieldProps(userErrors.prenom, "text-xs")}
                      onChange={(e) => {
                        vm.clearUserFormError("prenom");
                        vm.clearUserFormError("username");
                        const prenom = e.target.value;
                        const login = vm.deriveLogin(prenom, vm.userForm.nom, vm.users.map((u) => u.username));
                        vm.setUserForm({ ...vm.userForm, prenom, username: login });
                      }}
                      placeholder="Prénom"
                    />
                    <FieldError message={userErrors.prenom} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
                    <Input
                      value={vm.userForm.nom}
                      {...invalidFieldProps(userErrors.nom, "text-xs")}
                      onChange={(e) => {
                        vm.clearUserFormError("nom");
                        vm.clearUserFormError("username");
                        const nom = e.target.value;
                        const login = vm.deriveLogin(vm.userForm.prenom, nom, vm.users.map((u) => u.username));
                        vm.setUserForm({ ...vm.userForm, nom, username: login });
                      }}
                      placeholder="Nom"
                    />
                    <FieldError message={userErrors.nom} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Login <span className="text-destructive">*</span></Label>
                    <Input
                      {...invalidFieldProps(userErrors.username, "text-xs")}
                      value={vm.userForm.username || generatedLogin}
                      placeholder="Généré automatiquement"
                      disabled
                      readOnly
                    />
                    <FieldError message={userErrors.username} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail <span className="text-destructive">*</span></Label>
                    <Input
                      {...invalidFieldProps(userErrors.email, "text-xs")}
                      type="email"
                      value={vm.userForm.email}
                      onChange={(e) => {
                        vm.clearUserFormError("email");
                        vm.setUserForm({ ...vm.userForm, email: e.target.value });
                      }}
                      placeholder="utilisateur@domaine.com"
                    />
                    <FieldError message={userErrors.email} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Profil <span className="text-destructive">*</span></Label>
                    <Select
                      value={vm.userForm.profil}
                      onValueChange={(v) => {
                        vm.clearUserFormError("profil");
                        vm.setUserForm({ ...vm.userForm, profil: v });
                      }}
                    >
                      <SelectTrigger {...invalidFieldProps(userErrors.profil, "text-xs")}>
                        <SelectValue placeholder="Profil" />
                      </SelectTrigger>
                      <SelectContent>
                        {vm.availableUserRoles.length === 0 ? (
                          <SelectItem value="__none__" disabled>Aucun profil disponible</SelectItem>
                        ) : vm.availableUserRoles.map((p) => (
                          <SelectItem key={p} value={p}>{getProfileDisplayName(p)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={userErrors.profil} />
                  </div>
                  {requiresAgence(vm.userForm.profil) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Agence <span className="text-[10px] text-muted-foreground">(Optionnel)</span></Label>
                      <Select
                        value={vm.userForm.agenceId || "__all__"}
                        onValueChange={(v) => vm.setUserForm({ ...vm.userForm, agenceId: v === "__all__" ? "" : v, caisseId: "" })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Toutes les agences" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Toutes les agences</SelectItem>
                          {vm.structureAgences.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {requiresCaisse(vm.userForm.profil) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Caisse <span className="text-[10px] text-muted-foreground">(Optionnel)</span></Label>
                      <Select
                        value={vm.userForm.caisseId || "__none__"}
                        onValueChange={(v) => vm.setUserForm({ ...vm.userForm, caisseId: v === "__none__" ? "" : v })}
                        disabled={!vm.userForm.agenceId}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder={vm.userForm.agenceId ? "Sélectionner une caisse" : "Non applicable"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucune caisse assignée</SelectItem>
                          {vm.structureCaisses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={vm.selectedUserId ? vm.updateStructureUser : vm.addUser}
                    className="gradient-accent text-accent-foreground"
                  >
                    {vm.selectedUserId ? "Modifier" : "Ajouter"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportDialog(true)}
                    >
                      <Upload className="h-4 w-4 mr-1.5" /> Importer CSV / Excel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={vm.openAddUserForm}
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" /> Nouvel utilisateur
                    </Button>
                  </div>
                </div>

                {vm.showUserForm && (
                  <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Prénom <span className="text-destructive">*</span></Label>
                        <Input
                          value={vm.userForm.prenom}
                          {...invalidFieldProps(userErrors.prenom, "text-xs")}
                          onChange={(e) => {
                            vm.clearUserFormError("prenom");
                            vm.clearUserFormError("username");
                            const prenom = e.target.value;
                            const login = vm.deriveLogin(prenom, vm.userForm.nom, vm.users.map((u) => u.username));
                            vm.setUserForm({ ...vm.userForm, prenom, username: login });
                          }}
                          placeholder="Prénom"
                        />
                        <FieldError message={userErrors.prenom} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
                        <Input
                          value={vm.userForm.nom}
                          {...invalidFieldProps(userErrors.nom, "text-xs")}
                          onChange={(e) => {
                            vm.clearUserFormError("nom");
                            vm.clearUserFormError("username");
                            const nom = e.target.value;
                            const login = vm.deriveLogin(vm.userForm.prenom, nom, vm.users.map((u) => u.username));
                            vm.setUserForm({ ...vm.userForm, nom, username: login });
                          }}
                          placeholder="Nom"
                        />
                        <FieldError message={userErrors.nom} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Login <span className="text-destructive">*</span></Label>
                        <Input
                          {...invalidFieldProps(
                            userErrors.username,
                            `text-xs ${vm.selectedUserId ? "bg-muted cursor-not-allowed opacity-80" : ""}`,
                          )}
                          value={vm.userForm.username || generatedLogin}
                          disabled={Boolean(vm.selectedUserId)}
                          readOnly={Boolean(vm.selectedUserId)}
                          onChange={(e) => {
                            vm.clearUserFormError("username");
                            vm.setUserForm({ ...vm.userForm, username: e.target.value });
                          }}
                          placeholder="Généré automatiquement"
                        />
                        <FieldError message={userErrors.username} />
                        {vm.selectedUserId && (
                          <p className="text-[11px] text-muted-foreground">L'identifiant de connexion ne peut pas être modifié.</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">E-mail <span className="text-destructive">*</span></Label>
                        <Input
                          {...invalidFieldProps(userErrors.email, "text-xs")}
                          type="email"
                          value={vm.userForm.email}
                          onChange={(e) => {
                            vm.clearUserFormError("email");
                            vm.setUserForm({ ...vm.userForm, email: e.target.value });
                          }}
                          placeholder="utilisateur@domaine.com"
                        />
                        <FieldError message={userErrors.email} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Profil <span className="text-destructive">*</span></Label>
                        <Select
                          value={vm.userForm.profil}
                          onValueChange={(v) => {
                            vm.clearUserFormError("profil");
                            vm.setUserForm({ ...vm.userForm, profil: v });
                          }}
                        >
                          <SelectTrigger {...invalidFieldProps(userErrors.profil, "text-xs")}>
                            <SelectValue placeholder="Profil" />
                          </SelectTrigger>
                          <SelectContent>
                            {vm.availableUserRoles.length === 0 ? (
                              <SelectItem value="__none__" disabled>Aucun profil disponible</SelectItem>
                            ) : vm.availableUserRoles.map((p) => (
                              <SelectItem key={p} value={p}>{getProfileDisplayName(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={userErrors.profil} />
                      </div>
                      {requiresAgence(vm.userForm.profil) && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Agence <span className="text-[10px] text-muted-foreground">(Optionnel)</span></Label>
                          <Select
                            value={vm.userForm.agenceId || "__all__"}
                            onValueChange={(v) => vm.setUserForm({ ...vm.userForm, agenceId: v === "__all__" ? "" : v, caisseId: "" })}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Toutes les agences" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Toutes les agences</SelectItem>
                              {vm.structureAgences.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {requiresCaisse(vm.userForm.profil) && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Caisse <span className="text-[10px] text-muted-foreground">(Optionnel)</span></Label>
                          <Select
                            value={vm.userForm.caisseId || "__none__"}
                            onValueChange={(v) => vm.setUserForm({ ...vm.userForm, caisseId: v === "__none__" ? "" : v })}
                            disabled={!vm.userForm.agenceId}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder={vm.userForm.agenceId ? "Sélectionner une caisse" : "Non applicable"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Aucune caisse assignée</SelectItem>
                              {vm.structureCaisses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={vm.cancelUserForm}
                      >
                        Annuler
                      </Button>
                      {vm.selectedUserId ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={vm.updateStructureUser}
                          disabled={vm.isUpdatingUser}
                          className="gradient-accent text-accent-foreground"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          {vm.isUpdatingUser ? "Modification..." : "Modifier l'utilisateur"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={vm.addUser}
                          className="gradient-accent text-accent-foreground"
                        >
                          Ajouter l'utilisateur
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {vm.users.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Utilisateurs rattachés à la structure ({vm.users.length})
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {vm.users.map((u) => (
                        <div
                          key={u.id}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs bg-muted/20 transition-colors ${
                            vm.userForm.username === u.username ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => vm.editUser(u.id)}
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
                                vm.removeUser(u.id);
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

          {/* Tab 3 - Charte Graphique */}
          <TabsContent value="branding" className="space-y-4 py-2">
            <BrandingForm
              branding={{
                logoUrl: vm.form.logoUrl,
                primaryColor: vm.form.primaryColor,
                secondaryColor: vm.form.secondaryColor,
                accentColor: vm.form.accentColor,
                sidebarColor: vm.form.sidebarColor,
                borderColor: vm.form.borderColor,
              }}
              onChange={(updated) => {
                vm.setForm({
                  ...vm.form,
                  logoUrl: updated.logoUrl !== undefined ? updated.logoUrl : vm.form.logoUrl,
                  primaryColor: updated.primaryColor || "",
                  secondaryColor: updated.secondaryColor || "",
                  accentColor: updated.accentColor || "",
                  sidebarColor: updated.sidebarColor || "",
                  borderColor: updated.borderColor || "",
                });
              }}
              onLogoFileChange={vm.handleLogoFileChange}
              entityId={vm.editingStructure?.id}
            />
          </TabsContent>
        </Tabs>
      </FormDialog>

      <ImportUsersDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportFile={
          vm.editingStructure
            ? (file) => {
                vm.importUsersFromFile(file);
              }
            : (file) => {
                vm.setPendingImportFile(file);
              }
        }
        onImportRows={
          !vm.editingStructure
            ? (rows: ImportedUserRow[]) => {
                vm.setPendingImportUsersCount(rows.length);
              }
            : undefined
        }
      />
    </>
  );
};
