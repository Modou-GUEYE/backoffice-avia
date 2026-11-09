import { motion } from "framer-motion";
import React from "react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import {
  Edit,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  Shield,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useNavigate } from "react-router-dom";
import { getProfileDisplayName } from "../models/profileLabels";
import { useUtilisateurs } from "../viewmodels/useUtilisateurs";
import { getCurrentDistributorId, useAuthStore } from "@/core/security/authStore";
import { UtilisateurFormDialog, UtilisateurImportDialog } from "./components";

const UtilisateursPage = () => {
  const vm = useUtilisateurs();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentDistributorId = getCurrentDistributorId();
  const isDistributor =
    user?.entityContext === "Distributeur" ||
    (Boolean(currentDistributorId) && user?.entityContext !== "Administration" && user?.entityContext !== "Structure");

  React.useEffect(() => {
    if (isDistributor && currentDistributorId) {
      navigate(`/dashboard/distributeurs/${currentDistributorId}?tab=utilisateurs`, { replace: true });
    }
  }, [isDistributor, currentDistributorId, navigate]);

  const currentUserEmail = useAuthStore((state) => state.user?.email?.trim().toLowerCase());
  const [showImportDialog, setShowImportDialog] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<{ id: string; label: string } | null>(null);
  const hasActions = vm.permissions.canUpdate || vm.permissions.canDelete;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Utilisateurs</h1>
            <p className="text-muted-foreground text-sm">{vm.utilisateurs.length} utilisateurs enregistrés</p>
          </div>
        </div>
        {vm.permissions.canCreate && (
          <div className="flex gap-2">
            <Button
              onClick={vm.openAdd}
              className="gradient-accent text-accent-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="border-border"
            >
              <Upload className="h-4 w-4 mr-2" /> Importer fichier
            </Button>
          </div>
        )}
      </motion.div>

      {/* ===== FILTRES CONTRAT API ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Filtrer par login"
            value={vm.filterLogin}
            onChange={(event) => vm.setFilterLogin(event.target.value)}
          />
          <Input
            type="email"
            placeholder="Filtrer par email"
            value={vm.filterEmail}
            onChange={(event) => vm.setFilterEmail(event.target.value)}
          />
          <Select value={vm.filterRole || "__all__"} onValueChange={(value) => vm.setFilterRole(value === "__all__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par profil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les profils</SelectItem>
              {vm.availableRoles.map((role) => (
                <SelectItem key={role} value={role}>{getProfileDisplayName(role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vm.filterStatut || "__all__"} onValueChange={(value) => vm.setFilterStatut(value === "__all__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              <SelectItem value="Actif">Actif</SelectItem>
              <SelectItem value="Inactif">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>


      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="overflow-y-auto max-h-[75vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="border-border/50">
              <TableHead>Nom complet</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Statut</TableHead>
              {hasActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.isLoading && (
              <TableRow>
                <TableCell colSpan={hasActions ? 6 : 5} className="text-center py-10">
                  <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!vm.isLoading && !vm.permissions.canRead && (
              <TableRow>
                <TableCell colSpan={hasActions ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Vous n'avez pas l'habilitation pour consulter les utilisateurs
                </TableCell>
              </TableRow>
            )}

            {!vm.isLoading && vm.permissions.canRead && vm.utilisateurs.map((user) => (
              <TableRow key={user.id} className="border-border/30 hover:bg-muted/30">
                <TableCell className="text-sm font-medium">
                  {[user.prenom, user.nom].filter(Boolean).join(' ') || <span className="text-muted-foreground italic">—</span>}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {user.username}
                </TableCell>
                <TableCell>
                  <p className="text-sm">{user.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{getProfileDisplayName(user.role)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.statut === "Actif" ? "default" : "outline"} className="text-xs">
                    {user.statut}
                  </Badge>
                </TableCell>
                {hasActions && <TableCell className="text-right">
                  {(vm.permissions.canUpdate || vm.permissions.canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {vm.permissions.canUpdate && (
                          <>
                            <DropdownMenuItem onClick={() => vm.openEdit(user)}>
                              <Edit className="h-4 w-4 mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => vm.resetPassword(user)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => vm.validatePassword(user)}>
                              <ShieldCheck className="h-4 w-4 mr-2" /> Valider mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => vm.toggleStatut(user.id)}
                              disabled={
                                user.statut === "Actif" &&
                                currentUserEmail &&
                                (user.email?.trim().toLowerCase() === currentUserEmail ||
                                 user.username?.trim().toLowerCase() === currentUserEmail)
                              }
                            >
                              {user.statut === "Actif" ? (
                                <><ToggleLeft className="h-4 w-4 mr-2" /> Désactiver</>
                              ) : (
                                <><ToggleRight className="h-4 w-4 mr-2" /> Activer</>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                        {vm.permissions.canDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setUserToDelete({ id: user.id, label: user.username || user.email || [user.prenom, user.nom].filter(Boolean).join(" ") })}
                            disabled={
                              currentUserEmail &&
                              (user.email?.trim().toLowerCase() === currentUserEmail ||
                               user.username?.trim().toLowerCase() === currentUserEmail)
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>}
              </TableRow>
            ))}
            {!vm.isLoading && vm.permissions.canRead && vm.utilisateurs.length === 0 && (
              <TableRow>
                <TableCell colSpan={hasActions ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </motion.div>

      {/* ===== FORMULAIRE AJOUT / MODIFICATION ===== */}
      <UtilisateurFormDialog
        open={vm.dialogOpen}
        onOpenChange={vm.setDialogOpen}
        vm={vm}
      />

      {/* ===== FORMULAIRE IMPORT CSV / EXCEL ===== */}
      <UtilisateurImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportFile={(file) => {
          vm.importUsersFromFile(file);
        }}
      />

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer l'utilisateur « ${userToDelete?.label ?? ""} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => {
          if (!userToDelete) return;
          const id = userToDelete.id;
          setUserToDelete(null);
          void vm.remove(id);
        }}
      />
    </div>
  );
};

export default UtilisateursPage;