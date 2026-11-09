import { useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PartenaireDetailUserDialog } from "./components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Edit,
  KeyRound,
  Calendar,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  Layers,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { fetchPartenaireById, fetchPartnerServices, fetchPointsDeVente } from "../services/partenairesService";
import {
  activateAccessSecurityUser,
  createBackofficeUser,
  deleteAccessSecurityUser,
  deactivateAccessSecurityUser,
  listHierarchyMembers,
  requestAccessSecurityPasswordReset,
  updateAccessSecurityUser,
  type HierarchyMemberUser,
} from "@/core/security/accessSecurityService";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";
import type { Partenaire, PointDeVente, ServicePartenaire } from "../models/types";
import { PartenairePointsDeVenteTab } from "./components/PartenairePointsDeVenteTab";
import { type PartenaireDetailUserFormField, validatePartenaireDetailUserForm } from "../models/validation";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

const PartenaireDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [partner, setPartner] = useState<Partenaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  // Users state — loaded lazily when the utilisateurs tab is first opened
  const [partnerUsers, setPartnerUsers] = useState<HierarchyMemberUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userProfileFilter, setUserProfileFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  // User modal state
  const [editingUser, setEditingUser] = useState<HierarchyMemberUser | null>(null);
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    profile: "",
  });
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const {
    errors: userFormErrors,
    setErrors: setUserFormErrors,
    clearError: clearUserFormError,
    resetErrors: resetUserFormErrors,
  } = useFieldErrors<PartenaireDetailUserFormField>();

  // Ouverture/fermeture du dialogue utilisateur : les erreurs de validation repartent de zéro
  const handleUserFormOpenChange = (open: boolean) => {
    resetUserFormErrors();
    setUserFormOpen(open);
  };

  // Services filters
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceCanalFilter, setServiceCanalFilter] = useState("all");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");

  // Points de vente filters

  const loadPartner = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const p = await fetchPartenaireById(id);

      // Charger les services rattachés au partenaire dès que l'endpoint backend est disponible
      try {
        const partnerServices = await fetchPartnerServices(id);
        if (partnerServices && partnerServices.length > 0) {
          p.services = partnerServices;
        }
      } catch {
        // Fallback gracieux si l'endpoint n'est pas encore disponible
      }

      // Charger les points de vente dédiés du partenaire
      try {
        const partnerPdvs = await fetchPointsDeVente(id);
        if (partnerPdvs && partnerPdvs.length > 0) {
          p.pointsDeVente = partnerPdvs;
        }
      } catch {
        // Fallback gracieux sur pointsDeVente embarqués
      }

      setPartner(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le partenaire");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadUsers = useCallback(async (partnerId: string) => {
    if (usersLoaded) return;
    setUsersLoading(true);
    try {
      const response = await listHierarchyMembers(
        "PARTNER",
        partnerId,
        import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID || "backoffice-web"
      );
      setPartnerUsers(response.users ?? []);
      setUsersLoaded(true);
    } catch {
      setPartnerUsers([]);
      setUsersLoaded(true);
    } finally {
      setUsersLoading(false);
    }
  }, [usersLoaded]);

  useEffect(() => {
    loadPartner();
  }, [loadPartner]);

  const availableProfiles = useMemo(() => {
    if (!partner) return [];
    return partner.categorie === "facturier"
      ? ["profile.bo.partenaire-admin", "profile.bo.partenaire-facturier"]
      : ["profile.bo.partenaire-admin", "profile.bo.partenaire-marchand"];
  }, [partner]);

  const filteredUsers = useMemo(() => {
    return partnerUsers.filter((user) => {
      const query = userSearch.toLowerCase().trim();
      if (query) {
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
        const username = (user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        if (!fullName.includes(query) && !username.includes(query) && !email.includes(query)) {
          return false;
        }
      }
      if (userProfileFilter !== "all") {
        if (!user.profiles?.includes(userProfileFilter)) {
          return false;
        }
      }
      if (userStatusFilter !== "all") {
        const isActive = user.active !== false;
        if (userStatusFilter === "active" && !isActive) return false;
        if (userStatusFilter === "inactive" && isActive) return false;
      }
      return true;
    });
  }, [partnerUsers, userSearch, userProfileFilter, userStatusFilter]);

  const services: ServicePartenaire[] = useMemo(() => partner?.services ?? [], [partner]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const query = serviceSearch.toLowerCase().trim();
      if (query) {
        const name = (s.libelle || s.name || "").toLowerCase();
        const code = (s.code || "").toLowerCase();
        if (!name.includes(query) && !code.includes(query)) {
          return false;
        }
      }
      if (serviceCanalFilter !== "all") {
        if (s.canal !== serviceCanalFilter) return false;
      }
      if (serviceStatusFilter !== "all") {
        if (s.statut !== serviceStatusFilter) return false;
      }
      return true;
    });
  }, [services, serviceSearch, serviceCanalFilter, serviceStatusFilter]);

  const pointsDeVente: PointDeVente[] = useMemo(() => partner?.pointsDeVente ?? [], [partner]);


  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span>Chargement du partenaire...</span>
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/partenaires")}
          className="gap-2 hover:bg-transparent hover:text-inherit"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux partenaires
        </Button>
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p>{error || "Partenaire introuvable"}</p>
        </div>
      </div>
    );
  }

  const isEntreprise = partner.type === "entreprise";
  const displayName = isEntreprise
    ? partner.libelle || partner.name || partner.login
    : `${partner.prenom || ""} ${partner.nom || ""}`.trim() || partner.name || partner.login;

  const openAddUser = () => {
    setEditingUser(null);
    const defaultProfile =
      partner.categorie === "marchand"
        ? "profile.bo.partenaire-admin"
        : "profile.bo.partenaire-facturier";
    setUserForm({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      profile: defaultProfile,
    });
    handleUserFormOpenChange(true);
  };

  const openEditUser = (user: HierarchyMemberUser) => {
    setEditingUser(user);
    const defaultProfile =
      partner.categorie === "marchand"
        ? "profile.bo.partenaire-admin"
        : "profile.bo.partenaire-facturier";
    setUserForm({
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      username: user.username,
      email: user.email ?? "",
      profile: user.profiles?.[0] ?? defaultProfile,
    });
    handleUserFormOpenChange(true);
  };

  const saveUser = async () => {
    if (savingUser) return;
    const firstName = userForm.firstName.trim();
    const lastName = userForm.lastName.trim();
    const username = userForm.username.trim();
    const email = userForm.email.trim().toLowerCase();
    const profile = userForm.profile.trim();

    const validationErrors = validatePartenaireDetailUserForm({ firstName, lastName, username, email, profile });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

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
        setPartnerUsers((previous) =>
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
          target_scope: [{ ref_type: "PARTNER", ref_id: partner.id }],
          profiles: [profile],
        });
        setPartnerUsers((previous) => [
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
        setPartnerUsers((previous) => previous.filter((item) => item.user_id !== user.user_id));
        toast.success("Utilisateur supprimé avec succès");
      } else {
        const updated =
          user.active === false
            ? await activateAccessSecurityUser(user.user_id)
            : await deactivateAccessSecurityUser(user.user_id);
        setPartnerUsers((previous) =>
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

  let usersContent: ReactNode;
  if (usersLoading) {
    usersContent = (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" /> Chargement des utilisateurs...
          </div>
        </TableCell>
      </TableRow>
    );
  } else if (filteredUsers.length === 0) {
    usersContent = (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
          {partnerUsers.length === 0
            ? "Aucun utilisateur rattaché à ce partenaire"
            : "Aucun utilisateur ne correspond aux filtres"}
        </TableCell>
      </TableRow>
    );
  } else {
    usersContent = filteredUsers.map((user) => (
      <TableRow key={user.user_id} className="hover:bg-muted/40">
        <TableCell className="font-medium">
          {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
        </TableCell>
        <TableCell className="font-mono text-xs">{user.username || "—"}</TableCell>
        <TableCell className="text-sm">{user.email || "—"}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            {getProfileDisplayName(user.profiles?.[0]) || user.profiles?.[0] || "—"}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={
              user.active === false
                ? "bg-destructive/15 text-destructive border-destructive/30"
                : "bg-accent/15 text-accent border-accent/30"
            }
          >
            {user.active === false ? "Inactif" : "Actif"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions utilisateur">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditUser(user)}>
                <Edit className="h-4 w-4 mr-2" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction(user, "reset")}>
                <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser le mot de passe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction(user, "toggle")}>
                {user.active === false ? (
                  <ToggleRight className="h-4 w-4 mr-2" />
                ) : (
                  <ToggleLeft className="h-4 w-4 mr-2" />
                )}
                {user.active === false ? "Activer" : "Désactiver"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleUserAction(user, "delete")}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header aligné sur StructureDetailPage / AgenceDetailPage */}
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
            onClick={() => navigate("/dashboard/partenaires")}
            aria-label="Retour aux partenaires"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
              {isEntreprise ? (
                <Building2 className="h-7 w-7" />
              ) : (
                <User className="h-7 w-7" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-muted-foreground text-sm flex items-center flex-wrap gap-x-2">
              <span>
                Type : <span className="font-medium text-foreground capitalize">{partner.type}</span>
              </span>
            </p>
          </div>
        </div>

        <div />
      </motion.div>

      {/* Onglets principaux */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            if (tab === "utilisateurs" && id) {
              loadUsers(id);
            }
          }}
          className="w-full space-y-4"
        >
          <TabsList
            className={`grid w-full ${
              partner.categorie === "marchand" ? "grid-cols-4 max-w-xl" : "grid-cols-3 max-w-md"
            } h-auto p-1 bg-muted/60 rounded-xl gap-1`}
          >
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            {partner.categorie === "marchand" && (
              <TabsTrigger value="pdv">Points de vente</TabsTrigger>
            )}
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          </TabsList>

          {/* ===== ONGLET DETAILS ===== */}
          <TabsContent value="details" className="space-y-6">
            {/* Informations Générales */}
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  {isEntreprise ? (
                    <Building2 className="h-5 w-5 text-accent" />
                  ) : (
                    <User className="h-5 w-5 text-accent" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {isEntreprise ? "Informations Entreprise" : "Identité du Particulier"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isEntreprise
                      ? "Caractéristiques principales et identifiants de l'entreprise"
                      : "Données d'état civil et pièce d'identité du partenaire"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                {isEntreprise ? (
                  <>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Raison sociale / Libellé</span>
                      <p className="text-sm font-semibold text-foreground">{partner.libelle || partner.name || "—"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">NINEA</span>
                      <p className="text-sm font-semibold text-foreground font-mono">{partner.ninea || "—"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">N° Identité Fiscale (NIF)</span>
                      <p className="text-sm font-semibold text-foreground font-mono">
                        {partner.numeroIdentiteFiscale || "—"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Catégorie</span>
                      <p className="text-sm font-semibold text-foreground capitalize">{partner.categorie}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Prénom</span>
                      <p className="text-sm font-semibold text-foreground">{partner.prenom || "—"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Nom</span>
                      <p className="text-sm font-semibold text-foreground">{partner.nom || "—"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Date de naissance</span>
                      <p className="text-sm font-semibold text-foreground">
                        {partner.dateNaissance ? new Date(partner.dateNaissance).toLocaleDateString() : "—"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Type de pièce</span>
                      <p className="text-sm font-semibold text-foreground">{partner.typePiece || "—"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Date de délivrance</span>
                      <p className="text-sm font-semibold text-foreground">
                        {partner.dateDelivrance ? new Date(partner.dateDelivrance).toLocaleDateString() : "—"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Date d'expiration</span>
                      <p className="text-sm font-semibold text-foreground">
                        {partner.dateExpiration ? new Date(partner.dateExpiration).toLocaleDateString() : "—"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">Catégorie</span>
                      <p className="text-sm font-semibold text-foreground capitalize">{partner.categorie}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Coordonnées & Contacts */}
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Coordonnées & Contact</h3>
                  <p className="text-xs text-muted-foreground">Moyens de contact et canaux de communication</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Adresse email</span>
                  <p className="text-sm font-semibold text-foreground break-all">{partner.email || "—"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Téléphone</span>
                  <p className="text-sm font-semibold text-foreground font-mono">{partner.telephone || "—"}</p>
                </div>

                {partner.profil && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">Profil initial</span>
                    <p className="text-sm font-semibold text-foreground">
                      {getProfileDisplayName(partner.profil)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Historique & Dates clés */}
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Historique & Dates clés</h3>
                  <p className="text-xs text-muted-foreground">Création, activation et historique d'activité</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Date d'activation</span>
                  <p className="text-sm font-semibold text-foreground">
                    {partner.activatedAt ? new Date(partner.activatedAt).toLocaleString() : "—"}
                  </p>
                </div>

                {partner.deactivatedAt && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">Date de désactivation</span>
                    <p className="text-sm font-semibold text-destructive">
                      {new Date(partner.deactivatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== ONGLET SERVICES ===== */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Services rattachés</h2>
                <p className="text-xs text-muted-foreground">{services.length} service(s) configuré(s)</p>
              </div>
            </div>

            {/* Filtres Services */}
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou code..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>

                <Select value={serviceCanalFilter} onValueChange={setServiceCanalFilter}>
                  <SelectTrigger aria-label="Filtrer par canal">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les canaux</SelectItem>
                    <SelectItem value="WALLET">WALLET</SelectItem>
                    <SelectItem value="COMPTE_A_COMPTE">COMPTE_A_COMPTE</SelectItem>
                    <SelectItem value="CASH">CASH</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={serviceStatusFilter} onValueChange={setServiceStatusFilter}>
                  <SelectTrigger aria-label="Filtrer par statut">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Libellé du service</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Canal</TableHead>
                    <TableHead className="font-semibold">Date d'activation</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        {services.length === 0
                          ? "Aucun service rattaché à ce partenaire"
                          : "Aucun service ne correspond aux filtres"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((srv) => (
                      <TableRow key={srv.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                              <Layers className="h-4 w-4 text-accent" />
                            </div>
                            <span>{srv.libelle || srv.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{srv.code || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {srv.canal}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {srv.activatedAt ? new Date(srv.activatedAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              srv.statut === "actif"
                                ? "bg-accent/15 text-accent border-accent/30"
                                : "bg-destructive/15 text-destructive border-destructive/30"
                            }
                          >
                            {srv.statut === "actif" ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ===== ONGLET POINTS DE VENTE ===== */}
          {partner.categorie === "marchand" && (
            <TabsContent value="pdv" className="space-y-4">
              <PartenairePointsDeVenteTab partnerId={partner.id} initialItems={pointsDeVente} />
            </TabsContent>
          )}

          {/* ===== ONGLET UTILISATEURS ===== */}
          <TabsContent value="utilisateurs" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Utilisateurs du partenaire</h2>
                <p className="text-xs text-muted-foreground">{partnerUsers.length} utilisateur(s) rattaché(s)</p>
              </div>
              <Button size="sm" onClick={openAddUser} className="gradient-accent text-accent-foreground">
                <Plus className="h-4 w-4 mr-2" /> Nouvel utilisateur
              </Button>
            </div>

            {/* Filtres Utilisateurs */}
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, identifiant ou email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>

                <Select value={userProfileFilter} onValueChange={setUserProfileFilter}>
                  <SelectTrigger aria-label="Filtrer par profil">
                    <SelectValue placeholder="Profil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les profils</SelectItem>
                    {availableProfiles.map((p) => (
                      <SelectItem key={p} value={p}>
                        {getProfileDisplayName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
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

            <div className="glass-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Nom & Prénom</TableHead>
                    <TableHead className="font-semibold">Nom d'utilisateur</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Profil</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{usersContent}</TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* User Form Dialog */}
      <PartenaireDetailUserDialog
        open={userFormOpen}
        onOpenChange={handleUserFormOpenChange}
        isEditing={Boolean(editingUser)}
        userForm={userForm}
        setUserForm={setUserForm}
        errors={userFormErrors}
        clearError={clearUserFormError}
        onSave={saveUser}
        savingUser={savingUser}
        partnerCategory={partner.categorie}
        existingUsernames={partnerUsers.map((u) => u.username)}
      />
    </div>
  );
};

export default PartenaireDetailPage;
