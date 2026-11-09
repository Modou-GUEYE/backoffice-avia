import { useState } from "react";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { usePaymentMethods } from "../viewmodels/usePaymentMethods";
import {
  PaymentMethodCard,
  PaymentMethodDialog,
  PaymentMethodDetailDialog,
} from "./components";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { Plus, RefreshCw, CreditCard } from "lucide-react";

interface PaymentMethodsPageProps {
  embedded?: boolean;
}

export const PaymentMethodsPage = ({ embedded = false }: PaymentMethodsPageProps) => {
  const { currentPermissions, currentActorRole } = useCurrentActor();
  const vm = usePaymentMethods();
  const [toDelete, setToDelete] = useState<{ id: string; label: string } | null>(null);

  const isTechnicalProfile =
    currentActorRole === "Profil Technique" ||
    Boolean(
      currentPermissions?.some(
        (p) =>
          p === "profile.bo-profil-technique" ||
          p === "profile.bo.profil-technique" ||
          p.toLowerCase().includes("profil-technique")
      )
    );

  const hasPaymentMethodPerm = (action: string) => {
    if (!currentPermissions) return false;
    if (currentPermissions.some((p) => p === "*" || p === "all")) return true;

    const targetActions =
      action === "create"
        ? ["create", "add"]
        : action === "update"
          ? ["update", "edit"]
          : action === "read"
            ? ["read", "list", "view"]
            : [action];

    const aliases = ["payment-method", "payment_method", "payment-methods", "payment_methods"];

    return currentPermissions.some((p) => {
      const lower = p.toLowerCase().trim();
      return aliases.some((alias) =>
        targetActions.some((act) => lower === `perm.bo.${alias}.${act}`)
      );
    });
  };

  const canCreate = hasPaymentMethodPerm("create");
  const canUpdate = hasPaymentMethodPerm("update");
  const canDelete = hasPaymentMethodPerm("delete");
  const canToggleStatus =
    hasPaymentMethodPerm("update") ||
    hasPaymentMethodPerm("activate") ||
    hasPaymentMethodPerm("deactivate");
  const canRead =
    hasPaymentMethodPerm("read") ||
    hasPaymentMethodPerm("list") ||
    isTechnicalProfile;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {embedded ? "Moyens de Paiement Paramétrés" : "Gestion des Moyens de Paiement"}
          </h3>
          <p className="text-muted-foreground text-xs">
            {canCreate || canUpdate
              ? "Configuration, activation et gestion technique des moyens de paiement."
              : "Consultation des moyens de paiement paramétrés en amont."}
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={vm.openAdd}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" /> Nouveau Moyen de Paiement
          </Button>
        )}
      </div>

      {/* Grid of Payment Methods */}
      {vm.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : vm.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl border-border/60 bg-muted/10 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-semibold text-foreground">Aucun moyen de paiement</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aucun moyen de paiement n'a encore été configuré.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vm.items.map((pm) => (
            <PaymentMethodCard
              key={pm.id}
              paymentMethod={pm}
              canRead={canRead}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canToggleStatus={canToggleStatus}
              onToggleStatus={(checked) => canToggleStatus && vm.toggleStatus(pm, checked)}
              onOpenDetail={() => vm.openDetail(pm)}
              onOpenEdit={() => canUpdate && vm.openEdit(pm)}
              onRemove={() => canDelete && setToDelete({ id: pm.id, label: pm.label })}
            />
          ))}
        </div>
      )}

      {/* Payment Method Create / Edit Dialog */}
      {(canCreate || canUpdate) && (
        <PaymentMethodDialog
          open={vm.dialogOpen}
          onOpenChange={vm.setDialogOpen}
          isSaving={vm.isSaving}
          editingItem={vm.editingItem}
          form={vm.form}
          setForm={vm.setForm}
          errors={vm.formErrors}
          onClearError={vm.clearFormError}
          onSave={vm.save}
        />
      )}

      {/* Payment Method Detail Dialog (accessible à tous les profils pour affichage) */}
      <PaymentMethodDetailDialog
        open={vm.detailOpen}
        onOpenChange={vm.setDetailOpen}
        isLoading={vm.isLoadingDetail}
        item={vm.viewingItem}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Supprimer le moyen de paiement"
        description={`Êtes-vous sûr de vouloir supprimer le moyen de paiement « ${toDelete?.label ?? ""} » ?`}
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => {
          if (!toDelete) return;
          const id = toDelete.id;
          setToDelete(null);
          void vm.remove(id);
        }}
      />
    </div>
  );
};

export default PaymentMethodsPage;
