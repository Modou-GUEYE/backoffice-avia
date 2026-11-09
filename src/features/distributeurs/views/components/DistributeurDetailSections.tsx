import React, { useState } from "react";
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
  Building2,
  CheckCircle2,
  Copy,
  DollarSign,
  Edit,
  ExternalLink,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import type { Distributeur, DistributeurUser } from "../../models/types";
import type { AgenceRead } from "@/features/agences/models/types";
import type { CaisseRead } from "@/features/caisses/models/types";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";

// Tab 1: Informations Générales (Design aligné sur Structures & Caisses)
interface DistributeurGeneralTabProps {
  distributeur: Distributeur;
  structureName: string;
  canUpdate: boolean;
}

export const DistributeurGeneralTab: React.FC<DistributeurGeneralTabProps> = ({
  distributeur,
  structureName,
}) => {
  const navigate = useNavigate();
  const d = distributeur;

  const copyId = () => {
    navigator.clipboard.writeText(d.id);
    toast.success("Identifiant copié dans le presse-papiers");
  };

  return (
    <div className="space-y-6">
      {/* Section 1 : Informations Générales */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/40">
          <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Informations Générales</h3>
            <p className="text-xs text-muted-foreground">
              Caractéristiques principales et structure de rattachement du distributeur
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {/* Nom du distributeur */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Nom du distributeur</span>
            <p className="text-sm font-semibold text-foreground">{d.name || d.nom}</p>
          </div>

          {/* Structure de rattachement */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Structure</span>
            <p className="text-sm font-semibold text-foreground">{structureName}</p>
          </div>

          {/* Statut */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Statut</span>
            <div>
              <Badge
                className={
                  d.is_active
                    ? "bg-accent/15 text-accent border-accent/30"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                }
                variant="outline"
              >
                {d.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>

          {/* Identifiant technique UUID */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Identifiant (UUID)</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[140px]">
                {d.id}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={copyId}
                title="Copier l'identifiant"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 : Coordonnées & Contact */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/40">
          <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Coordonnées</h3>
            <p className="text-xs text-muted-foreground">
              Moyens de contact et localisation du distributeur
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Adresse e-mail</span>
            <p className="text-sm font-semibold text-foreground">{d.contact_email || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Téléphone</span>
            <p className="text-sm font-semibold text-foreground">{d.contact_phone || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Adresse physique</span>
            <p className="text-sm font-semibold text-foreground">{d.address || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// Tab 2: Agences rattachées (Filtres backend : search, city, is_active)
interface DistributeurAgencesTabProps {
  distributeurId?: string;
  distributeurName?: string;
  agences: AgenceRead[];
  loading: boolean;
  canCreateAgence: boolean;
  canUpdateAgence?: boolean;
  canDeleteAgence?: boolean;
  onOpenAddAgence: () => void;
  onOpenEditAgence?: (a: AgenceRead) => void;
  onConfirmToggleStatus?: (a: AgenceRead) => void;
  onConfirmDelete?: (a: AgenceRead) => void;
  search: string;
  onSearchChange: (val: string) => void;
  city: string;
  onCityChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
}

export const DistributeurAgencesTab: React.FC<DistributeurAgencesTabProps> = ({
  distributeurId,
  distributeurName,
  agences,
  loading,
  canCreateAgence,
  canUpdateAgence = false,
  canDeleteAgence = false,
  onOpenAddAgence,
  onOpenEditAgence,
  onConfirmToggleStatus,
  onConfirmDelete,
  search,
  onSearchChange,
  city,
  onCityChange,
  status,
  onStatusChange,
}) => {
  const navigate = useNavigate();
  const hasFilters = search.trim() !== "" || city.trim() !== "" || status !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Agences du distributeur</h2>
        </div>
        {canCreateAgence && (
          <Button onClick={onOpenAddAgence} size="sm" className="gradient-accent text-accent-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Nouvelle agence
          </Button>
        )}
      </div>

      {/* Filtres Agences Backend (search, city, is_active) */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou code d'agence..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par ville..."
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select value={status} onValueChange={onStatusChange}>
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

      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Chargement des agences...</span>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Agence</TableHead>
                <TableHead className="font-semibold">Entité parente</TableHead>
                <TableHead className="font-semibold">Ville</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Date activation</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {hasFilters
                      ? "Aucune agence ne correspond à vos critères de recherche"
                      : "Aucune agence associée à ce distributeur"}
                  </TableCell>
                </TableRow>
              ) : (
                agences.map((agence) => (
                  <TableRow
                    key={agence.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      if (distributeurId) {
                        navigate(`/dashboard/distributeurs/${distributeurId}/agences/${agence.id}`);
                      } else {
                        navigate(`/dashboard/agences/${agence.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-foreground font-semibold block">{agence.name}</span>
                          {agence.code && (
                            <span className="font-mono text-xs text-muted-foreground">{agence.code}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-sm font-medium text-foreground">
                          {distributeurName || "—"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal"
                        >
                          Distributeur
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{agence.city || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          agence.is_active
                            ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
                            : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                        }
                      >
                        {agence.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateTime(agence.activated_at)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Actions pour l'agence ${agence.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdateAgence && onOpenEditAgence && (
                            <>
                              <DropdownMenuItem onClick={() => onOpenEditAgence(agence)}>
                                <Edit className="h-4 w-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onConfirmToggleStatus?.(agence)}>
                                {agence.is_active ? (
                                  <>
                                    <ToggleLeft className="h-4 w-4 mr-2" /> Désactiver
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="h-4 w-4 mr-2" /> Activer
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDeleteAgence && onConfirmDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onConfirmDelete(agence)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

// Tab 3: Caisses rattachées (Filtres backend : search, is_active)
interface DistributeurCaissesTabProps {
  distributeurId?: string;
  caisses: CaisseRead[];
  agences?: AgenceRead[];
  loading: boolean;
  canCreateCaisse: boolean;
  canUpdateCaisse?: boolean;
  canDeleteCaisse?: boolean;
  onOpenAddCaisse: () => void;
  onOpenEditCaisse?: (c: CaisseRead) => void;
  onConfirmToggleCaisseStatus?: (c: CaisseRead) => void;
  onConfirmDeleteCaisse?: (c: CaisseRead) => void;
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
}

export const DistributeurCaissesTab: React.FC<DistributeurCaissesTabProps> = ({
  distributeurId,
  caisses,
  agences = [],
  loading,
  canCreateCaisse,
  canUpdateCaisse = false,
  canDeleteCaisse = false,
  onOpenAddCaisse,
  onOpenEditCaisse,
  onConfirmToggleCaisseStatus,
  onConfirmDeleteCaisse,
  search,
  onSearchChange,
  status,
  onStatusChange,
}) => {
  const navigate = useNavigate();
  const hasFilters = search.trim() !== "" || status !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Caisses du distributeur</h2>
        </div>
        {canCreateCaisse && (
          <Button onClick={onOpenAddCaisse} size="sm" className="gradient-accent text-accent-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Nouvelle caisse
          </Button>
        )}
      </div>

      {/* Filtres Caisses Backend (search, is_active) */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par code, nom de caisse ou caissier..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select value={status} onValueChange={onStatusChange}>
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

      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Chargement des caisses...</span>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Caisse</TableHead>
                <TableHead className="font-semibold">Agence</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caisses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    {hasFilters
                      ? "Aucune caisse ne correspond à vos critères de recherche"
                      : "Aucune caisse associée à ce distributeur"}
                  </TableCell>
                </TableRow>
              ) : (
                caisses.map((caisse) => {
                  const agency = agences.find((a) => a.id === caisse.agency_id);
                  return (
                    <TableRow
                      key={caisse.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => {
                        if (distributeurId) {
                          navigate(`/dashboard/distributeurs/${distributeurId}/caisses/${caisse.id}`);
                        } else {
                          navigate(`/dashboard/caisses/${caisse.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-foreground font-semibold block">{caisse.name}</span>
                            {caisse.code && (
                              <span className="font-mono text-xs text-muted-foreground">{caisse.code}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-sm font-medium text-foreground">
                            {agency ? agency.name : caisse.agency_id || "—"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-normal"
                          >
                            Distributeur
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            caisse.is_active
                              ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
                              : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                          }
                        >
                          {caisse.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Actions pour la caisse ${caisse.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdateCaisse && onOpenEditCaisse && (
                              <>
                                <DropdownMenuItem onClick={() => onOpenEditCaisse(caisse)}>
                                  <Edit className="h-4 w-4 mr-2" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onConfirmToggleCaisseStatus?.(caisse)}>
                                  {caisse.is_active ? (
                                    <>
                                      <ToggleLeft className="h-4 w-4 mr-2" /> Désactiver
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="h-4 w-4 mr-2" /> Activer
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDeleteCaisse && onConfirmDeleteCaisse && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onConfirmDeleteCaisse(caisse)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            )}
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
    </div>
  );
};

// Tab 4: Utilisateurs rattachés au distributeur (Filtres backend : username, email, profile, status)
interface DistributeurUsersTabProps {
  users: Array<DistributeurUser>;
  loading?: boolean;
  availableRoles?: string[];
  username: string;
  onUsernameChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  profile: string;
  onProfileChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  onOpenAddUser: () => void;
  onEditUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onToggleStatut: (userId: string) => void;
  onResetPassword: (user: DistributeurUser) => void;
  onValidatePassword: (user: DistributeurUser) => void;
}

export const DistributeurUsersTab: React.FC<DistributeurUsersTabProps> = ({
  users,
  loading = false,
  availableRoles = [],
  username,
  onUsernameChange,
  email,
  onEmailChange,
  profile,
  onProfileChange,
  status,
  onStatusChange,
  onOpenAddUser,
  onEditUser,
  onDeleteUser,
  onToggleStatut,
  onResetPassword,
  onValidatePassword,
}) => {
  const [userToDelete, setUserToDelete] = useState<DistributeurUser | null>(null);
  const hasFilters = Boolean(
    username.trim() ||
    email.trim() ||
    (profile && profile !== "all") ||
    (status && status !== "all")
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Utilisateurs du distributeur</h2>
        </div>
        <Button onClick={onOpenAddUser} size="sm" className="gradient-accent text-accent-foreground">
          <Plus className="h-4 w-4 mr-1.5" /> Nouvel utilisateur
        </Button>
      </div>

      {/* Filtres Utilisateurs Backend (username, email, profile, status) */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par login..."
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par email..."
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select
            value={profile || "all"}
            onValueChange={(val) => onProfileChange(val === "all" ? "" : val)}
          >
            <SelectTrigger aria-label="Filtrer par profil">
              <SelectValue placeholder="Profil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les profils</SelectItem>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {getProfileDisplayName(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={onStatusChange}>
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

      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                <TableHead className="font-semibold">Profil</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {hasFilters
                      ? "Aucun utilisateur ne correspond à vos critères de recherche"
                      : "Aucun utilisateur associé à ce distributeur"}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isUserActive = user.active !== false && user.statut !== "Inactif";
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        {user.prenom} {user.nom}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground font-semibold">
                        {user.username}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {getProfileDisplayName(user.profil) || user.profil || "Utilisateur"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isUserActive
                              ? "bg-accent/15 text-accent border-accent/30 text-xs"
                              : "bg-destructive/15 text-destructive border-destructive/30 text-xs"
                          }
                        >
                          {isUserActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditUser(user.id)}>
                              <Edit className="h-4 w-4 mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onResetPassword(user)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onValidatePassword(user)}>
                              <ShieldCheck className="h-4 w-4 mr-2" /> Valider mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleStatut(user.id)}>
                              {isUserActive ? (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-2" /> Désactiver
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-2" /> Activer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setUserToDelete(user)}
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

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer l'utilisateur « ${userToDelete?.username || userToDelete?.email || ""} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => {
          if (!userToDelete) return;
          const id = userToDelete.id;
          setUserToDelete(null);
          onDeleteUser(id);
        }}
      />
    </div>
  );
};
