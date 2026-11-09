import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { HierarchyMemberUser } from "@/core/security/accessSecurityService";
import { CaisseRead } from "@/features/caisses/models/types";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";
import {
  Building2,
  Edit,
  Eye,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
} from "lucide-react";
import { AgenceRead, AgencyParentType } from "../../models/types";

interface AgenceDetailSectionsProps {
  agence: AgenceRead;
  caisses: CaisseRead[];
  caissesLoading?: boolean;
  caisseSearch?: string;
  onCaisseSearchChange?: (value: string) => void;
  caisseStatus?: string;
  onCaisseStatusChange?: (value: string) => void;
  utilisateurs?: HierarchyMemberUser[];
  usersLoading?: boolean;
  userUsername?: string;
  onUserUsernameChange?: (value: string) => void;
  userEmail?: string;
  onUserEmailChange?: (value: string) => void;
  userProfile?: string;
  onUserProfileChange?: (value: string) => void;
  userStatus?: string;
  onUserStatusChange?: (value: string) => void;
  availableProfiles?: string[];
  resolveStructureLabel: (structureId?: string) => string;
  resolveParentLabel?: (parentId?: string, parentType?: AgencyParentType | string) => string;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  statutBadge: (isActive: boolean) => string;
  onOpenCaisseDialog: () => void;
  onOpenDetailCaisse?: (caisse: CaisseRead) => void;
  onOpenEditCaisseDialog: (caisse: CaisseRead) => void;
  onRequestToggleCaisseStatut: (caisse: CaisseRead) => void;
  onOpenDeleteCaisse: (caisse: CaisseRead) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const AgenceDetailSections: React.FC<AgenceDetailSectionsProps> = ({
  agence,
  caisses,
  caissesLoading = false,
  caisseSearch = "",
  onCaisseSearchChange,
  caisseStatus = "all",
  onCaisseStatusChange,
  utilisateurs = [],
  usersLoading = false,
  userUsername = "",
  onUserUsernameChange,
  userEmail = "",
  onUserEmailChange,
  userProfile = "",
  onUserProfileChange,
  userStatus = "all",
  onUserStatusChange,
  availableProfiles = [],
  resolveStructureLabel,
  resolveParentLabel,
  permissions,
  statutBadge,
  onOpenCaisseDialog,
  onOpenDetailCaisse,
  onOpenEditCaisseDialog,
  onRequestToggleCaisseStatut,
  onOpenDeleteCaisse,
}) => {
  const parentName =
    (resolveParentLabel
      ? resolveParentLabel(agence.parent_id, agence.parent_type)
      : resolveStructureLabel(agence.parent_id)) || "—";
  const parentTypeLabel = agence.parent_type === "DISTRIBUTOR" ? "Distributeur" : "Structure";

  return (
    <>
      {/* Onglet Détails */}
      <TabsContent value="details" className="space-y-6">
        {/* Section 1 : Informations Générales */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Informations Générales</h3>
              <p className="text-xs text-muted-foreground">Caractéristiques principales et identifiants de l'agence</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Nom de l'agence</span>
              <p className="text-sm font-semibold text-foreground">{agence.name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Code agence</span>
              <p className="text-sm font-semibold text-foreground font-mono">{agence.code || "—"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Rattachement</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{parentName}</span>
                <Badge
                  variant={agence.parent_type === "DISTRIBUTOR" ? "outline" : "secondary"}
                  className="text-[10px] font-normal"
                >
                  {parentTypeLabel}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Statut</span>
              <div>
                <Badge
                  className={
                    agence.is_active
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "bg-destructive/15 text-destructive border-destructive/30"
                  }
                  variant="outline"
                >
                  {agence.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Date d'activation</span>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(agence.activated_at)}
              </p>
            </div>

            {agence.deactivated_at && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium block">Date de désactivation</span>
                <p className="text-sm font-semibold text-destructive">
                  {formatDate(agence.deactivated_at)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2 : Coordonnées & Localisation */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Coordonnées & Localisation</h3>
              <p className="text-xs text-muted-foreground">Adresses, zone géographique et contacts de l'agence</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground font-medium block">Adresse</span>
              <p className="text-sm font-semibold text-foreground">{agence.address || "—"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Ville</span>
              <p className="text-sm font-semibold text-foreground">{agence.city || "—"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Région / Pays</span>
              <p className="text-sm font-semibold text-foreground">
                {[agence.region, agence.country || "Sénégal"].filter(Boolean).join(", ") || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Téléphone</span>
              <div className="flex items-center gap-2">
                {agence.contact_phone ? (
                  <a
                    href={`tel:${agence.contact_phone}`}
                    className="text-sm font-semibold text-foreground hover:text-accent flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{agence.contact_phone}</span>
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">—</span>
                )}
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground font-medium block">Email</span>
              <div className="flex items-center gap-2">
                {agence.contact_email ? (
                  <a
                    href={`mailto:${agence.contact_email}`}
                    className="text-sm font-semibold text-foreground hover:text-accent flex items-center gap-1.5 transition-colors break-words"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{agence.contact_email}</span>
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Onglet Caisses */}
      <TabsContent value="caisses" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Caisses de l'agence</h2>
            <p className="text-xs text-muted-foreground">
              {caisses.length} caisse(s) rattachée(s) à cette agence
            </p>
          </div>
          {permissions.canCreate && (
            <Button
              onClick={onOpenCaisseDialog}
              className="gradient-accent text-accent-foreground hover:opacity-90 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4 mr-2" /> Nouvelle caisse
            </Button>
          )}
        </div>

        {/* Barre de recherche et filtrage des caisses */}
        <div className="glass-card rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou code..."
                value={caisseSearch}
                onChange={(e) => onCaisseSearchChange?.(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <Select value={caisseStatus} onValueChange={onCaisseStatusChange}>
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

        {/* Tableau des Caisses */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caissesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      <span>Chargement des caisses...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : caisses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    {caisseSearch || caisseStatus !== "all"
                      ? "Aucune caisse ne correspond à vos critères de recherche"
                      : "Aucune caisse associée à cette agence"}
                  </TableCell>
                </TableRow>
              ) : (
                caisses.map((c) => (
                  <TableRow
                    key={c.id}
                    className={`hover:bg-muted/40 transition-colors ${onOpenDetailCaisse ? "cursor-pointer" : ""}`}
                    onClick={() => onOpenDetailCaisse?.(c)}
                  >
                    <TableCell className="font-mono text-xs font-semibold">{c.code || "—"}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge className={statutBadge(c.is_active)} variant="outline">
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onOpenDetailCaisse && (
                            <DropdownMenuItem onClick={() => onOpenDetailCaisse(c)}>
                              <Eye className="h-4 w-4 mr-2" /> Voir les détails
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onOpenEditCaisseDialog(c)}
                            disabled={!permissions.canUpdate}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRequestToggleCaisseStatut(c)}
                            disabled={!permissions.canUpdate}
                          >
                            {c.is_active ? (
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
                            onClick={() => onOpenDeleteCaisse(c)}
                            disabled={!permissions.canDelete}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* Onglet Utilisateurs */}
      <TabsContent value="utilisateurs" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Utilisateurs de l'agence</h2>
            <p className="text-xs text-muted-foreground">
              {utilisateurs.length} utilisateur(s) rattaché(s) à cette agence
            </p>
          </div>
        </div>

        {/* Filtres Utilisateurs : username, email, profil, statut */}
        <div className="glass-card rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom d'utilisateur..."
                value={userUsername}
                onChange={(e) => onUserUsernameChange?.(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Email..."
                type="email"
                value={userEmail}
                onChange={(e) => onUserEmailChange?.(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <Select
              value={userProfile || "all"}
              onValueChange={(val) => onUserProfileChange?.(val === "all" ? "" : val)}
            >
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
            <Select value={userStatus} onValueChange={onUserStatusChange}>
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

        {/* Tableau Utilisateurs */}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      <span>Chargement des utilisateurs...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : utilisateurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {userUsername || userEmail || (userProfile && userProfile !== "all") || userStatus !== "all"
                      ? "Aucun utilisateur ne correspond à vos critères de recherche"
                      : "Aucun utilisateur associé à cette agence"}
                  </TableCell>
                </TableRow>
              ) : (
                utilisateurs.map((u) => {
                  const displayName =
                    u.first_name || u.last_name
                      ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                      : (() => {
                          const parts = (u.username || "").split(/[\s._-]+/).filter(Boolean);
                          if (parts.length === 0) return u.username || "—";
                          const [first, ...rest] = parts;
                          return `${first.charAt(0).toUpperCase() + first.slice(1)} ${rest.join(" ").toUpperCase()}`.trim();
                        })();

                  const isUserActive = u.active !== false;

                  return (
                    <TableRow key={u.user_id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">{displayName}</TableCell>
                      <TableCell className="font-mono text-xs">{u.username || "—"}</TableCell>
                      <TableCell className="break-words">{u.email || "—"}</TableCell>
                      <TableCell>{u.telephone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/30 text-xs font-normal">
                          {u.profiles && u.profiles.length > 0
                            ? getProfileDisplayName(u.profiles[0])
                            : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            isUserActive
                              ? "bg-accent/15 text-accent border-accent/30"
                              : "bg-destructive/15 text-destructive border-destructive/30"
                          }
                          variant="outline"
                        >
                          {isUserActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </>
  );
};
