import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Coins,
  Edit,
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  Package,
  Palette,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProduitDetail } from "../viewmodels/useProduitDetail";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";
import {
  activateAccessSecurityUser,
  createBackofficeUser,
  deleteAccessSecurityUser,
  deactivateAccessSecurityUser,
  requestAccessSecurityPasswordReset,
  updateAccessSecurityUser,
  type HierarchyMemberUser,
} from "@/core/security/accessSecurityService";
import {
  ProduitDetailUserDialog,
  type UserFormData,
} from "./components/ProduitDetailUserDialog";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { ProduitDetailUserFormField, validateProduitDetailUserForm } from "../models/validation";
import { useCommissions } from "@/features/tarification/viewmodels/useCommissions";
import { ProduitCommissionsSection } from "./components/ProduitCommissionsSection";

interface ProductLogoProps {
  src?: string | null;
  alt: string;
}

const ProductLogo = ({ src, alt }: ProductLogoProps) => {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain p-2"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
      <Package className="h-7 w-7" />
    </div>
  );
};

const ProduitDetailPage = () => {
  const vm = useProduitDetail();
  // Répartitions de commission du produit (service de commissions de la Tarification), en consultation
  const commissionsVm = useCommissions({
    enabled: Boolean(vm.produit?.id),
    scope: { tenantLevel: "PRODUCT", tenantId: vm.produit?.id ?? null, tenantLabel: vm.produit?.nom },
  });
  const navigate = useNavigate();

  // User modal state
  const [editingUser, setEditingUser] = useState<HierarchyMemberUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    profile: "profile.bo.produit-central",
  });
  const [userFormOpen, setUserFormOpenState] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const {
    errors: userFormErrors,
    setErrors: setUserFormErrors,
    clearError: clearUserFormError,
    resetErrors: resetUserFormErrors,
  } = useFieldErrors<ProduitDetailUserFormField>();

  const setUserFormOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetUserFormErrors();
    setUserFormOpenState(open);
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      profile: vm.availableProfiles[0] || "profile.bo.produit-central",
    });
    setUserFormOpen(true);
  };

  const openEditUser = (user: HierarchyMemberUser) => {
    setEditingUser(user);
    const { prenom, nom } = parseNameParts(user.username || user.email);
    setUserForm({
      firstName: user.first_name ?? (prenom !== "-" ? prenom : ""),
      lastName: user.last_name ?? (nom !== "-" ? nom : ""),
      username: user.username || "",
      email: user.email ?? "",
      profile: user.profiles?.[0] ?? vm.availableProfiles[0] ?? "profile.bo.produit-central",
    });
    setUserFormOpen(true);
  };

  const saveUser = async () => {
    if (savingUser || !vm.produit) return;
    const firstName = userForm.firstName.trim();
    const lastName = userForm.lastName.trim();
    const username = userForm.username.trim();
    const email = userForm.email.trim().toLowerCase();
    const profile = userForm.profile.trim();

    const validationErrors = validateProduitDetailUserForm(userForm);
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return;
    }

    setSavingUser(true);
    try {
      if (editingUser) {
        const updated = await updateAccessSecurityUser(editingUser.user_id, {
          login: username,
          profiles: [profile],
          profile_client_id: "backoffice-web",
          first_name: firstName || null,
          last_name: lastName || null,
          email,
        });
        vm.setUtilisateurs((previous) =>
          previous.map((user) =>
            user.user_id === editingUser.user_id
              ? {
                  ...user,
                  username,
                  first_name: updated.first_name ?? firstName,
                  last_name: updated.last_name ?? lastName,
                  email: updated.email ?? email,
                  profiles: [profile],
                }
              : user
          )
        );
        setUserFormOpen(false);
        toast.success("Utilisateur modifié avec succès");
      } else {
        const createdUser = await createBackofficeUser({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          target_scope: [{ ref_type: "PRODUCT", ref_id: vm.produit.id }],
          profiles: [profile],
        });
        vm.setUtilisateurs((previous) => [
          {
            user_id: createdUser.account_user_id,
            username: createdUser.account_username,
            email,
            first_name: firstName,
            last_name: lastName,
            profiles: [profile],
            active: true,
          },
          ...previous,
        ]);
        setUserFormOpen(false);
        toast.success("Utilisateur créé avec succès");
      }
    } catch (userError) {
      toast.error(
        userError instanceof Error
          ? userError.message
          : editingUser
          ? "Impossible de modifier l'utilisateur"
          : "Impossible de créer l'utilisateur"
      );
    } finally {
      setSavingUser(false);
    }
  };

  const handleUserAction = async (user: HierarchyMemberUser, action: "reset" | "toggle" | "delete") => {
    try {
      if (action === "reset") {
        await requestAccessSecurityPasswordReset(user.email || user.username, user.email);
        toast.success("Demande de réinitialisation envoyée");
      } else if (action === "delete") {
        await deleteAccessSecurityUser(user.user_id);
        vm.setUtilisateurs((previous) => previous.filter((item) => item.user_id !== user.user_id));
        toast.success("Utilisateur supprimé avec succès");
      } else {
        const updated =
          user.active === false
            ? await activateAccessSecurityUser(user.user_id)
            : await deactivateAccessSecurityUser(user.user_id);
        vm.setUtilisateurs((previous) =>
          previous.map((item) =>
            item.user_id === user.user_id ? { ...item, active: user.active === false } : item
          )
        );
        toast.success(updated.message || "Statut utilisateur mis à jour");
      }
    } catch (userError) {
      toast.error(userError instanceof Error ? userError.message : "Impossible d'effectuer l'action");
    }
  };

  if (vm.loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span>Chargement du produit...</span>
        </div>
      </div>
    );
  }

  if (!vm.produit) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/produits")}
          className="gap-2 hover:bg-transparent hover:text-inherit"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux produits
        </Button>
        <div className="text-center py-12 text-muted-foreground">Produit introuvable</div>
      </div>
    );
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const parseNameParts = (username?: string): { prenom: string; nom: string } => {
    if (!username) return { prenom: "-", nom: "-" };
    const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) {
      return { prenom: "-", nom: "-" };
    }

    const [first, ...rest] = parts;
    const last = rest.join(" ") || "-";
    return {
      prenom: first.charAt(0).toUpperCase() + first.slice(1),
      nom: last.toUpperCase(),
    };
  };

  const hasBranding = Boolean(
    vm.produit.brandingConfig &&
      (vm.produit.brandingConfig.primaryColor ||
        vm.produit.brandingConfig.secondaryColor ||
        vm.produit.brandingConfig.accentColor ||
        vm.produit.brandingConfig.sidebarColor ||
        vm.produit.brandingConfig.borderColor)
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header aligné avec Partenaires et Structures */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent hover:text-inherit shrink-0"
            onClick={() => navigate("/dashboard/produits")}
            aria-label="Retour aux produits"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <ProductLogo
              key={vm.produit.media_url || "default"}
              src={vm.produit.media_url}
              alt={vm.produit.nom}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vm.produit.nom}</h1>
            <p className="text-muted-foreground text-sm flex items-center flex-wrap gap-x-2">
              {vm.produit.code && (
                <span>
                  Code : <span className="font-medium text-foreground">{vm.produit.code}</span>
                </span>
              )}
              {vm.produit.code && vm.produit.libelleExpediteur && (
                <span className="text-muted-foreground/40">•</span>
              )}
              {vm.produit.libelleExpediteur && (
                <span>
                  Libellé SMS :{" "}
                  <span className="font-medium text-foreground">
                    {vm.produit.libelleExpediteur}
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
        <Badge
          className={
            vm.produit.statut === "active"
              ? "bg-accent/15 text-accent border-accent/30 self-start sm:self-auto"
              : "bg-destructive/15 text-destructive border-destructive/30 self-start sm:self-auto"
          }
          variant="outline"
        >
          {vm.produit.statut === "active" ? "Actif" : "Inactif"}
        </Badge>
      </motion.div>

      {/* Onglets principaux */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Tabs
          value={vm.activeTab}
          onValueChange={vm.handleTabChange}
          className="w-full space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 max-w-md h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="structures">Structures</TabsTrigger>
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          </TabsList>

          {/* ===== ONGLET DETAILS ===== */}
          <TabsContent value="details" className="space-y-6">
            {/* Informations Générales */}
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Informations Générales
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Caractéristiques principales et identifiants du produit
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">
                    Nom du produit
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {vm.produit.nom || "—"}
                  </p>
                </div>

                {vm.produit.code && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">Code</span>
                    <p className="text-sm font-semibold text-foreground font-mono">
                      {vm.produit.code}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">
                    Libellé Expéditeur SMS
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {vm.produit.libelleExpediteur || "—"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">
                    Date d'activation
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateTime(vm.produit.dateCreation)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Statut</span>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {vm.produit.statut === "active" ? "Actif" : "Inactif"}
                  </p>
                </div>

                {vm.produit.description && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-1.5 pt-4 border-t border-border/40">
                    <span className="text-xs text-muted-foreground font-medium block">
                      Description
                    </span>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {vm.produit.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Partage des Commissions */}
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                    <Coins className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Partage de Commissions
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Répartition des commissions par type de service et par phase
                    </p>
                  </div>
                </div>
              </div>

              <ProduitCommissionsSection vm={commissionsVm} readOnly />
            </div>

            {/* Identité visuelle (si configurée) */}
            {hasBranding && (
              <div className="glass-card rounded-xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                      <Palette className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Identité visuelle</h3>
                      <p className="text-xs text-muted-foreground">Couleurs et charte visuelle du produit</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 flex-wrap pt-2">
                  {Boolean(vm.produit.brandingConfig?.primaryColor) && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded-full border shadow-xs"
                        style={{
                          backgroundColor:
                            String(vm.produit.brandingConfig?.primaryColor).startsWith("#") ||
                            String(vm.produit.brandingConfig?.primaryColor).startsWith("rgb")
                              ? String(vm.produit.brandingConfig?.primaryColor)
                              : `hsl(${vm.produit.brandingConfig?.primaryColor})`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Primaire</span>
                    </div>
                  )}
                  {Boolean(vm.produit.brandingConfig?.secondaryColor) && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded-full border shadow-xs"
                        style={{
                          backgroundColor:
                            String(vm.produit.brandingConfig?.secondaryColor).startsWith("#") ||
                            String(vm.produit.brandingConfig?.secondaryColor).startsWith("rgb")
                              ? String(vm.produit.brandingConfig?.secondaryColor)
                              : `hsl(${vm.produit.brandingConfig?.secondaryColor})`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Secondaire</span>
                    </div>
                  )}
                  {Boolean(vm.produit.brandingConfig?.accentColor) && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded-full border shadow-xs"
                        style={{
                          backgroundColor:
                            String(vm.produit.brandingConfig?.accentColor).startsWith("#") ||
                            String(vm.produit.brandingConfig?.accentColor).startsWith("rgb")
                              ? String(vm.produit.brandingConfig?.accentColor)
                              : `hsl(${vm.produit.brandingConfig?.accentColor})`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Accent</span>
                    </div>
                  )}
                  {Boolean(vm.produit.brandingConfig?.sidebarColor) && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded-full border shadow-xs"
                        style={{
                          backgroundColor:
                            String(vm.produit.brandingConfig?.sidebarColor).startsWith("#") ||
                            String(vm.produit.brandingConfig?.sidebarColor).startsWith("rgb")
                              ? String(vm.produit.brandingConfig?.sidebarColor)
                              : `hsl(${vm.produit.brandingConfig?.sidebarColor})`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Sidebar</span>
                    </div>
                  )}
                  {Boolean(vm.produit.brandingConfig?.borderColor) && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded-full border shadow-xs"
                        style={{
                          backgroundColor:
                            String(vm.produit.brandingConfig?.borderColor).startsWith("#") ||
                            String(vm.produit.brandingConfig?.borderColor).startsWith("rgb")
                              ? String(vm.produit.brandingConfig?.borderColor)
                              : `hsl(${vm.produit.brandingConfig?.borderColor})`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Bordure</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== ONGLET STRUCTURES ===== */}
          <TabsContent value="structures" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Structures associées</h2>
              <p className="text-xs text-muted-foreground">
                {vm.structures.length} structure(s)
              </p>
            </div>

            {/* Filtres structures : Recherche (search) & Statut (is_active) */}
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou code..."
                    value={vm.structureSearch}
                    onChange={(e) => vm.setStructureSearch(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>
                <Select
                  value={vm.structureStatusFilter}
                  onValueChange={vm.setStructureStatusFilter}
                >
                  <SelectTrigger aria-label="Filtrer par statut">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {vm.structuresLoading ? (
              <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <span>Chargement des structures...</span>
              </div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Nom</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vm.structures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          Aucune structure associée à ce produit
                        </TableCell>
                      </TableRow>
                    ) : (
                      vm.structures.map((s) => (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => navigate(`/dashboard/structures/${s.id}`)}
                        >
                          <TableCell className="font-medium">
                            <div>
                              <span>{s.name}</span>
                              {s.code && (
                                <span className="block text-xs font-mono text-muted-foreground">
                                  {s.code}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {s.type || "OTHER"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                s.is_active
                                  ? "bg-accent/15 text-accent border-accent/30"
                                  : "bg-destructive/15 text-destructive border-destructive/30"
                              }
                              variant="outline"
                            >
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-accent p-0 h-auto font-medium"
                              onClick={() => navigate(`/dashboard/structures/${s.id}`)}
                            >
                              Voir détails
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ===== ONGLET UTILISATEURS ===== */}
          <TabsContent value="utilisateurs" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Utilisateurs associés</h2>
                <p className="text-xs text-muted-foreground">
                  {vm.utilisateurs.length} utilisateur(s) rattaché(s)
                </p>
              </div>
              <Button
                size="sm"
                onClick={openAddUser}
                className="gradient-accent text-accent-foreground"
              >
                <Plus className="h-4 w-4 mr-2" /> Nouvel utilisateur
              </Button>
            </div>

            {/* Filtres utilisateurs : username, email, profil, statut */}
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom d'utilisateur..."
                    value={vm.utilisateurUsername}
                    onChange={(e) => vm.setUtilisateurUsername(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Email..."
                    type="email"
                    value={vm.utilisateurEmail}
                    onChange={(e) => vm.setUtilisateurEmail(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>
                <Select
                  value={vm.utilisateurProfile || "all"}
                  onValueChange={(val) => vm.setUtilisateurProfile(val === "all" ? "" : val)}
                >
                  <SelectTrigger aria-label="Filtrer par profil">
                    <SelectValue placeholder="Profil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les profils</SelectItem>
                    {vm.availableProfiles.map((p) => (
                      <SelectItem key={p} value={p}>
                        {getProfileDisplayName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={vm.utilisateurStatus}
                  onValueChange={(val) => vm.setUtilisateurStatus(val)}
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

            {vm.utilisateursLoading ? (
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
                      <TableHead className="font-semibold">Matricule</TableHead>
                      <TableHead className="font-semibold">Profil</TableHead>
                      <TableHead className="font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vm.utilisateurs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          Aucun utilisateur associé à ce produit
                        </TableCell>
                      </TableRow>
                    ) : (
                      vm.utilisateurs.map((u) => {
                        const fullName =
                          u.first_name || u.last_name
                            ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                            : (() => {
                                const { prenom, nom } = parseNameParts(u.username || u.email);
                                return `${prenom} ${nom}`.trim();
                              })();

                        return (
                          <TableRow key={u.user_id}>
                            <TableCell className="font-medium">{fullName || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {u.username || "N/A"}
                            </TableCell>
                            <TableCell className="break-words">{u.email || "N/A"}</TableCell>
                            <TableCell>{u.matricule || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-muted/30 text-xs">
                                {u.profiles && u.profiles.length > 0
                                  ? getProfileDisplayName(u.profiles[0])
                                  : "N/A"}
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
                                    {u.active === false ? (
                                      <ToggleRight className="h-4 w-4 mr-2" />
                                    ) : (
                                      <ToggleLeft className="h-4 w-4 mr-2" />
                                    )}
                                    {u.active === false ? "Activer" : "Désactiver"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleUserAction(u, "delete")}
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
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialog d'ajout / modification utilisateur */}
      <ProduitDetailUserDialog
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        isEditing={Boolean(editingUser)}
        userForm={userForm}
        setUserForm={setUserForm}
        onSave={saveUser}
        savingUser={savingUser}
        errors={userFormErrors}
        onClearError={clearUserFormError}
        availableProfiles={vm.availableProfiles}
        existingUsernames={
          vm.utilisateurs.map((u) => u.username).filter(Boolean) as string[]
        }
      />
    </div>
  );
};

export default ProduitDetailPage;
