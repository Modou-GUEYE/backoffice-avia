import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ShieldX, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import {
  deactivateCustomer,
  fetchEnrollmentDetails,
  fetchPendingEnrollmentsByInstitution,
  unsubscribeEnrollment,
} from "@/features/clients/services/clientsService";
import {
  CustomerEnrollmentDetailsResponseSchema,
  EnrollmentApplicationSchema,
} from "@/features/clients/models/types";
import {
  readEnrollmentCustomerIdMap,
  resolveCustomerIdForEnrollment,
  readEnrollmentReferenceLinkMap,
  resolveReferenceLinkForEnrollment,
  setEnrollmentStatusOverride,
} from "@/features/clients/viewmodels/customerIdMapStore";
import { EnrollmentStatusBadge } from "./components";
import { getCurrentInstitutionId } from "@/core/security/authStore";
import { formatDateTime } from "@/features/clients/models/data";

type EnrollmentActionKind = "unsubscribe" | "deactivate";

type LocationState = {
  enrollment?: EnrollmentApplicationSchema;
};

type DisplayField = {
  label: string;
  value: string;
};

const resolvePageMeta = (action: EnrollmentActionKind) => {
  if (action === "unsubscribe") {
    return {
      title: "Désinscription client",
      subtitle: "Vérifiez les informations puis confirmez la demande de désinscription.",
      icon: UserMinus,
      confirmLabel: "Confirmer la désinscription",
      successMessage: "Demande de désinscription effectuée avec succès",
    };
  }

  return {
    title: "Désactivation client",
    subtitle: "Vérifiez les informations puis confirmez la désactivation du client.",
    icon: ShieldX,
    confirmLabel: "Confirmer la désactivation",
    successMessage: "Client désactivé avec succès",
  };
};

const ClientEnrollmentActionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enrollmentId, action } = useParams<{ enrollmentId: string; action: EnrollmentActionKind }>();

  const normalizedAction: EnrollmentActionKind | null =
    action === "unsubscribe" || action === "deactivate" ? action : null;

  const pageMeta = useMemo(
    () => (normalizedAction ? resolvePageMeta(normalizedAction) : null),
    [normalizedAction],
  );

  const [enrollment, setEnrollment] = useState<EnrollmentApplicationSchema | null>(
    (location.state as LocationState | null)?.enrollment ?? null,
  );
  const [details, setDetails] = useState<CustomerEnrollmentDetailsResponseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const backToClients = useCallback(() => {
    navigate("/dashboard/clients");
  }, [navigate]);

  useEffect(() => {
    if (!normalizedAction || !enrollmentId) {
      toast.error("Action client invalide");
      backToClients();
      return;
    }

    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        const institutionId = getCurrentInstitutionId();
        if (!institutionId) {
          throw new Error("Institution introuvable dans la session backend");
        }

        const enrollments = await fetchPendingEnrollmentsByInstitution(institutionId);
        let resolvedEnrollment = enrollments.find((item) => item.id === enrollmentId) ?? null;

        if (!resolvedEnrollment) {
          throw new Error("Enrôlement introuvable");
        }

        const referenceLinkMap = readEnrollmentReferenceLinkMap();
        const resolvedReferenceLink = resolveReferenceLinkForEnrollment(resolvedEnrollment, referenceLinkMap);
        const customerIdMap = readEnrollmentCustomerIdMap();
        const resolvedCustomerId = resolveCustomerIdForEnrollment(resolvedEnrollment, customerIdMap);
        if (resolvedReferenceLink && !resolvedEnrollment.referenceLink) {
          resolvedEnrollment = {
            ...resolvedEnrollment,
            referenceLink: resolvedReferenceLink,
          };
        }
        if (resolvedCustomerId && !resolvedEnrollment.customerId) {
          resolvedEnrollment = {
            ...resolvedEnrollment,
            customerId: resolvedCustomerId,
          };
        }

        const loadedDetails = await fetchEnrollmentDetails(resolvedEnrollment.id);

        if (!active) return;
        setEnrollment(resolvedEnrollment);
        setDetails(loadedDetails);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Impossible de charger l'enrôlement";
        toast.error(message);
        backToClients();
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [normalizedAction, enrollmentId, backToClients]);

  const runAction = async () => {
    if (!normalizedAction || !enrollment || !pageMeta) {
      return;
    }

    setActionLoading(true);
    try {
      if (normalizedAction === "unsubscribe") {
        const unsubscriptionResult = await unsubscribeEnrollment(enrollment.id);
        const nextStatus = unsubscriptionResult.status?.trim().toUpperCase();
        if (nextStatus && enrollment.id) {
          setEnrollmentStatusOverride(enrollment.id, nextStatus);
        }
      } else {
        const customerId = enrollment.customerId?.trim();
        if (!customerId) {
          throw new Error("Identifiant client introuvable pour la désactivation");
        }

        const deactivationResult = await deactivateCustomer(customerId);
        const nextStatus = deactivationResult.status?.trim().toUpperCase();
        if (nextStatus && enrollment.id) {
          setEnrollmentStatusOverride(enrollment.id, nextStatus);
        }
      }

      toast.success(pageMeta.successMessage);
      navigate("/dashboard/clients", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'effectuer l'action";
      toast.error(message);
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
    }
  };

  const ActionIcon = pageMeta?.icon ?? ShieldX;

  const isEntreprise = useMemo(() => {
    if (!details) {
      return false;
    }

    const documentType = details.documents?.[0]?.type?.trim().toUpperCase() ?? "";
    const identityLastName = details.identity.lastName?.trim().toLowerCase() ?? "";

    return (
      identityLastName === "entreprise"
      || documentType === "NINEA"
      || Boolean(details.identity.ninea?.trim())
      || Boolean(details.identity.label?.trim())
    );
  }, [details]);

  const identityFields = useMemo<DisplayField[]>(() => {
    if (!details) {
      return [];
    }

    const commonFields: DisplayField[] = [
      {
        label: "Type enrôlement",
        value: isEntreprise ? "ENTREPRISE" : "PARTICULIER",
      },
    ];

    const particulierFields: DisplayField[] = [
      { label: "Nom", value: details.identity.lastName?.trim() ?? "" },
      { label: "Prénom", value: details.identity.firstName?.trim() ?? "" },
      { label: "Type pièce", value: details.identity.documentType?.trim() ?? "" },
      {
        label: "Numéro pièce",
        value: details.identity.documentNumber?.trim() || details.identity.nationalId?.trim() || "",
      },
      { label: "Date de naissance", value: details.identity.dateOfBirth?.trim() ?? "" },
      { label: "Date de délivrance", value: details.identity.deliveryDate?.trim() ?? "" },
      { label: "Date d'expiration", value: details.identity.expiryDate?.trim() ?? "" },
    ];

    const entrepriseFields: DisplayField[] = [
      {
        label: "Raison sociale",
        value: details.identity.label?.trim() || details.identity.firstName?.trim() || "",
      },
      { label: "Ninea", value: details.identity.ninea?.trim() ?? "" },
      {
        label: "Identité fiscale",
        value: details.identity.fiscalIdentity?.trim() || details.identity.nationalId?.trim() || "",
      },
      { label: "Type pièce", value: details.identity.documentType?.trim() ?? "" },
      {
        label: "Numéro pièce",
        value: details.identity.documentNumber?.trim() || details.identity.nationalId?.trim() || "",
      },
    ];

    const selectedFields = isEntreprise ? entrepriseFields : particulierFields;

    return [...commonFields, ...selectedFields].filter((field) => field.value.length > 0);
  }, [details, isEntreprise]);

  if (!normalizedAction || !pageMeta) {
    return null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
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
            onClick={backToClients}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
            <ActionIcon className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{pageMeta.title}</h1>
            <p className="text-muted-foreground text-sm">{pageMeta.subtitle}</p>
          </div>
        </div>
      </motion.div>

      {loading && (
        <div className="glass-card rounded-xl p-6 text-sm text-muted-foreground">
          Chargement des informations d'enrôlement...
        </div>
      )}

      {!loading && enrollment && details && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-5 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">ID enrôlement</p>
                <p className="text-sm font-medium break-all">{enrollment.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Institution</p>
                <p className="text-sm font-medium">{enrollment.institutionLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <EnrollmentStatusBadge status={enrollment.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date création</p>
                <p className="text-sm">{formatDateTime(enrollment.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Code enrôlement</p>
                <p className="text-sm font-medium">{enrollment.enrollmentCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Téléphone</p>
                <p className="text-sm">{details.customer.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{details.customer.email || "-"}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {identityFields.length === 0 ? (
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  Aucune information d'identité disponible.
                </div>
              ) : (
                identityFields.map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className="text-sm">{field.value}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-xl p-5 space-y-4"
          >
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <p>Cette opération est sensible et impacte l'accès client. Merci de vérifier les données avant confirmation.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={backToClients} disabled={actionLoading}>
                Annuler
              </Button>
              <Button
                type="button"
                className="gradient-accent text-accent-foreground hover:opacity-90"
                onClick={() => setConfirmOpen(true)}
                disabled={actionLoading}
              >
                {pageMeta.confirmLabel}
              </Button>
            </div>
          </motion.div>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Confirmation"
            description="Voulez-vous vraiment effectuer cette action ?"
            confirmLabel="Oui"
            cancelLabel="Non"
            onConfirm={runAction}
          />
        </>
      )}
    </div>
  );
};

export default ClientEnrollmentActionPage;