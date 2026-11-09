import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Lock,
  Shield,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Users,
  Building2,
  Store,
  CreditCard,
  Landmark,
  Receipt,
  Percent,
  Package,
  Layers,
  CalendarClock,
  Box,
  Network,
  Handshake,
  UserPlus,
  Megaphone,
  Bell,
  History,
  GitFork,
  FileText,
  Server,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  HabilitationMatrixRowResponse,
  PermissionResponse,
  ProfileEditForm,
} from "../../models/types";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { ProfileFormField } from "../../viewmodels/useHabilitations";

interface ProfileEditCardProps {
  mode: "create" | "edit";
  editingRow: HabilitationMatrixRowResponse | null;
  form: ProfileEditForm;
  setForm: React.Dispatch<React.SetStateAction<ProfileEditForm>>;
  availablePermissions: PermissionResponse[];
  categoryLabels: Record<string, string>;
  isSaving: boolean;
  onTogglePermission: (permissionId: string) => void;
  onToggleAllPermissions: (permissionIds: string[], checked: boolean) => void;
  /** Modifier nom, code, description et statut. */
  canUpdateDetails?: boolean;
  /** Cocher / décocher les permissions du profil. */
  canAssign?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<ProfileFormField>;
  clearError?: (field: ProfileFormField) => void;
}

// Icon helper per module
const getModuleIcon = (category: string) => {
  const cat = category.toLowerCase();
  switch (cat) {
    case "user":
      return Users;
    case "structure":
      return Building2;
    case "agence":
      return Store;
    case "caisse":
      return CreditCard;
    case "banking":
      return Landmark;
    case "taxe":
      return Receipt;
    case "rule":
    case "cap":
      return Percent;
    case "package":
      return Package;
    case "service":
      return Layers;
    case "payment-method":
      return CreditCard;
    case "subscription":
      return CalendarClock;
    case "produit":
      return Box;
    case "autonome-set":
      return Network;
    case "partenaire":
      return Handshake;
    case "enrollment":
      return UserPlus;
    case "campaign":
      return Megaphone;
    case "notification":
      return Bell;
    case "tracking":
      return History;
    case "releve":
      return FileText;
    case "workflow":
      return GitFork;
    case "integration":
      return Server;
    case "structure-params":
      return SlidersHorizontal;
    case "form":
    case "field":
      return FileText;
    default:
      return Shield;
  }
};

