import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Filter, Loader2, MoreHorizontal, Plus, RotateCcw, Search, TrendingDown, UserCheck, UserMinus, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { EnrollmentDetailsDialog, EnrollmentStatusBadge } from "./components";
import {
  FILTERABLE_ENROLLMENT_STATUSES,
  canConfirmUnsubscriptionStatus,
  canDeactivateEnrollmentStatus,
  canRequestUnsubscriptionStatus,
  getEnrollmentStatusLabel,
} from "@/features/clients/models/enrollmentStatus";
import FormDialog from "@/shared/components/FormDialog";
import { getCurrentDistributorId, useAuthStore } from "@/core/security/authStore";
import { useClients } from "../viewmodels/useClients";
import { formatDateTime } from "../models/data";

type ClientActionConfirm = "generate" | "validate" | "deactivate" | "unsubscribe" | "confirmUnsubscribe" | "delete" | null;

const ClientsPage = () => {
  const vm = useClients();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentDistributorId = getCurrentDistributorId();
  const isDistributor =
    user?.entityContext === "Distributeur" ||
    (Boolean(currentDistributorId) && user?.entityContext !== "Administration" && user?.entityContext !== "Structure");

  useEffect(() => {
    if (isDistributor && currentDistributorId) {
      navigate(`/dashboard/distributeurs/${currentDistributorId}`, { replace: true });
    }
  }, [isDistributor, currentDistributorId, navigate]);

  const [confirmAction, setConfirmAction] = useState<ClientActionConfirm>(null);

  const handleSubmitCreate = async () => {
    await vm.submitCreateEnrollment();
  };

  const confirmConfig = {
    generate: {
      title: "Confirmer la génération",
      description: "Voulez-vous générer un nouveau code d'enrôlement ?",
      confirmLabel: "Générer",
      onConfirm: vm.generateCode,
    },
    validate: {
      title: "Confirmer la validation",
      description: "Voulez-vous valider cet enrôlement avec les informations saisies ?",
      confirmLabel: "Valider",
      onConfirm: vm.validateSelectedEnrollment,
    },
    deactivate: {
      title: "Confirmation",
      description: "Voulez vous vraiment effectuer cette action?",
      confirmLabel: "Oui",
      cancelLabel: "Non",
      onConfirm: vm.deactivateSelectedEnrollment,
    },
    unsubscribe: {
      title: "Confirmation",
      description: "Voulez vous vraiment effectuer cette action?",
      confirmLabel: "Oui",
      cancelLabel: "Non",
      onConfirm: vm.unsubscribeSelectedEnrollment,
    },
    confirmUnsubscribe: {
      title: "Confirmation",
      description: "Voulez vous vraiment effectuer cette opération ?",
      confirmLabel: "Oui",
      cancelLabel: "Non",
      onConfirm: vm.confirmSelectedUnsubscription,
    },
    delete: {
      title: "Confirmation",
      description: "Voulez vous vraiment effectuer cette action?",
      confirmLabel: "Oui",
      cancelLabel: "Non",
      confirmVariant: "destructive",
      onConfirm: vm.deleteSelectedEnrollment,
    },
  } as const;

  const selectedConfirm = confirmAction ? confirmConfig[confirmAction] : null;
  const hasActions = vm.permissions.canUpdate || vm.permissions.canUnsubscribe || vm.permissions.canDeactivate;
  const tableBodyContent = (() => {
    if (vm.loading) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 7 : 6} className="text-center py-12 text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des enrôlements…
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (vm.error) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 7 : 6} className="text-center py-12">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {vm.error}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (vm.filtered.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 7 : 6} className="text-center py-8 text-muted-foreground">Aucun enrôlement trouvé</TableCell>
        </TableRow>
      );
    }

    return vm.filtered.map((c) => {
      const canUnsubscribe = canRequestUnsubscriptionStatus(c.status);
      const canConfirmUnsubscribe = canConfirmUnsubscriptionStatus(c.status);
      const canDeactivate = canDeactivateEnrollmentStatus(c.status);

      return (
        <TableRow
          key={c.id}
          className="border-border/30 hover:bg-muted/30 cursor-pointer"
          onClick={() => {
            navigate(`/dashboard/clients/${c.id}/details`, {
              state: { enrollment: c },
            });
          }}
        >
          <TableCell className="text-sm font-semibold uppercase">{c.clientType || "-"}</TableCell>
          <TableCell className="font-medium">{c.institutionLabel}</TableCell>
          <TableCell className="text-sm">
            {c.clientType?.trim().toUpperCase() === "ENTREPRISE" || c.lastName?.trim().toLowerCase() === "entreprise"
              ? (c.firstName || "-")
              : [c.firstName, c.lastName].filter(Boolean).join(" ") || "-"}
          </TableCell>
          <TableCell className="text-sm">{formatDateTime(c.createdAt)}</TableCell>
          <TableCell className="text-sm">{formatDateTime(vm.getEnrollmentExpiryDate(c))}</TableCell>
          <TableCell><EnrollmentStatusBadge status={c.status} /></TableCell>
          {hasActions && <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
            {(vm.permissions.canUpdate || vm.permissions.canUnsubscribe || vm.permissions.canDeactivate) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {vm.permissions.canUnsubscribe && (
                    <DropdownMenuItem
                      disabled={!canUnsubscribe}
                      onClick={() => {
                        navigate(`/dashboard/clients/${c.id}/action/unsubscribe`, {
                          state: { enrollment: c },
                        });
                      }}
                    >
                      <UserMinus className="h-4 w-4 mr-2" /> Désinscription
                    </DropdownMenuItem>
                  )}
                  {vm.permissions.canUnsubscribe && (
                    <DropdownMenuItem
                      disabled={!canConfirmUnsubscribe}
                      onClick={() => {
                        navigate(`/dashboard/clients/${c.id}/details`, {
                          state: { enrollment: c, clientAction: "confirm-unsubscribe" },
                        });
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" /> Valider désinscription
                    </DropdownMenuItem>
                  )}
                  {vm.permissions.canDeactivate && (
                    <DropdownMenuItem
                      disabled={!canDeactivate}
                      onClick={() => {
                        navigate(`/dashboard/clients/${c.id}/action/deactivate`, {
                          state: { enrollment: c },
                        });
                      }}
                    >
                      <UserX className="h-4 w-4 mr-2" /> Désactivation
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TableCell>}
        </TableRow>
      );
    });
  })();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center"><UserCheck className="h-5 w-5 text-accent-foreground" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Clients</h1>
            <p className="text-muted-foreground text-sm">{vm.clients.length} enrôlements chargés</p>
          </div>
        </div>
        {vm.permissions.canCreate && (
          <Button onClick={vm.openCreateEnrollment} className="gradient-accent text-accent-foreground hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Nouvel enrôlement
          </Button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (Tél, Code, ID client) ou Institution..."
              className="pl-10"
              value={vm.filterInstitution}
              onChange={(e) => vm.setFilterInstitution(e.target.value)}
            />
          </div>
          <Select value={vm.filterType || "__all__"} onValueChange={(v) => vm.setFilterType(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les types</SelectItem>
              <SelectItem value="PARTICULIER">Particulier</SelectItem>
              <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
              <SelectItem value="COMMERCANT">Commerçant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vm.filterStatut || "all"} onValueChange={(v) => vm.setFilterStatut(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {FILTERABLE_ENROLLMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{getEnrollmentStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vm.hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={vm.resetFilters} title="Réinitialiser les filtres" className="shrink-0 text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-y-auto max-h-[75vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="border-border/50">
              <TableHead>Types</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Nom/Libellé</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead>Date d'expiration</TableHead>
              <TableHead>Statut</TableHead>
              {hasActions && <TableHead className="text-right">Options</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableBodyContent}
          </TableBody>
        </Table>
        </div>
      </motion.div>

      <EnrollmentDetailsDialog
        open={vm.detailOpen}
        onOpenChange={vm.setDetailOpen}
        detailLoading={vm.detailLoading}
        viewClient={vm.viewClient}
        viewClientDetails={vm.viewClientDetails}
        correspondenceScore={vm.correspondenceScore}
        detailStructureParams={vm.detailStructureParams}
        initiationTabLabel={vm.initiationTabLabel}
        validationForm={vm.validationForm}
        onValidationFormChange={vm.setValidationForm}
        enrollmentCodeInput={vm.enrollmentCodeInput}
        actionLoading={vm.actionLoading}
        accountsLoading={vm.accountsLoading}
        canUpdate={vm.permissions.canUpdate}
        canGenerateCode={vm.permissions.canGenerateCode}
        canValidateEnrollment={vm.canValidateCurrentEnrollment}
        canDeactivateEnrollment={Boolean(vm.detailClientAction === "deactivate" && vm.permissions.canDeactivate)}
        canUnsubscribeEnrollment={Boolean(vm.detailClientAction === "unsubscribe" && vm.permissions.canUnsubscribe)}
        canConfirmUnsubscription={Boolean(vm.detailClientAction === "confirm-unsubscribe" && vm.permissions.canUnsubscribe)}
        canDeleteEnrollment={vm.canDeleteCurrentEnrollment}
        hasLoadedCouplageAccounts={vm.hasLoadedCouplageAccounts}
        couplageAccounts={vm.couplageAccounts}
        availableSubscriptions={vm.availableSubscriptions}
        selectedSubscriptionId={vm.selectedSubscriptionId}
        isLoadingSubscriptions={vm.isLoadingSubscriptions}
        onSubscriptionChange={vm.setSelectedSubscriptionId}
        onEnrollmentCodeChange={vm.setEnrollmentCodeInput}
        onGenerateCode={() => setConfirmAction("generate")}
        onUpdateEnteredData={vm.updatePendingEnteredData}
        onValidateEnrollment={() => setConfirmAction("validate")}
        onDeactivateEnrollment={() => setConfirmAction("deactivate")}
        onUnsubscribeEnrollment={() => setConfirmAction("unsubscribe")}
        onConfirmUnsubscription={() => setConfirmAction("confirmUnsubscribe")}
        onDeleteEnrollment={() => setConfirmAction("delete")}
      />

      <FormDialog
        open={vm.createDialogOpen}
        onOpenChange={vm.setCreateDialogOpen}
        title="Nouvel enrôlement"
        description="Renseignez les informations générales et les informations de pièce."
        submitLabel="Enrôler"
        onSubmit={handleSubmitCreate}
        submitDisabled={vm.createLoading}
        contentClassName="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
      >
        <Tabs
          value={vm.createForm.type}
          onValueChange={(value) => {
            // Les champs diffèrent d'un type de client à l'autre : on repart sans erreur affichée
            vm.resetCreateFormErrors();
            vm.setCreateForm({ ...vm.createForm, type: value as "PARTICULIER" | "ENTREPRISE" | "COMMERCANT" });
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="PARTICULIER">Particulier</TabsTrigger>
            <TabsTrigger value="ENTREPRISE">Entreprise</TabsTrigger>
            <TabsTrigger value="COMMERCANT">Commerçant</TabsTrigger>
          </TabsList>

          <TabsContent value="PARTICULIER" className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nom <span className="text-destructive">*</span></Label>
                  <Input
                    value={vm.createForm.nom}
                    {...invalidFieldProps(vm.createFormErrors.nom)}
                    onChange={(e) => {
                      vm.clearCreateFormError("nom");
                      vm.setCreateForm({ ...vm.createForm, nom: e.target.value });
                    }}
                  />
                  <FieldError message={vm.createFormErrors.nom} />
                </div>
                <div className="space-y-1.5">
                  <Label>Prénom <span className="text-destructive">*</span></Label>
                  <Input
                    value={vm.createForm.prenom}
                    {...invalidFieldProps(vm.createFormErrors.prenom)}
                    onChange={(e) => {
                      vm.clearCreateFormError("prenom");
                      vm.setCreateForm({ ...vm.createForm, prenom: e.target.value });
                    }}
                  />
                  <FieldError message={vm.createFormErrors.prenom} />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone <span className="text-destructive">*</span></Label>
                  <Input
                    value={vm.createForm.telephone}
                    {...invalidFieldProps(vm.createFormErrors.telephone)}
                    onChange={(e) => {
                      vm.clearCreateFormError("telephone");
                      vm.setCreateForm({ ...vm.createForm, telephone: e.target.value });
                    }}
                  />
                  <FieldError message={vm.createFormErrors.telephone} />
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse mail <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    value={vm.createForm.email}
                    {...invalidFieldProps(vm.createFormErrors.email)}
                    onChange={(e) => {
                      vm.clearCreateFormError("email");
                      vm.setCreateForm({ ...vm.createForm, email: e.target.value });
                    }}
                  />
                  <FieldError message={vm.createFormErrors.email} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Code client <span className="text-destructive">*</span></Label>
                  <Input
                    value={vm.createForm.codeClient}
                    {...invalidFieldProps(vm.createFormErrors.codeClient)}
                    onChange={(e) => {
                      vm.clearCreateFormError("codeClient");
                      vm.setCreateForm({ ...vm.createForm, codeClient: e.target.value });
                    }}
                  />
                  <FieldError message={vm.createFormErrors.codeClient} />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Infos pièce</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type de pièce <span className="text-destructive">*</span></Label>
                    <Select
                      value={vm.createForm.typePiece}
                      onValueChange={(value) => {
                        vm.clearCreateFormError("typePiece");
                        vm.setCreateForm({ ...vm.createForm, typePiece: value });
                      }}
                    >
                      <SelectTrigger {...invalidFieldProps(vm.createFormErrors.typePiece)}>
                        <SelectValue placeholder="Type de pièce" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNI">CNI</SelectItem>
                        <SelectItem value="Passeport">Passeport</SelectItem>
                        <SelectItem value="Permis de conduire">Permis de conduire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError message={vm.createFormErrors.typePiece} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Numéro pièce <span className="text-destructive">*</span></Label>
                    <Input
                      value={vm.createForm.numeroPiece}
                      {...invalidFieldProps(vm.createFormErrors.numeroPiece)}
                      onChange={(e) => {
                        vm.clearCreateFormError("numeroPiece");
                        vm.setCreateForm({ ...vm.createForm, numeroPiece: e.target.value });
                      }}
                    />
                    <FieldError message={vm.createFormErrors.numeroPiece} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date de naissance <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={vm.createForm.dateNaissance}
                        {...invalidFieldProps(vm.createFormErrors.dateNaissance, "pr-10")}
                        onChange={(e) => {
                          vm.clearCreateFormError("dateNaissance");
                          vm.setCreateForm({ ...vm.createForm, dateNaissance: e.target.value });
                        }}
                      />
                      <FieldError message={vm.createFormErrors.dateNaissance} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date de délivrance <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={vm.createForm.dateDelivrance}
                        {...invalidFieldProps(vm.createFormErrors.dateDelivrance, "pr-10")}
                        onChange={(e) => {
                          vm.clearCreateFormError("dateDelivrance");
                          vm.setCreateForm({ ...vm.createForm, dateDelivrance: e.target.value });
                        }}
                      />
                      <FieldError message={vm.createFormErrors.dateDelivrance} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date d'expiration <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={vm.createForm.dateExpiration}
                        {...invalidFieldProps(vm.createFormErrors.dateExpiration, "pr-10")}
                        onChange={(e) => {
                          vm.clearCreateFormError("dateExpiration");
                          vm.setCreateForm({ ...vm.createForm, dateExpiration: e.target.value });
                        }}
                      />
                      <FieldError message={vm.createFormErrors.dateExpiration} />
                    </div>
                  </div>
                </div>
              </div>
          </TabsContent>

          <TabsContent value="ENTREPRISE" className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Libellé <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.libelleEntreprise}
                  {...invalidFieldProps(vm.createFormErrors.libelleEntreprise)}
                  onChange={(e) => {
                    vm.clearCreateFormError("libelleEntreprise");
                    vm.setCreateForm({ ...vm.createForm, libelleEntreprise: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.libelleEntreprise} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.telephone}
                  {...invalidFieldProps(vm.createFormErrors.telephone)}
                  onChange={(e) => {
                    vm.clearCreateFormError("telephone");
                    vm.setCreateForm({ ...vm.createForm, telephone: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.telephone} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={vm.createForm.email}
                  {...invalidFieldProps(vm.createFormErrors.email)}
                  onChange={(e) => {
                    vm.clearCreateFormError("email");
                    vm.setCreateForm({ ...vm.createForm, email: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.email} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Code client <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.codeClient}
                  {...invalidFieldProps(vm.createFormErrors.codeClient)}
                  onChange={(e) => {
                    vm.clearCreateFormError("codeClient");
                    vm.setCreateForm({ ...vm.createForm, codeClient: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.codeClient} />
              </div>
              <div className="space-y-1.5">
                <Label>Ninea <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.ninea}
                  {...invalidFieldProps(vm.createFormErrors.ninea)}
                  onChange={(e) => {
                    vm.clearCreateFormError("ninea");
                    vm.setCreateForm({ ...vm.createForm, ninea: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.ninea} />
              </div>
              <div className="space-y-1.5">
                <Label>Numéro d'identité fiscale <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.numeroIdentiteFiscale}
                  {...invalidFieldProps(vm.createFormErrors.numeroIdentiteFiscale)}
                  onChange={(e) => {
                    vm.clearCreateFormError("numeroIdentiteFiscale");
                    vm.setCreateForm({ ...vm.createForm, numeroIdentiteFiscale: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.numeroIdentiteFiscale} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="COMMERCANT" className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.nom}
                  {...invalidFieldProps(vm.createFormErrors.nom)}
                  onChange={(e) => {
                    vm.clearCreateFormError("nom");
                    vm.setCreateForm({ ...vm.createForm, nom: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.nom} />
              </div>
              <div className="space-y-1.5">
                <Label>Prénom <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.prenom}
                  {...invalidFieldProps(vm.createFormErrors.prenom)}
                  onChange={(e) => {
                    vm.clearCreateFormError("prenom");
                    vm.setCreateForm({ ...vm.createForm, prenom: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.prenom} />
              </div>
              <div className="space-y-1.5">
                <Label>Dénomination commerciale (Libellé) <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.libelleEntreprise}
                  {...invalidFieldProps(vm.createFormErrors.libelleEntreprise)}
                  onChange={(e) => {
                    vm.clearCreateFormError("libelleEntreprise");
                    vm.setCreateForm({ ...vm.createForm, libelleEntreprise: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.libelleEntreprise} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.telephone}
                  {...invalidFieldProps(vm.createFormErrors.telephone)}
                  onChange={(e) => {
                    vm.clearCreateFormError("telephone");
                    vm.setCreateForm({ ...vm.createForm, telephone: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.telephone} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={vm.createForm.email}
                  {...invalidFieldProps(vm.createFormErrors.email)}
                  onChange={(e) => {
                    vm.clearCreateFormError("email");
                    vm.setCreateForm({ ...vm.createForm, email: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.email} />
              </div>
              <div className="space-y-1.5">
                <Label>Code client <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.codeClient}
                  {...invalidFieldProps(vm.createFormErrors.codeClient)}
                  onChange={(e) => {
                    vm.clearCreateFormError("codeClient");
                    vm.setCreateForm({ ...vm.createForm, codeClient: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.codeClient} />
              </div>
              <div className="space-y-1.5">
                <Label>Ninea <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.ninea}
                  {...invalidFieldProps(vm.createFormErrors.ninea)}
                  onChange={(e) => {
                    vm.clearCreateFormError("ninea");
                    vm.setCreateForm({ ...vm.createForm, ninea: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.ninea} />
              </div>
              <div className="space-y-1.5">
                <Label>Numéro d'identité fiscale <span className="text-destructive">*</span></Label>
                <Input
                  value={vm.createForm.numeroIdentiteFiscale}
                  {...invalidFieldProps(vm.createFormErrors.numeroIdentiteFiscale)}
                  onChange={(e) => {
                    vm.clearCreateFormError("numeroIdentiteFiscale");
                    vm.setCreateForm({ ...vm.createForm, numeroIdentiteFiscale: e.target.value });
                  }}
                />
                <FieldError message={vm.createFormErrors.numeroIdentiteFiscale} />
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Infos pièce d'identité</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type de pièce <span className="text-destructive">*</span></Label>
                  <Select
                    value={vm.createForm.typePiece}
                    onValueChange={(value) => {
                      vm.clearCreateFormError("typePiece");
                      vm.setCreateForm({ ...vm.createForm, typePiece: value });
                    }}
                  >
                    <SelectTrigger {...invalidFieldProps(vm.createFormErrors.typePiece)}>
                      <SelectValue placeholder="Type de pièce" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNI">CNI</SelectItem>
                      <SelectItem value="Passeport">Passeport</SelectItem>
                      <SelectItem value="Permis de conduire">Permis de conduire</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={vm.createFormErrors.typePiece} />
                </div>
                <div className="space-y-1.5">
                  <Label>Numéro pièce <span className="text-destructive">*</span></Label>
                  <Input
                    value={vm.createForm.numeroPiece}
                    {...invalidFieldProps(vm.createFormErrors.numeroPiece)}
                    onChange={(e) => {
                      vm.clearCreateFormError("numeroPiece");
                      vm.setCreateForm({ ...vm.createForm, numeroPiece: e.target.value });
                    }}
                  />
                  <FieldError message={vm.createFormErrors.numeroPiece} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Date de naissance <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={vm.createForm.dateNaissance}
                      {...invalidFieldProps(vm.createFormErrors.dateNaissance, "pr-10")}
                      onChange={(e) => {
                        vm.clearCreateFormError("dateNaissance");
                        vm.setCreateForm({ ...vm.createForm, dateNaissance: e.target.value });
                      }}
                    />
                    <FieldError message={vm.createFormErrors.dateNaissance} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Date de délivrance <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={vm.createForm.dateDelivrance}
                      {...invalidFieldProps(vm.createFormErrors.dateDelivrance, "pr-10")}
                      onChange={(e) => {
                        vm.clearCreateFormError("dateDelivrance");
                        vm.setCreateForm({ ...vm.createForm, dateDelivrance: e.target.value });
                      }}
                    />
                    <FieldError message={vm.createFormErrors.dateDelivrance} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Date d'expiration <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={vm.createForm.dateExpiration}
                      {...invalidFieldProps(vm.createFormErrors.dateExpiration, "pr-10")}
                      onChange={(e) => {
                        vm.clearCreateFormError("dateExpiration");
                        vm.setCreateForm({ ...vm.createForm, dateExpiration: e.target.value });
                      }}
                    />
                    <FieldError message={vm.createFormErrors.dateExpiration} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(selectedConfirm)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
        }}
        title={selectedConfirm?.title || ""}
        description={selectedConfirm?.description || ""}
        confirmLabel={selectedConfirm?.confirmLabel || "Confirmer"}
        cancelLabel={selectedConfirm && "cancelLabel" in selectedConfirm ? selectedConfirm.cancelLabel : undefined}
        confirmVariant={
          selectedConfirm && "confirmVariant" in selectedConfirm
            ? (selectedConfirm.confirmVariant as "destructive" | "default")
            : undefined
        }
        confirmDisabled={vm.actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!selectedConfirm) {
            return;
          }

          await selectedConfirm.onConfirm();
          setConfirmAction(null);
        }}
      />
    </div>
  );
};

export default ClientsPage;
