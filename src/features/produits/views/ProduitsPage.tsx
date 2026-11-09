import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import FormDialog from "@/shared/components/FormDialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";
import BrandingForm from "@/shared/components/BrandingForm";
import { useProduits } from "../viewmodels/useProduits";
import { FieldError, hasFieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { useNavigate } from "react-router-dom";
import { ProduitsSummaryCards } from "./components/ProduitsSummaryCards";
import { ProduitCommissionsSection } from "./components/ProduitCommissionsSection";
import { useCommissions } from "@/features/tarification/viewmodels/useCommissions";

const ProduitsPage = () => {
  // Les répartitions saisies avant la création du produit sont enregistrées une fois son identifiant connu
  const flushCommissionsRef = useRef<(productId: string) => Promise<void>>();
  const vm = useProduits({
    onProductCreated: (productId) => flushCommissionsRef.current?.(productId) ?? Promise.resolve(),
  });
  const commissionsVm = useCommissions({
    enabled: vm.dialogOpen,
    scope: {
      tenantLevel: "PRODUCT",
      tenantId: vm.editingProduit?.id ?? null,
      tenantLabel: vm.form.nom?.trim() || vm.editingProduit?.nom,
    },
  });
  flushCommissionsRef.current = async (productId) => {
    const failures = await commissionsVm.flushPendingCommissions(productId);
    if (failures.length > 0) {
      toast.warning(
        `${failures.length} répartition(s) de commission n'ont pas pu être créées. Ajoutez-les depuis l'onglet Commission du produit.`,
      );
    }
  };
  const navigate = useNavigate();
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [structureSelectOpen, setStructureSelectOpen] = useState(false);
  const [structureSearch, setStructureSearch] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const filteredStructureOptions = vm.structureOptions.filter((s) =>
    s.nom.toLowerCase().includes(structureSearch.trim().toLowerCase())
  );

  const generatedLogin = vm.deriveLogin(
    vm.userDraft.prenom,
    vm.userDraft.nom,
    vm.form.utilisateurs.map((u) => u.username)
  );

  useEffect(() => {
    if (!vm.dialogOpen) {
      setShowUserForm(false);
      setActiveTab("general");
      setStructureSelectOpen(false);
      setStructureSearch("");
    }
  }, [vm.dialogOpen]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const hasActions = vm.permissions.canUpdate || vm.permissions.canDelete;

  let tableRows;

  if (vm.loading) {
    tableRows = (
      <TableRow>
        <TableCell colSpan={hasActions ? 5 : 4} className="text-center py-12 text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des produits…
          </div>
        </TableCell>
      </TableRow>
    );
  } else if (vm.error) {
    tableRows = (
      <TableRow>
        <TableCell colSpan={hasActions ? 5 : 4} className="text-center py-12">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            {vm.error}
          </div>
        </TableCell>
      </TableRow>
    );
  } else if (vm.filtered.length === 0) {
    tableRows = (
      <TableRow>
        <TableCell colSpan={hasActions ? 5 : 4} className="text-center py-12 text-muted-foreground">Aucun produit trouvé</TableCell>
      </TableRow>
    );
  } else {
    tableRows = vm.filtered.map((p) => (
      <TableRow key={p.id} className="group cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => navigate(`/dashboard/produits/${p.id}`)}>
        <TableCell className="font-medium text-accent hover:underline">
          <div className="flex items-center gap-2">
            {(p.media_url || p.mediaUrl || p.logo) && (
              <div className="h-6 w-6 rounded-md border bg-background/50 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={p.media_url || p.mediaUrl || p.logo}
                  alt={p.nom}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <span>{p.nom}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{p.libelleExpediteur}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{formatDateTime(p.dateCreation)}</TableCell>
        <TableCell>
          <Badge className={p.statut === "active" ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20" : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"} variant="outline">
            {p.statut === "active" ? "Actif" : "Inactif"}
          </Badge>
        </TableCell>
        {hasActions && <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          {(vm.permissions.canUpdate || vm.permissions.canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions pour le produit ${p.nom}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/dashboard/produits/${p.id}`)}>
                  <Eye className="h-4 w-4 mr-2" /> Voir détails
                </DropdownMenuItem>
                {vm.permissions.canUpdate && (
                  <>
                    <DropdownMenuItem onClick={() => vm.openEdit(p)}><Edit className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => vm.confirmToggle(p)}>
                      {p.statut === "active"
                        ? <><ToggleLeft className="h-4 w-4 mr-2" /> Désactiver</>
                        : <><ToggleRight className="h-4 w-4 mr-2" /> Activer</>}
                    </DropdownMenuItem>
                  </>
                )}
                {vm.permissions.canDelete && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => vm.confirmDelete(p)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>}
      </TableRow>
    ));
  }
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center"><Package className="h-5 w-5 text-accent-foreground" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Produits</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vm.permissions.canCreate && (
            <Button onClick={vm.openAdd} className="gradient-accent text-accent-foreground hover:opacity-90" aria-label="Ajouter un nouveau produit"><Plus className="h-4 w-4 mr-2" /> Nouveau produit</Button>
          )}
        </div>
      </motion.div>

      {/* KPI Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <ProduitsSummaryCards produits={vm.produits} summary={vm.summary} />
      </motion.div>

      {/* Search & Status Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom..."
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select value={vm.filterStatut} onValueChange={vm.setFilterStatut}>
            <SelectTrigger aria-label="Filtrer les produits par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-y-auto max-h-[75vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Libellé du produit</TableHead>
              <TableHead className="font-semibold">Libellé expéditeur (SMS)</TableHead>
              <TableHead className="font-semibold">Date de création</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              {hasActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>{tableRows}</TableBody>
        </Table>
        </div>
      </motion.div>

      {/* Add/Edit Dialog with 3 tabs */}
      <FormDialog
        open={vm.dialogOpen}
        onOpenChange={(open) => {
          if (!open) setActiveTab("general");
          vm.setDialogOpen(open);
        }}
        title={vm.editingProduit ? "Modifier le produit" : "Nouveau produit"}
        description={vm.editingProduit ? "Modifiez les informations du produit." : "Configurez le nouveau produit."}
        submitLabel={vm.editingProduit ? "Modifier" : "Ajouter produit"}
        onSubmit={() => {
          const errors = vm.handleSave();
          // Affiche l'onglet contenant le premier champ en erreur
          if (hasFieldErrors(errors)) {
            setActiveTab("general");
          }
        }}
        loading={vm.actionLoading}
        contentClassName="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
        hideFooter={activeTab === "utilisateur"}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 min-w-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="branding">Couleurs</TabsTrigger>
            <TabsTrigger value="utilisateur">Utilisateur</TabsTrigger>
            <TabsTrigger value="commission">Commission</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Libellé du produit *</Label>
                <Input
                  placeholder="Ex: DEMOPAY"
                  value={vm.form.nom}
                  {...invalidFieldProps(vm.formErrors.nom)}
                  onChange={(e) => {
                    vm.setForm({ ...vm.form, nom: e.target.value });
                    vm.clearFormError("nom");
                  }}
                />
                <FieldError message={vm.formErrors.nom} />
              </div>
              <div className="space-y-2">
                <Label>Libellé expéditeur (SMS) *</Label>
                <Input
                  placeholder="Ex: DEMOPAY"
                  maxLength={10}
                  value={vm.form.libelleExpediteur}
                  {...invalidFieldProps(vm.formErrors.libelleExpediteur)}
                  onChange={(e) => {
                    vm.setForm({ ...vm.form, libelleExpediteur: e.target.value });
                    vm.clearFormError("libelleExpediteur");
                  }}
                />
                <FieldError message={vm.formErrors.libelleExpediteur} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Logo du produit</Label>
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
                    {vm.form.logo ? (
                      <img
                        src={vm.form.logo}
                        alt="Aperçu logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {vm.form.logoFile ? vm.form.logoFile.name : vm.form.logo ? "Logo configuré" : "Aucun logo sélectionné"}
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
                    aria-label="Sélectionner un logo pour le produit"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5"
                    onClick={() => logoFileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {vm.form.logo ? "Changer" : "Choisir"}
                  </Button>
                  {vm.form.logo && (
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
                      aria-label="Retirer le logo du produit"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Structures appartenant au produit</Label>
                {vm.form.structuresAssociees.length > 0 && (
                  <button
                    type="button"
                    onClick={() => vm.setForm((prev) => ({ ...prev, structuresAssociees: [] }))}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    Effacer la sélection
                  </button>
                )}
              </div>

              {/* Champ déroulant avec icône indiquant qu'il est déroulant */}
              <button
                type="button"
                onClick={() => setStructureSelectOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs bg-background/50 transition-all cursor-pointer ${
                  structureSelectOpen
                    ? "border-accent ring-1 ring-accent/30"
                    : "border-input hover:bg-muted/30"
                }`}
                aria-expanded={structureSelectOpen}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Sélectionner des structures...</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      structureSelectOpen ? "rotate-180 text-accent" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Badges des structures sélectionnées */}
              {vm.form.structuresAssociees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-0.5 pr-1">
                  {vm.form.structuresAssociees.map((id) => {
                    const structure = vm.structureOptions.find((s) => s.id === id);
                    const label = structure?.nom || id;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="gap-1 pl-2 pr-1 py-0.5 text-[11px] font-normal border border-border/70 bg-muted/40 hover:bg-muted/70 transition-colors"
                      >
                        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="max-w-[160px] truncate">{label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            vm.toggleStructure(id);
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
              {structureSelectOpen && (
                <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-2 space-y-2 animate-in fade-in-50 slide-in-from-top-1 duration-150 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Rechercher une structure..."
                        value={structureSearch}
                        onChange={(e) => setStructureSearch(e.target.value)}
                        className="h-8 text-xs pl-2"
                      />
                    </div>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {filteredStructureOptions.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Aucune structure trouvée.
                      </p>
                    ) : (
                      filteredStructureOptions.map((s) => {
                        const isSelected = vm.form.structuresAssociees.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => vm.toggleStructure(s.id)}
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
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate font-medium">{s.nom}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 2 - Charte Graphique */}
          <TabsContent value="branding" className="space-y-4 py-2">
            <BrandingForm
              branding={{
                entityName: vm.form.nom,
                logoUrl: vm.form.logo,
                faviconUrl: vm.form.faviconUrl,
                apsfdLogoUrl: vm.form.apsfdLogoUrl,
                primaryColor: vm.form.primaryColor,
                secondaryColor: vm.form.secondaryColor,
                accentColor: vm.form.accentColor,
                sidebarColor: vm.form.sidebarColor,
                borderColor: vm.form.borderColor,
                loginBgUrl: vm.form.loginBgUrl,
              }}
              onChange={(updated) => {
                vm.setForm({
                  ...vm.form,
                  logo: updated.logoUrl !== undefined ? updated.logoUrl : vm.form.logo,
                  faviconUrl: updated.faviconUrl || "",
                  apsfdLogoUrl: updated.apsfdLogoUrl || "",
                  primaryColor: updated.primaryColor || "",
                  secondaryColor: updated.secondaryColor || "",
                  accentColor: updated.accentColor || "",
                  sidebarColor: updated.sidebarColor || "",
                  borderColor: updated.borderColor || "",
                  loginBgUrl: updated.loginBgUrl || "",
                });
              }}
              onLogoFileChange={vm.onLogoFileSelected}
              entityId={vm.editingProduit?.id}
            />
          </TabsContent>

          <TabsContent value="utilisateur" className="space-y-4 py-2">
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
              <p className="text-xs text-muted-foreground font-medium">Utilisateur du produit</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prénom <span className="text-destructive">*</span></Label>
                  <Input
                    {...invalidFieldProps(vm.userDraftErrors.prenom, "text-xs")}
                    value={vm.userDraft.prenom}
                    onChange={(e) => {
                      const prenom = e.target.value;
                      const login = vm.deriveLogin(prenom, vm.userDraft.nom, vm.form.utilisateurs.map((u) => u.username));
                      vm.setUserDraft({ ...vm.userDraft, prenom, username: login });
                      vm.clearUserDraftError("prenom");
                      vm.clearUserDraftError("username");
                    }}
                    placeholder="Prénom"
                  />
                  <FieldError message={vm.userDraftErrors.prenom} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
                  <Input
                    {...invalidFieldProps(vm.userDraftErrors.nom, "text-xs")}
                    value={vm.userDraft.nom}
                    onChange={(e) => {
                      const nom = e.target.value;
                      const login = vm.deriveLogin(vm.userDraft.prenom, nom, vm.form.utilisateurs.map((u) => u.username));
                      vm.setUserDraft({ ...vm.userDraft, nom, username: login });
                      vm.clearUserDraftError("nom");
                      vm.clearUserDraftError("username");
                    }}
                    placeholder="Nom"
                  />
                  <FieldError message={vm.userDraftErrors.nom} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Login <span className="text-destructive">*</span></Label>
                  <Input
                    {...invalidFieldProps(
                      vm.userDraftErrors.username,
                      `text-xs ${vm.selectedUserId ? "bg-muted cursor-not-allowed opacity-80" : ""}`,
                    )}
                    value={vm.userDraft.username}
                    placeholder="Généré automatiquement"
                    disabled
                    readOnly
                  />
                  <FieldError message={vm.userDraftErrors.username} />
                  {vm.selectedUserId && (
                    <p className="text-[11px] text-muted-foreground">L'identifiant de connexion ne peut pas être modifié.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail <span className="text-destructive">*</span></Label>
                  <Input
                    {...invalidFieldProps(vm.userDraftErrors.email, "text-xs")}
                    type="email"
                    value={vm.userDraft.email}
                    onChange={(e) => {
                      vm.setUserDraft({ ...vm.userDraft, email: e.target.value });
                      vm.clearUserDraftError("email");
                    }}
                    placeholder="utilisateur@domaine.com"
                  />
                  <FieldError message={vm.userDraftErrors.email} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Profil / Rôle <span className="text-destructive">*</span></Label>
                  <Select
                    value={vm.userDraft.role}
                    onValueChange={(v) => {
                      vm.setUserDraft({ ...vm.userDraft, role: v });
                      vm.clearUserDraftError("role");
                    }}
                  >
                    <SelectTrigger {...invalidFieldProps(vm.userDraftErrors.role, "text-xs")}>
                      <SelectValue placeholder="Sélectionner le profil" />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.availableUserRoles.map((p) => (
                        <SelectItem key={p} value={p}>{getProfileDisplayName(p)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={vm.userDraftErrors.role} />
                </div>
              </div>

              {vm.form.utilisateurs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Utilisateurs rattachés au produit ({vm.form.utilisateurs.length})
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {vm.form.utilisateurs.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        className={`w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs bg-muted/20 transition-colors ${
                          vm.selectedUserId === user.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                        }`}
                        onClick={() => vm.editUserInForm(user.id)}
                      >
                        <div>
                          <div className="font-medium text-foreground">
                            {user.nom} {user.prenom}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            Login: <span className="font-semibold text-foreground">{user.username}</span> • Email: {user.email || "-"}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {getProfileDisplayName(user.profil || "")}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-2">
                {vm.selectedUserId ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={vm.cancelEditUser}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={vm.updateProduitUser}
                      disabled={vm.isUpdatingUser}
                      className="gradient-accent text-accent-foreground"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      {vm.isUpdatingUser ? "Modification..." : "Modifier l'utilisateur"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={vm.addUserToForm}
                    className="gradient-accent text-accent-foreground"
                  >
                    Ajouter l'utilisateur
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="commission" className="space-y-4 min-w-0">
            <ProduitCommissionsSection vm={commissionsVm} />
          </TabsContent>
        </Tabs>
      </FormDialog>

      {/* Toggle Confirmation */}
      <ConfirmDialog
        open={vm.updateDialogOpen}
        onOpenChange={vm.setUpdateDialogOpen}
        title="Confirmer la modification"
        description="Êtes-vous sûr de vouloir modifier ce produit ?"
        confirmLabel="Oui"
        cancelLabel="Non"
        onConfirm={vm.confirmUpdateSave}
      />

      {/* Toggle Confirmation */}
      <ConfirmDialog
        open={vm.toggleDialogOpen}
        onOpenChange={vm.setToggleDialogOpen}
        title="Confirmer le changement"
        description={`Êtes-vous sûr de vouloir ${vm.togglingProduit?.statut === "active" ? "désactiver" : "activer"} ce produit ?`}
        confirmLabel="Oui"
        cancelLabel="Non"
        onConfirm={vm.handleToggle}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer ce produit ?"
        confirmLabel="Oui, supprimer"
        cancelLabel="Non"
        onConfirm={vm.handleDelete}
        confirmVariant="destructive"
      />
    </div>
  );
};

export default ProduitsPage;
