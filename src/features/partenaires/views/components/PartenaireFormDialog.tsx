import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronDown, Layers, Pencil, Trash2, UserPlus, X } from "lucide-react";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, type FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { typesPiece } from "../../models/data";
import type { PartenaireForm, PartenaireUserForm, PartenaireRead, CatalogServiceItem } from "../../models/types";
import type { HierarchyMemberUser } from "@/core/security/accessSecurityService";
import type { PartenaireFormField, PartenaireUserFormField } from "../../models/validation";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";

type PartenaireFormDialogProps = {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editing: PartenaireRead | null;
  save: () => void;
  updatePartnerUser: () => void;
  savingPartner: boolean;
  savingPartnerUser: boolean;
  activeTab: "particulier" | "entreprise" | "utilisateur";
  setActiveTab: (tab: "particulier" | "entreprise" | "utilisateur") => void;
  setFormType: (type: "particulier" | "entreprise") => void;
  form: PartenaireForm;
  setForm: React.Dispatch<React.SetStateAction<PartenaireForm>>;
  userForm: PartenaireUserForm;
  setUserForm: React.Dispatch<React.SetStateAction<PartenaireUserForm>>;
  selectPartnerUser: (user: HierarchyMemberUser) => void;
  deriveLogin: (firstName: string, lastName?: string) => string;
  partnerUsers: HierarchyMemberUser[];
  selectedPartnerUserId: string | null;
  profilsForCategorie: (cat: "marchand" | "facturier") => string[];
  showUserForm: boolean;
  setShowUserForm: (open: boolean) => void;
  openAddUserForm: () => void;
  addUser: () => void;
  removeUser: (userId: string) => void;
  catalogServices?: CatalogServiceItem[];
  toggleService?: (serviceId: string) => void;
  clearServices?: () => void;
  /** Erreurs de validation affichées sous les champs du partenaire. */
  formErrors?: FieldErrors<PartenaireFormField>;
  clearFormError?: (field: PartenaireFormField) => void;
  /** Erreurs de validation affichées sous les champs de l'utilisateur. */
  userFormErrors?: FieldErrors<PartenaireUserFormField>;
  clearUserFormError?: (field: PartenaireUserFormField) => void;
};

