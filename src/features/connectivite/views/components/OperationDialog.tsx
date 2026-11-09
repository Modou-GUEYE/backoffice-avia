import { Plus } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { useConnectivite } from "../../viewmodels/useConnectivite";

type ConnectiviteVm = ReturnType<typeof useConnectivite>;

interface OperationDialogProps {
  vm: ConnectiviteVm;
}

export const OperationDialog = ({ vm }: OperationDialogProps) => {
  const errors = vm.operationErrors;
  return (
    <Dialog
      open={vm.isCreatingOperation || !!vm.editingOperation}
      onOpenChange={(open) => !open && vm.handleCancelEditOperation()}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5 text-accent" />
            {vm.isCreatingOperation ? "Ajouter une opération" : "Modifier l'opération"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-2 text-sm">
          {/* Backend */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Backend <span className="text-destructive">*</span></Label>
            <Select
              value={vm.operationForm.backend}
              onValueChange={(backend) => {
                vm.setOperationForm({
                  ...vm.operationForm,
                  backend: backend as "CORE_BANKING" | "PI_SPI" | "WALLET_ENGINE" | "CARD_PROCESSOR" | "BILLER_HUB" | "KYC",
                });
                vm.clearOperationError("backend");
              }}
            >
              <SelectTrigger {...invalidFieldProps(errors.backend, "h-9 text-xs bg-background font-mono")}>
                <SelectValue placeholder="Sélectionner un backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CORE_BANKING" className="text-xs">CORE_BANKING</SelectItem>
                <SelectItem value="PI_SPI" className="text-xs">PI_SPI</SelectItem>
                <SelectItem value="WALLET_ENGINE" className="text-xs">WALLET_ENGINE</SelectItem>
                <SelectItem value="CARD_PROCESSOR" className="text-xs">CARD_PROCESSOR</SelectItem>
                <SelectItem value="BILLER_HUB" className="text-xs">BILLER_HUB</SelectItem>
                <SelectItem value="KYC" className="text-xs">KYC</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={errors.backend} />
          </div>

          {/* Code Opération */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Code Opération (Unique) <span className="text-destructive">*</span></Label>
            <Input
              type="text"
              disabled={!vm.isCreatingOperation}
              {...invalidFieldProps(errors.code, "h-9 text-xs bg-background font-mono uppercase")}
              value={vm.operationForm.code}
              onChange={(e) => {
                vm.setOperationForm({ ...vm.operationForm, code: e.target.value });
                vm.clearOperationError("code");
              }}
              placeholder="EX: TRANSFER_STATUS"
            />
            <FieldError message={errors.code} />
          </div>

          {/* Libellé */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Libellé <span className="text-destructive">*</span></Label>
            <Input
              type="text"
              {...invalidFieldProps(errors.label, "h-9 text-xs bg-background")}
              value={vm.operationForm.label}
              onChange={(e) => {
                vm.setOperationForm({ ...vm.operationForm, label: e.target.value });
                vm.clearOperationError("label");
              }}
              placeholder="Ex: Statut du virement"
            />
            <FieldError message={errors.label} />
          </div>

          {/* Direction */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Direction <span className="text-destructive">*</span></Label>
            <Select
              value={vm.operationForm.direction}
              onValueChange={(direction) => {
                vm.setOperationForm({
                  ...vm.operationForm,
                  direction: direction as "READ" | "DEBIT" | "CREDIT" | "CONTROL",
                });
                vm.clearOperationError("direction");
              }}
            >
              <SelectTrigger {...invalidFieldProps(errors.direction, "h-9 text-xs bg-background")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="READ" className="text-xs">Lecture</SelectItem>
                <SelectItem value="DEBIT" className="text-xs">Débit</SelectItem>
                <SelectItem value="CREDIT" className="text-xs">Crédit</SelectItem>
                <SelectItem value="CONTROL" className="text-xs">Contrôle</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={errors.direction} />
          </div>

          {/* Code compensatoire */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Code compensatoire <span className="text-[10px] text-muted-foreground font-normal">(optionnel)</span>
            </Label>
            <Input
              type="text"
              className="h-9 text-xs bg-background font-mono uppercase"
              value={vm.operationForm.compensating_code}
              onChange={(e) => vm.setOperationForm({ ...vm.operationForm, compensating_code: e.target.value })}
              placeholder="EX: TRANSFER_REVERSAL"
            />
          </div>

          {/* Options Idempotente & Active */}
          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="flex h-9 items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-3">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block leading-tight">Idempotente</span>
              </div>
              <Switch
                checked={vm.operationForm.is_idempotent}
                onCheckedChange={(is_idempotent) => vm.setOperationForm({ ...vm.operationForm, is_idempotent })}
              />
            </div>
            <div className="flex h-9 items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-3">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block leading-tight">Active</span>
              </div>
              <Switch
                checked={vm.operationForm.is_active}
                onCheckedChange={(is_active) => vm.setOperationForm({ ...vm.operationForm, is_active })}
              />
            </div>
          </div>


          {/* Contrat de requête */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Contrat de requête (JSON)</Label>
            <Textarea
              {...invalidFieldProps(
                errors.request_contract,
                "text-xs min-h-[72px] max-h-[100px] bg-background border-border font-mono resize-none",
              )}
              value={vm.operationForm.request_contract}
              onChange={(e) => {
                vm.setOperationForm({ ...vm.operationForm, request_contract: e.target.value });
                vm.clearOperationError("request_contract");
              }}
              placeholder={'{\n  "reference": "string"\n}'}
            />
            <FieldError message={errors.request_contract} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" disabled={vm.isSavingOperation} onClick={vm.handleCancelEditOperation} className="text-xs">
            Annuler
          </Button>
          <Button size="sm" disabled={vm.isSavingOperation} onClick={vm.handleSaveOperation} className="text-xs gradient-accent text-accent-foreground flex items-center gap-1.5">
            {vm.isSavingOperation && <Loader2 className="h-3 w-3 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
