import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { SubscriptionResponse } from "@/features/abonnements/models/types";

type CouplageAccountView = {
  referenceIban?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  accountLabel?: string | null;
  accountHolder?: string | null;
  currency?: string | null;
};

type EnrollmentActionsPanelProps = {
  showEnrollmentCodeInput?: boolean;
  enrollmentCodeInput: string;
  canEditEnrollmentCode: boolean;
  actionLoading: boolean;
  accountsLoading: boolean;
  canGenerateCode: boolean;
  canGenerateEnrollment: boolean;
  canValidateEnrollment: boolean;
  isValidateDisabled?: boolean;
  canDeactivateEnrollment: boolean;
  canUnsubscribeEnrollment: boolean;
  canConfirmUnsubscription: boolean;
  canDeleteEnrollment: boolean;
  hasLoadedCouplageAccounts: boolean;
  couplageAccounts: CouplageAccountView[];
  availableSubscriptions?: SubscriptionResponse[];
  selectedSubscriptionId?: string;
  isLoadingSubscriptions?: boolean;
  onSubscriptionChange?: (subscriptionId: string) => void;
  onEnrollmentCodeChange: (value: string) => void;
  onGenerateCode: () => void;
  onValidateEnrollment: () => void;
  onDeactivateEnrollment: () => void;
  onUnsubscribeEnrollment: () => void;
  onConfirmUnsubscription: () => void;
  onDeleteEnrollment: () => void;
};

const EnrollmentActionsPanel = ({
  showEnrollmentCodeInput = true,
  enrollmentCodeInput,
  canEditEnrollmentCode,
  actionLoading,
  accountsLoading,
  canGenerateCode,
  canGenerateEnrollment,
  canValidateEnrollment,
  isValidateDisabled = false,
  canDeactivateEnrollment,
  canUnsubscribeEnrollment,
  canConfirmUnsubscription,
  canDeleteEnrollment,
  hasLoadedCouplageAccounts,
  couplageAccounts,
  availableSubscriptions = [],
  selectedSubscriptionId = "",
  isLoadingSubscriptions = false,
  onSubscriptionChange,
  onEnrollmentCodeChange,
  onGenerateCode,
  onValidateEnrollment,
  onDeactivateEnrollment,
  onUnsubscribeEnrollment,
  onConfirmUnsubscription,
  onDeleteEnrollment,
}: EnrollmentActionsPanelProps) => {
  const readOnlyInputClassName = "focus-visible:ring-0 focus-visible:ring-offset-0";
  const hasVisibleCodeInputs = showEnrollmentCodeInput;
  const hasVisibleActionButtons =
    canValidateEnrollment
    || canDeactivateEnrollment
    || canUnsubscribeEnrollment
    || canConfirmUnsubscription
    || canDeleteEnrollment;
  const hasVisibleCouplageSection =
    accountsLoading
    || hasLoadedCouplageAccounts
    || couplageAccounts.length > 0;

  if (!hasVisibleCodeInputs && !hasVisibleActionButtons && !hasVisibleCouplageSection) {
    return null;
  }

  let enrollmentCodeInputClassName: string | undefined;
  if (canGenerateEnrollment) {
    enrollmentCodeInputClassName = "pr-11";
  } else if (!canEditEnrollmentCode) {
    enrollmentCodeInputClassName = readOnlyInputClassName;
  }

  const showSubscriptionSelect = canGenerateEnrollment && availableSubscriptions && availableSubscriptions.length > 0;

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 ${showSubscriptionSelect ? "sm:grid-cols-2" : ""} gap-3 sm:max-w-md`}>
        {showEnrollmentCodeInput && (
          <div className="space-y-1.5">
            <Label>Code enrôlement</Label>
            <div className="relative">
              <Input
                value={enrollmentCodeInput}
                readOnly={!canEditEnrollmentCode}
                onChange={(event) => onEnrollmentCodeChange(event.target.value)}
                onMouseDown={(event) => {
                  if (canEditEnrollmentCode) {
                    return;
                  }
                  event.preventDefault();
                }}
                onFocus={(event) => {
                  if (!canEditEnrollmentCode) {
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Ex: 8431"
                className={enrollmentCodeInputClassName}
              />
              {canGenerateEnrollment && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onGenerateCode}
                  disabled={actionLoading || !canGenerateCode}
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  aria-label="Générer un code enrôlement"
                  title="Générer un code enrôlement"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {showSubscriptionSelect && (
          <div className="space-y-1.5">
            <Label>Abonnement *</Label>
            <Select
              value={selectedSubscriptionId || ""}
              onValueChange={onSubscriptionChange}
              disabled={actionLoading || isLoadingSubscriptions}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner un abonnement" />
              </SelectTrigger>
              <SelectContent>
                {availableSubscriptions.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canValidateEnrollment && (
          <Button
            onClick={onValidateEnrollment}
            disabled={actionLoading || isValidateDisabled}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            Valider enrôlement
          </Button>
        )}
        {canDeactivateEnrollment && (
          <Button
            variant="destructive"
            onClick={onDeactivateEnrollment}
            disabled={actionLoading}
          >
            Désactivation
          </Button>
        )}
        {canUnsubscribeEnrollment && (
          <Button
            variant="destructive"
            onClick={onUnsubscribeEnrollment}
            disabled={actionLoading}
          >
            Désinscription
          </Button>
        )}
        {canConfirmUnsubscription && (
          <Button
            onClick={onConfirmUnsubscription}
            disabled={actionLoading}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            Valider désinscription
          </Button>
        )}
        {canDeleteEnrollment && (
          <Button
            variant="destructive"
            onClick={onDeleteEnrollment}
            disabled={actionLoading}
          >
            Supprimer
          </Button>
        )}
      </div>

      {accountsLoading && (
        <p className="text-xs text-muted-foreground">Chargement des comptes du couplage...</p>
      )}

      {hasLoadedCouplageAccounts && !accountsLoading && (
        <p className="text-xs text-muted-foreground">
          {couplageAccounts.length} compte(s) trouvé(s)
        </p>
      )}

      {hasLoadedCouplageAccounts && couplageAccounts.length === 0 && !accountsLoading && (
        <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">
          Aucun compte trouvé pour ce couplage.
        </div>
      )}

      {couplageAccounts.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-muted-foreground">Comptes du couplage</p>
          <div className="space-y-2">
            {couplageAccounts.map((account, index) => (
              <div key={`${account.accountNumber || "account"}-${index}`} className="rounded-md border border-border p-2 text-xs">
                <p><span className="text-muted-foreground">Numéro:</span> {account.accountNumber || "-"}</p>
                <p><span className="text-muted-foreground">Libellé:</span> {account.accountLabel || "-"}</p>
                <p><span className="text-muted-foreground">Type:</span> {account.accountType || "-"}</p>
                <p><span className="text-muted-foreground">Titulaire:</span> {account.accountHolder || "-"}</p>
                <p><span className="text-muted-foreground">Devise:</span> {account.currency || "-"}</p>
                <p><span className="text-muted-foreground">IBAN ref:</span> {account.referenceIban || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentActionsPanel;