export const PartenaireFormDialog: React.FC<PartenaireFormDialogProps> = ({
  dialogOpen,
  setDialogOpen,
  editing,
  save,
  updatePartnerUser,
  savingPartner,
  savingPartnerUser,
  activeTab,
  setActiveTab,
  setFormType,
  form,
  setForm,
  userForm,
  setUserForm,
  selectPartnerUser,
  deriveLogin,
  partnerUsers = [],
  selectedPartnerUserId,
  profilsForCategorie,
  showUserForm,
  setShowUserForm,
  openAddUserForm,
  addUser,
  removeUser,
  catalogServices = [],
  toggleService,
  clearServices,
  formErrors = {},
  clearFormError,
  userFormErrors = {},
  clearUserFormError,
}) => {
  const [serviceSelectOpen, setServiceSelectOpen] = React.useState(false);

  const selectedServiceIds = form.serviceIds || [];
  const safeUsers = partnerUsers || [];

  const renderServicesSelector = () => (
    <div className="space-y-2 pt-2 border-t border-border/50">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Services associés</Label>
        {selectedServiceIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (clearServices) clearServices();
              else setForm({ ...form, serviceIds: [] });
            }}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            Effacer la sélection
          </button>
        )}
      </div>

      {/* Champ déroulant avec icône */}
      <button
        type="button"
        onClick={() => setServiceSelectOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs bg-background/50 transition-all cursor-pointer ${
          serviceSelectOpen
            ? "border-accent ring-1 ring-accent/30"
            : "border-input hover:bg-muted/30"
        }`}
        aria-expanded={serviceSelectOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Sélectionner des services...
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              serviceSelectOpen ? "rotate-180 text-accent" : ""
            }`}
          />
        </div>
      </button>

      {/* Badges des services sélectionnés */}
      {selectedServiceIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5 pr-1">
          {selectedServiceIds.map((id) => {
            const s = (catalogServices || []).find((svc) => svc.id === id);
            const label = s?.label || s?.name || s?.code || id;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="max-w-[160px] truncate">{label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toggleService) {
                      toggleService(id);
                    } else {
                      setForm({
                        ...form,
                        serviceIds: (form.serviceIds || []).filter((item) => item !== id),
                      });
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                  title={`Retirer ${label}`}
                  aria-label={`Retirer ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Liste déroulante sous le champ */}
      {serviceSelectOpen && (
        <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-2 space-y-2 animate-in fade-in-50 slide-in-from-top-1 duration-150 shadow-sm">
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40">
            <span className="text-[11px] text-muted-foreground font-medium">
              {(catalogServices || []).length} service(s) disponible(s)
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {(catalogServices || []).length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Aucun service trouvé.
              </p>
            ) : (
              (catalogServices || []).map((s) => {
                const isSelected = selectedServiceIds.includes(s.id);
                const label = s.label || s.name || s.code || s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (toggleService) {
                        toggleService(s.id);
                      } else {
                        const cur = form.serviceIds || [];
                        setForm({
                          ...form,
                          serviceIds: isSelected ? cur.filter((x) => x !== s.id) : [...cur, s.id],
                        });
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
                      <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {s.owner_code && (
                        <span
                          className="text-[9px] font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20"
                          title={`Owner code: ${s.owner_code}`}
                        >
                          {s.owner_code}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <FormDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      title={`${editing ? "Modifier" : "Ajouter"} un partenaire`}
      description={
        editing
          ? "Modifiez les informations du partenaire."
          : "Renseignez les informations du nouveau partenaire."
      }
      submitLabel={editing ? "Modifier" : "Ajouter le partenaire"}
      onSubmit={save}
      submitDisabled={savingPartner}
      hideFooter={activeTab === "utilisateur"}
      submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
      contentClassName="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const nextTab = v as "particulier" | "entreprise" | "utilisateur";
            setActiveTab(nextTab);
            if (nextTab === "particulier" || nextTab === "entreprise") {
              setFormType(nextTab);
            }
          }}
          className="w-full space-y-4"
        >
          <TabsList className={`grid w-full ${editing ? "grid-cols-2" : "grid-cols-3"}`}>
            {(!editing || editing.type === "particulier") && (
              <TabsTrigger value="particulier">Particulier</TabsTrigger>
            )}
            {(!editing || editing.type === "entreprise") && (
              <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
            )}
            <TabsTrigger value="utilisateur">Utilisateur</TabsTrigger>
          </TabsList>


          <TabsContent value="particulier" className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input
                  placeholder="Nom"
                  value={form.nom}
                  {...invalidFieldProps(formErrors.nom)}
                  onChange={(e) => {
                    const nom = e.target.value;
                    clearFormError?.("nom");
                    setForm({ ...form, nom });
                  }}
                />
                <FieldError message={formErrors.nom} />
              </div>
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input
                  placeholder="Prénom"
                  value={form.prenom}
                  {...invalidFieldProps(formErrors.prenom)}
                  onChange={(e) => {
                    const prenom = e.target.value;
                    clearFormError?.("prenom");
                    setForm({ ...form, prenom });
                  }}
                />
                <FieldError message={formErrors.prenom} />
              </div>

              <div className="space-y-1.5">
                <Label>Code partenaire</Label>
                <Input
                  placeholder="Code (ex: PART-001)"
                  value={form.code || ""}
                  onChange={(e) => {
                    const code = e.target.value;
                    setForm({ ...form, code });
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Catégorie *</Label>
                <Select
                  value={form.categorie}
                  onValueChange={(v: "marchand" | "facturier") => {
                    clearFormError?.("categorie");
                    setForm({ ...form, categorie: v });
                  }}
                >
                  <SelectTrigger {...invalidFieldProps(formErrors.categorie)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marchand">Marchand</SelectItem>
                    <SelectItem value="facturier">Facturier</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={formErrors.categorie} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input
                  placeholder="7XXXXXXXX"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  {...invalidFieldProps(formErrors.email)}
                  onChange={(e) => {
                    const email = e.target.value;
                    clearFormError?.("email");
                    setForm({ ...form, email });
                  }}
                />
                <FieldError message={formErrors.email} />
              </div>
              <div className="space-y-1.5">
                <Label>Type de pièce *</Label>
                <Select
                  value={form.typePiece}
                  onValueChange={(v) => {
                    clearFormError?.("typePiece");
                    setForm({ ...form, typePiece: v });
                  }}
                >
                  <SelectTrigger {...invalidFieldProps(formErrors.typePiece)}>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesPiece.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={formErrors.typePiece} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date de naissance *</Label>
                <Input
                  type="date"
                  value={form.dateNaissance}
                  {...invalidFieldProps(formErrors.dateNaissance)}
                  onChange={(e) => {
                    clearFormError?.("dateNaissance");
                    setForm({ ...form, dateNaissance: e.target.value });
                  }}
                />
                <FieldError message={formErrors.dateNaissance} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de délivrance *</Label>
                <Input
                  type="date"
                  value={form.dateDelivrance}
                  {...invalidFieldProps(formErrors.dateDelivrance)}
                  onChange={(e) => {
                    clearFormError?.("dateDelivrance");
                    setForm({ ...form, dateDelivrance: e.target.value });
                  }}
                />
                <FieldError message={formErrors.dateDelivrance} />
              </div>
              <div className="space-y-1.5">
                <Label>Date d'expiration *</Label>
                <Input
                  type="date"
                  value={form.dateExpiration}
                  {...invalidFieldProps(formErrors.dateExpiration)}
                  onChange={(e) => {
                    clearFormError?.("dateExpiration");
                    setForm({ ...form, dateExpiration: e.target.value });
                  }}
                />
                <FieldError message={formErrors.dateExpiration} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="entreprise" className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Libellé de l'entreprise *</Label>
                <Input
                  placeholder="Nom de l'entreprise"
                  value={form.libelle}
                  {...invalidFieldProps(formErrors.libelle)}
                  onChange={(e) => {
                    const libelle = e.target.value;
                    clearFormError?.("libelle");
                    setForm({ ...form, libelle });
                  }}
                />
                <FieldError message={formErrors.libelle} />
              </div>

              <div className="space-y-1.5">
                <Label>Code partenaire</Label>
                <Input
                  placeholder="Code (ex: PART-001)"
                  value={form.code || ""}
                  onChange={(e) => {
                    const code = e.target.value;
                    setForm({ ...form, code });
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>N° d'identité fiscale *</Label>
                <Input
                  placeholder="Numéro"
                  value={form.numeroIdentiteFiscale}
                  {...invalidFieldProps(formErrors.numeroIdentiteFiscale)}
                  onChange={(e) => {
                    clearFormError?.("numeroIdentiteFiscale");
                    setForm({ ...form, numeroIdentiteFiscale: e.target.value });
                  }}
                />
                <FieldError message={formErrors.numeroIdentiteFiscale} />
              </div>

              <div className="space-y-1.5">
                <Label>Catégorie *</Label>
                <Select
                  value={form.categorie}
                  onValueChange={(v: "marchand" | "facturier") => {
                    clearFormError?.("categorie");
                    setForm({ ...form, categorie: v });
                  }}
                >
                  <SelectTrigger {...invalidFieldProps(formErrors.categorie)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marchand">Marchand</SelectItem>
                    <SelectItem value="facturier">Facturier</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={formErrors.categorie} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input
                  placeholder="7XXXXXXXX"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  {...invalidFieldProps(formErrors.email)}
                  onChange={(e) => {
                    const email = e.target.value;
                    clearFormError?.("email");
                    setForm({ ...form, email });
                  }}
                />
                <FieldError message={formErrors.email} />
              </div>
              <div className="space-y-1.5">
                <Label>NINEA *</Label>
                <Input
                  placeholder="NINEA"
                  value={form.ninea}
                  {...invalidFieldProps(formErrors.ninea)}
                  onChange={(e) => {
                    clearFormError?.("ninea");
                    setForm({ ...form, ninea: e.target.value });
                  }}
                />
                <FieldError message={formErrors.ninea} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="utilisateur" className="space-y-4 py-2">
            {safeUsers.length === 0 && !showUserForm ? (
              // Formulaire affiché directement quand pas d'utilisateur
              <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                <p className="text-xs text-muted-foreground font-medium">Premier utilisateur du partenaire</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prénom <span className="text-destructive">*</span></Label>
                    <Input
                      {...invalidFieldProps(userFormErrors.prenom, "text-xs")}
                      value={userForm.prenom}
                      onChange={(e) => {
                        clearUserFormError?.("prenom");
                        clearUserFormError?.("username");
                        const prenom = e.target.value;
                        const login = deriveLogin(prenom, userForm.nom);
                        setUserForm({ ...userForm, prenom, username: login });
                      }}
                      placeholder="Prénom"
                    />
                    <FieldError message={userFormErrors.prenom} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
                    <Input
                      {...invalidFieldProps(userFormErrors.nom, "text-xs")}
                      value={userForm.nom}
                      onChange={(e) => {
                        clearUserFormError?.("nom");
                        clearUserFormError?.("username");
                        const nom = e.target.value;
                        const login = deriveLogin(userForm.prenom, nom);
                        setUserForm({ ...userForm, nom, username: login });
                      }}
                      placeholder="Nom"
                    />
                    <FieldError message={userFormErrors.nom} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Login <span className="text-destructive">*</span></Label>
                    <Input
                      {...invalidFieldProps(userFormErrors.username, "text-xs")}
                      value={userForm.username}
                      placeholder="Généré automatiquement (ex: j.jeandupont)"
                      disabled
                      readOnly
                    />
                    <FieldError message={userFormErrors.username} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail <span className="text-destructive">*</span></Label>
                    <Input
                      {...invalidFieldProps(userFormErrors.email, "text-xs")}
                      type="email"
                      value={userForm.email}
                      onChange={(e) => {
                        clearUserFormError?.("email");
                        setUserForm({ ...userForm, email: e.target.value });
                      }}
                      placeholder="utilisateur@domaine.com"
                    />
                    <FieldError message={userFormErrors.email} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Profil / Rôle <span className="text-destructive">*</span></Label>
                    <Select
                      value={userForm.profil}
                      onValueChange={(v) => {
                        clearUserFormError?.("profil");
                        setUserForm({ ...userForm, profil: v });
                      }}
                    >
                      <SelectTrigger {...invalidFieldProps(userFormErrors.profil, "text-xs")}>
                        <SelectValue placeholder="Sélectionner le profil" />
                      </SelectTrigger>
                      <SelectContent>
                        {profilsForCategorie(form.categorie).map((p) => (
                          <SelectItem key={p} value={p}>
                            {getProfileDisplayName(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={userFormErrors.profil} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void addUser();
                    }}
                    className="gradient-accent text-accent-foreground"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Header avec bouton Nouvel utilisateur */}
                {safeUsers.length > 0 && (
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openAddUserForm}
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" /> Nouvel utilisateur
                    </Button>
                  </div>
                )}

                {/* Formulaire d'ajout ou de modification */}
                {showUserForm && (
                  <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Prénom <span className="text-destructive">*</span></Label>
                        <Input
                          {...invalidFieldProps(userFormErrors.prenom, "text-xs")}
                          value={userForm.prenom}
                          onChange={(e) => {
                            clearUserFormError?.("prenom");
                            clearUserFormError?.("username");
                            const prenom = e.target.value;
                            if (selectedPartnerUserId) {
                              setUserForm({ ...userForm, prenom });
                            } else {
                              const login = deriveLogin(prenom, userForm.nom);
                              setUserForm({ ...userForm, prenom, username: login });
                            }
                          }}
                          placeholder="Prénom"
                        />
                        <FieldError message={userFormErrors.prenom} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
                        <Input
                          {...invalidFieldProps(userFormErrors.nom, "text-xs")}
                          value={userForm.nom}
                          onChange={(e) => {
                            clearUserFormError?.("nom");
                            clearUserFormError?.("username");
                            const nom = e.target.value;
                            if (selectedPartnerUserId) {
                              setUserForm({ ...userForm, nom });
                            } else {
                              const login = deriveLogin(userForm.prenom, nom);
                              setUserForm({ ...userForm, nom, username: login });
                            }
                          }}
                          placeholder="Nom"
                        />
                        <FieldError message={userFormErrors.nom} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Login <span className="text-destructive">*</span></Label>
                        <Input
                          {...invalidFieldProps(
                            userFormErrors.username,
                            "text-xs bg-muted cursor-not-allowed opacity-80 font-mono",
                          )}
                          value={userForm.username}
                          placeholder="Généré automatiquement (ex: j.jeandupont)"
                          disabled
                          readOnly
                        />
                        <FieldError message={userFormErrors.username} />
                        {selectedPartnerUserId && (
                          <p className="text-[10px] text-muted-foreground">
                            L'identifiant de connexion ne peut pas être modifié.
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">E-mail <span className="text-destructive">*</span></Label>
                        <Input
                          {...invalidFieldProps(userFormErrors.email, "text-xs")}
                          type="email"
                          value={userForm.email}
                          onChange={(e) => {
                            clearUserFormError?.("email");
                            setUserForm({ ...userForm, email: e.target.value });
                          }}
                          placeholder="utilisateur@domaine.com"
                        />
                        <FieldError message={userFormErrors.email} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Profil / Rôle <span className="text-destructive">*</span></Label>
                        <Select
                          value={userForm.profil}
                          onValueChange={(v) => {
                            clearUserFormError?.("profil");
                            setUserForm({ ...userForm, profil: v });
                          }}
                        >
                          <SelectTrigger {...invalidFieldProps(userFormErrors.profil, "text-xs")}>
                            <SelectValue placeholder="Sélectionner le profil" />
                          </SelectTrigger>
                          <SelectContent>
                            {profilsForCategorie(form.categorie).map((p) => (
                              <SelectItem key={p} value={p}>
                                {getProfileDisplayName(p)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={userFormErrors.profil} />
                      </div>
                    </div>
                    {selectedPartnerUserId && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          className="gradient-accent text-accent-foreground"
                          onClick={updatePartnerUser}
                          disabled={savingPartnerUser}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          {savingPartnerUser ? "Modification..." : "Modifier l'utilisateur"}
                        </Button>
                      </div>
                    )}
                    {!selectedPartnerUserId && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void addUser()}
                          disabled={savingPartnerUser}
                          className="gradient-accent text-accent-foreground"
                        >
                          {savingPartnerUser ? "Ajout..." : "Ajouter l'utilisateur"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Liste des utilisateurs */}
                {safeUsers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Utilisateurs rattachés au partenaire ({safeUsers.length})
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {safeUsers.map((u) => (
                        <div
                          key={u.user_id}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs bg-muted/20 transition-colors ${
                            selectedPartnerUserId === u.user_id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => selectPartnerUser(u)}
                          >
                            <div className="font-medium text-foreground">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              Login: <span className="font-semibold text-foreground">{u.username}</span> • Email: {u.email || "-"}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {getProfileDisplayName(u.profiles?.[0] || "")}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeUser(u.user_id);
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

        {/* Multi-sélection des services du partenaire (commun à Particulier et Entreprise) */}
        {activeTab !== "utilisateur" && renderServicesSelector()}
      </div>
    </FormDialog>
  );
};

export default PartenaireFormDialog;