export const ProfileEditCard: React.FC<ProfileEditCardProps> = ({
  mode,
  editingRow,
  form,
  setForm,
  availablePermissions,
  categoryLabels,
  isSaving,
  onTogglePermission: onTogglePermissionProp,
  onToggleAllPermissions: onToggleAllPermissionsProp,
  onCancel,
  onSubmit,
  canUpdateDetails = true,
  canAssign = true,
  errors = {},
  clearError,
}) => {
  const isCreate = mode === "create";
  // Sans droit d'attribution, les cases restent visibles mais ne modifient rien
  const onTogglePermission = (permissionId: string) => {
    if (canAssign) onTogglePermissionProp(permissionId);
  };
  const onToggleAllPermissions = (permissionIds: string[], checked: boolean) => {
    if (canAssign) onToggleAllPermissionsProp(permissionIds, checked);
  };

  const getCategoryLabel = (category: string): string => {
    return categoryLabels[category.toLowerCase()] || category;
  };

  // Group permissions by category/module directly from availablePermissions
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionResponse[]> = {};

    availablePermissions.forEach((p) => {
      const parts = p.code.split(".");
      let category = "divers";
      if (parts.length >= 3 && parts[0] === "perm") {
        category = parts[2];
      } else if (parts.length >= 2) {
        category = parts[1];
      }

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(p);
    });

    return groups;
  }, [availablePermissions]);

  const categories = useMemo(() => Object.keys(groupedPermissions), [groupedPermissions]);

  // Active module tab: "all" or a specific category
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Track collapsed status for each category section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (category: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleExpandAll = () => setCollapsedSections({});
  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    categories.forEach((cat) => {
      allCollapsed[cat] = true;
    });
    setCollapsedSections(allCollapsed);
  };

  // Filtered displayed categories
  const displayedCategories = useMemo(() => {
    if (selectedCategory === "all") {
      return categories;
    }
    return categories.filter((c) => c === selectedCategory);
  }, [categories, selectedCategory]);

  const totalPermissionsCount = availablePermissions.length;
  const selectedPermissionsCount = form.permissionIds.length;

  // Global toggle all
  const areAllSelected = totalPermissionsCount > 0 && selectedPermissionsCount === totalPermissionsCount;
  const handleToggleGlobalAll = () => {
    const allIds = availablePermissions.map((p) => p.id);
    onToggleAllPermissions(allIds, !areAllSelected);
  };

  const hasAnyCollapsed = displayedCategories.some((cat) => collapsedSections[cat]);

  return (
    <div className="space-y-6">
      {isSaving && (
        <LoadingOverlay
          title={isCreate ? "Création du profil" : "Modification du profil"}
          description="Veuillez patienter pendant l'enregistrement du profil..."
        />
      )}
      {/* Top Navigation & Action Header */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hover:bg-transparent hover:text-inherit shrink-0"
              onClick={onCancel}
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">
                  {isCreate ? "Nouveau profil" : "Modifier le profil"}
                </h2>
                {!isCreate && editingRow && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-accent/10 text-accent border-accent/25 max-w-[260px] truncate"
                  >
                    {editingRow.profile.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                  {form.permissionIds.length} permission{form.permissionIds.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCreate
                  ? "Créez un nouveau profil et sélectionnez ses permissions."
                  : "Modifiez les informations et les permissions de ce profil."}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={onCancel}
              className="text-xs h-9 px-4"
            >
              Annuler
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={onSubmit}
              className="text-xs h-9 px-5 gradient-accent text-accent-foreground shadow-sm font-semibold"
            >
              Enregistrer le profil
            </Button>
          </div>
        </div>
      </div>

      {(!canUpdateDetails || !canAssign) && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-700">
          <Lock className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>
            {!canUpdateDetails && !canAssign
              ? "Ce profil est en lecture seule pour vous."
              : !canAssign
                ? "Vous ne pouvez pas modifier les permissions de ce profil (profil qui vous est attribué ou droit d'attribution manquant)."
                : "Vous pouvez modifier les permissions de ce profil, mais pas ses informations."}
          </span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile Details & Category Navigator (4 cols) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
          {/* Card: Profile Metadata */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-3">
              <Shield className="h-4 w-4 text-accent" /> Informations du profil
            </h3>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Nom du profil <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    clearError?.("name");
                  }}
                  placeholder="Ex: Administrateur Financier"
                  disabled={!canUpdateDetails}
                  {...invalidFieldProps(errors.name, "text-xs h-9 bg-background/50")}
                />
                <FieldError message={errors.name} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Code technique <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.code}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, code: e.target.value }));
                    clearError?.("code");
                  }}
                  placeholder="Ex: profile.bo.finance-admin"
                  disabled={!canUpdateDetails}
                  {...invalidFieldProps(errors.code, "text-xs font-mono h-9 bg-background/50")}
                />
                <FieldError message={errors.code} />
                {!isCreate && editingRow && form.code.trim() !== editingRow.profile.code && (
                  <p className="text-[11px] text-amber-600 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                    Changer le code renomme le rôle dans Keycloak. Les utilisateurs concernés devront se reconnecter.
                  </p>
                )}
                {isCreate && (
                  <p className="text-[10px] text-muted-foreground">
                    Exemple : <code className="font-mono text-accent">profile.bo.superviseur</code>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Description</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Rôle, responsabilités et périmètre d'action du profil..."
                  rows={3}
                  disabled={!canUpdateDetails}
                  className="w-full text-xs p-2.5 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg border border-border/60 bg-background/50 focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-foreground">Profil actif</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Permet d'affecter ce profil aux utilisateurs
                  </p>
                </div>
                <Switch
                  disabled={!canUpdateDetails}
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Card: Category Quick Navigation */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-accent" /> Modules
              </h3>
              <div
                className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none"
                onClick={handleToggleGlobalAll}
              >
                <Checkbox
                  disabled={!canAssign}
                  checked={areAllSelected}
                  onCheckedChange={handleToggleGlobalAll}
                  className="h-3.5 w-3.5 rounded-[4px]"
                />
                <span className="text-[11px] font-medium">{areAllSelected ? "Tout décocher" : "Tout cocher"}</span>
              </div>
            </div>

            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
              {/* All Modules Option */}
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${selectedCategory === "all"
                    ? "bg-accent/10 text-accent font-semibold border border-accent/30 shadow-xs"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Tous les modules</span>
                </div>
              </button>

              {/* Module-by-module list */}
              {categories.map((category) => {
                const perms = groupedPermissions[category] || [];
                const ModuleIcon = getModuleIcon(category);
                const selectedInGroup = perms.filter((p) => form.permissionIds.includes(p.id)).length;
                const isAllGroupSelected = perms.length > 0 && selectedInGroup === perms.length;
                const isSelected = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${isSelected
                        ? "bg-accent/10 text-accent font-semibold border border-accent/30 shadow-xs"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ModuleIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate capitalize">{getCategoryLabel(category)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAllGroupSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      <Badge
                        variant={selectedInGroup > 0 ? "default" : "outline"}
                        className={`text-[10px] font-mono px-1.5 py-0 ${selectedInGroup > 0
                            ? "bg-accent/20 text-accent border-accent/30"
                            : "text-muted-foreground/70"
                          }`}
                      >
                        {selectedInGroup}/{perms.length}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Permissions Allocation Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Header Controls for Right Column: Expand / Collapse All */}
          {displayedCategories.length > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">
                Affichage des modules
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={hasAnyCollapsed ? handleExpandAll : handleCollapseAll}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5 text-accent" />
                  <span>{hasAnyCollapsed ? "Tout déplier" : "Tout replier"}</span>
                </Button>
              </div>
            </div>
          )}

          {displayedCategories.map((category) => {
            const perms = groupedPermissions[category] || [];
            const ModuleIcon = getModuleIcon(category);
            const permIds = perms.map((p) => p.id);
            const allChecked = perms.length > 0 && permIds.every((id) => form.permissionIds.includes(id));
            const checkedCount = permIds.filter((id) => form.permissionIds.includes(id)).length;

            const isCollapsed = Boolean(collapsedSections[category]);

            return (
              <div
                key={category}
                className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                {/* Category Header */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/20 border-b border-border/40 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                  onClick={() => toggleSection(category)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted/50 text-muted-foreground transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(category);
                      }}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <div className="h-9 w-9 rounded-xl gradient-accent flex items-center justify-center text-accent-foreground shadow-xs shrink-0">
                      <ModuleIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground capitalize">
                          {getCategoryLabel(category)}
                        </h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {isCollapsed
                          ? "Cliquer pour dérouler les permissions de ce module."
                          : `Permissions d'accès aux fonctionnalités du module ${getCategoryLabel(category)}.`}
                      </p>
                    </div>
                  </div>

                  {/* Group checkbox toggle */}
                  <div
                    className="flex items-center gap-2 cursor-pointer select-none py-1.5 px-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors bg-background/50 shrink-0 self-end sm:self-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAllPermissions(permIds, !allChecked);
                    }}
                  >
                    <Checkbox
                      disabled={!canAssign}
                      checked={allChecked}
                      onCheckedChange={() => onToggleAllPermissions(permIds, !allChecked)}
                      className="h-4 w-4 rounded-[4px] border-border"
                    />
                    <span className="text-xs font-medium text-foreground">
                      {allChecked ? "Tout désélectionner" : "Tout cocher"}
                    </span>
                  </div>
                </div>

                {/* Permissions Tiles Grid (3 per row on desktop) */}
                {!isCollapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-card animate-in fade-in-50 duration-200">
                    {perms.map((p) => {
                      const isChecked = form.permissionIds.includes(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => onTogglePermission(p.id)}
                          className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all select-none ${canAssign ? "cursor-pointer" : "cursor-default"} ${
                            isChecked
                              ? "bg-accent/5 border-accent shadow-xs ring-1 ring-accent/30"
                              : "bg-background/60 border-border/50 hover:border-border hover:bg-muted/20"
                          }`}
                        >
                          {/* Genuine Shadcn Checkbox */}
                          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              disabled={!canAssign}
                              id={`perm-${p.id}`}
                              checked={isChecked}
                              onCheckedChange={() => onTogglePermission(p.id)}
                              className="h-4 w-4 rounded-[4px] border-border"
                            />
                          </div>

                          {/* Text and code */}
                          <div className="space-y-1 min-w-0 flex-1">
                            <label
                              htmlFor={`perm-${p.id}`}
                              className={`text-xs font-semibold block transition-colors leading-tight cursor-pointer ${
                                isChecked ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
                              }`}
                            >
                              {p.name || p.code}
                            </label>

                            {p.code && p.code !== p.name && (
                              <code
                                title={p.code}
                                className={`text-[10px] font-mono leading-snug px-1.5 py-0.5 rounded inline-block max-w-full break-words transition-colors ${
                                  isChecked
                                    ? "bg-accent/15 text-accent font-medium border border-accent/20"
                                    : "bg-muted/60 text-muted-foreground border border-border/40"
                                }`}
                              >
                                {p.code.split(".").map((segment, i, segments) => (
                                  <React.Fragment key={i}>
                                    {segment}
                                    {i < segments.length - 1 && (
                                      <>
                                        .<wbr />
                                      </>
                                    )}
                                  </React.Fragment>
                                ))}
                              </code>
                            )}

                            {p.description && (
                              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProfileEditCard;
