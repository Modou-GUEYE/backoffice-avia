import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Copy, FileText, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { EnrollmentDetailsDialog } from "./components";
import EnrollmentStatusBadge from "./components/EnrollmentStatusBadge";
import { EnrollmentApplicationSchema } from "@/features/clients/models/types";
import { formatDateTime } from "@/features/clients/models/data";
import { useClients } from "@/features/clients/viewmodels/useClients";

/** Nom affiché du client : la raison sociale pour une entreprise, sinon prénom et nom. */
const getEnrollmentClientName = (enrollment: EnrollmentApplicationSchema | null): string => {
  if (!enrollment) return "";
  const isEntreprise =
    enrollment.clientType?.trim().toUpperCase() === "ENTREPRISE" ||
    enrollment.lastName?.trim().toLowerCase() === "entreprise";
  if (isEntreprise) return enrollment.firstName?.trim() || "";
  return [enrollment.firstName, enrollment.lastName].filter(Boolean).join(" ").trim();
};

const InfoItem = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-1 min-w-0 ${className}`}>
    <span className="text-xs text-muted-foreground font-medium block">{label}</span>
    <div className="text-sm font-semibold text-foreground break-words">{children}</div>
  </div>
);

type ClientActionConfirm = "generate" | "validate" | "deactivate" | "unsubscribe" | "confirmUnsubscribe" | "delete" | null;

type LocationState = {
  enrollment?: EnrollmentApplicationSchema;
  clientAction?: "confirm-unsubscribe";
};

type ConfirmConfigItem = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => Promise<void>;
};

const ClientEnrollmentDetailsPage = () => {
  const vm = useClients();
  const navigate = useNavigate();
  const location = useLocation();
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const [confirmAction, setConfirmAction] = useState<ClientActionConfirm>(null);
  const [loadedEnrollmentId, setLoadedEnrollmentId] = useState<string | null>(null);
  const [hasOpenedDetailPage, setHasOpenedDetailPage] = useState(false);
  // Ref to deduplicate: prevents multiple parallel openDetail calls when the effect
  // re-runs due to vm.clients/vm.openDetail reference changes during list loading.
  const openDetailInitiatedRef = useRef<string | null>(null);

  const clientActionFromState = (location.state as LocationState | null)?.clientAction ?? undefined;

  useEffect(() => {
    openDetailInitiatedRef.current = null;
    setLoadedEnrollmentId(null);
    setHasOpenedDetailPage(false);
  }, [enrollmentId]);

  useEffect(() => {
    const openDetails = async (enrollment: EnrollmentApplicationSchema) => {
      await vm.openDetail(enrollment, { bypassPermissionCheck: true, clientAction: clientActionFromState });
      setLoadedEnrollmentId(enrollment.id);
      setHasOpenedDetailPage(true);
    };

    if (!enrollmentId) {
      navigate("/dashboard/clients", { replace: true });
      return;
    }

    if (loadedEnrollmentId === enrollmentId) {
      return;
    }

    if (openDetailInitiatedRef.current === enrollmentId) {
      return;
    }

    if (vm.loading) {
      return;
    }

    const fromList = vm.clients.find((item) => item.id === enrollmentId);
    if (!fromList) {
      return;
    }

    openDetailInitiatedRef.current = enrollmentId;
    openDetails(fromList).catch(() => {
      navigate("/dashboard/clients", { replace: true });
    });
  }, [
    enrollmentId,
    loadedEnrollmentId,
    clientActionFromState,
    vm.openDetail,
    vm.clients,
    vm.loading,
    navigate,
  ]);

  useEffect(() => {
    if (!hasOpenedDetailPage) {
      return;
    }

    if (vm.detailLoading) {
      return;
    }

    if (!vm.detailOpen) {
      navigate("/dashboard/clients", { replace: true });
    }
  }, [hasOpenedDetailPage, vm.detailLoading, vm.detailOpen, navigate]);

  const confirmConfig = useMemo<Record<Exclude<ClientActionConfirm, null>, ConfirmConfigItem>>(() => ({
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
      confirmVariant: "destructive" as const,
      onConfirm: vm.deleteSelectedEnrollment,
    },
  }), [vm]);

  const selectedConfirm = confirmAction ? confirmConfig[confirmAction] : null;
  const viewClient = vm.viewClient;
  const clientName = getEnrollmentClientName(viewClient);

  const clientCode = vm.viewClientDetails?.customer.codeClient?.trim() || "";

  const copyClientCode = () => {
    if (!clientCode) return;
    navigator.clipboard.writeText(clientCode);
    toast.success("Code client copié dans le presse-papiers");
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent hover:text-inherit shrink-0"
            onClick={() => navigate("/dashboard/clients")}
            aria-label="Retour aux enrôlements"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
              <UserCheck className="h-7 w-7" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{clientName || "Détails enrôlement"}</h1>
            <p className="text-muted-foreground text-sm">
              Enrôlement{viewClient?.clientType ? ` ${viewClient.clientType.toLowerCase()}` : ""}
              {viewClient?.institutionLabel ? ` · ${viewClient.institutionLabel}` : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {viewClient && !vm.detailLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-xl p-6 space-y-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Informations de l'enrôlement</h3>
              <p className="text-xs text-muted-foreground">Client, structure et cycle de vie de la demande</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoItem label="Client">{clientName || "—"}</InfoItem>
            <InfoItem label="Type de client">
              <span className="uppercase">{viewClient.clientType || "—"}</span>
            </InfoItem>
            <InfoItem label="Structure">{viewClient.institutionLabel || "—"}</InfoItem>
            <InfoItem label="Statut">
              <EnrollmentStatusBadge status={viewClient.status} />
            </InfoItem>

            <InfoItem label="Code client">
              {clientCode ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono tracking-wide">{clientCode}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={copyClientCode}
                    aria-label="Copier le code client"
                    title="Copier le code client"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                "—"
              )}
            </InfoItem>
            <InfoItem label="Téléphone">
              <span className="font-mono">{vm.viewClientDetails?.customer.phone || "—"}</span>
            </InfoItem>
            <InfoItem label="E-mail">{vm.viewClientDetails?.customer.email || "—"}</InfoItem>
            <InfoItem label="Identifiant client">
              <span className="text-xs font-mono font-normal text-muted-foreground break-all">
                {viewClient.customerId || "—"}
              </span>
            </InfoItem>

            <InfoItem label="Date de création">{formatDateTime(viewClient.createdAt)}</InfoItem>
            <InfoItem label="Date d'expiration">{formatDateTime(vm.getEnrollmentExpiryDate(viewClient))}</InfoItem>
            <InfoItem label="Dernière mise à jour">{formatDateTime(viewClient.updatedAt)}</InfoItem>

            {viewClient.rejectionReason && (
              <InfoItem label="Motif de rejet" className="sm:col-span-2 lg:col-span-4">
                <span className="text-destructive">{viewClient.rejectionReason}</span>
              </InfoItem>
            )}
          </div>
        </motion.div>
      )}

      <EnrollmentDetailsDialog
        open
        onOpenChange={() => navigate("/dashboard/clients")}
        asPage
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

      <ConfirmDialog
        open={Boolean(selectedConfirm)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
        }}
        title={selectedConfirm?.title ?? "Confirmation"}
        description={selectedConfirm?.description ?? "Confirmez l'action"}
        confirmLabel={selectedConfirm?.confirmLabel ?? "Oui"}
        cancelLabel={selectedConfirm?.cancelLabel ?? "Non"}
        onConfirm={async () => {
          if (!selectedConfirm) {
            return;
          }

          await selectedConfirm.onConfirm();
          setConfirmAction(null);
        }}
        confirmVariant={selectedConfirm?.confirmVariant}
      />
    </div>
  );
};

export default ClientEnrollmentDetailsPage;
