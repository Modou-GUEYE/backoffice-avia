import {
  PaymentMethodResponse,
  PaymentMethodFormState,
  MethodKind,
  LoopType,
  BankingBackendType,
} from "../../models/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { PaymentMethodFormField } from "../../viewmodels/usePaymentMethods";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { Upload, Trash2 } from "lucide-react";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  editingItem: PaymentMethodResponse | null;
  form: PaymentMethodFormState;
  setForm: (form: PaymentMethodFormState) => void;
  errors?: FieldErrors<PaymentMethodFormField>;
  onClearError?: (field: PaymentMethodFormField) => void;
  onSave: () => void;
}

export const PaymentMethodDialog = ({
  open,
  onOpenChange,
  isSaving,
  editingItem,
  form,
  setForm,
  errors = {},
  onClearError,
  onSave,
}: PaymentMethodDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {isSaving && (
          <LoadingOverlay
            title={editingItem ? "Modification du moyen de paiement" : "Création du moyen de paiement"}
            description="Veuillez patienter pendant l'enregistrement du moyen de paiement..."
          />
        )}
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Modifier le moyen de paiement" : "Nouveau moyen de paiement"}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? "Mettez à jour les paramètres et les caractéristiques du moyen de paiement."
              : "Créez un nouveau moyen de paiement technique dans le catalogue."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Logo Upload Section */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Logo du moyen de paiement</Label>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-4">
                {form.logo_preview_url && (
                  <div className="h-16 w-16 rounded-xl border bg-background overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={form.logo_preview_url}
                      alt="Aperçu logo moyen de paiement"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <input
                    id="feature-payment-method-logo-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;
                      const nextPreview = URL.createObjectURL(file);
                      setForm({
                        ...form,
                        logo_file: file,
                        logo_preview_url: nextPreview,
                        logo_media_id: "",
                      });
                    }}
                    disabled={isSaving}
                  />

                  {!form.logo_preview_url && (
                    <label
                      htmlFor="feature-payment-method-logo-input"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (!file) return;
                        const nextPreview = URL.createObjectURL(file);
                        setForm({
                          ...form,
                          logo_file: file,
                          logo_preview_url: nextPreview,
                          logo_media_id: "",
                        });
                      }}
                      className="group w-full cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 py-5 px-4 transition-all hover:border-muted-foreground/40 hover:bg-muted/20 block"
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Upload className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <div>
                          <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                            Glissez un fichier ou <span className="underline">cliquez ici</span>
                          </p>
                        </div>
                      </div>
                    </label>
                  )}

                  {form.logo_preview_url && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          ...form,
                          logo_file: null,
                          logo_preview_url: "",
                          logo_media_id: "",
                        });
                        const input = document.getElementById(
                          "feature-payment-method-logo-input",
                        ) as HTMLInputElement | null;
                        if (input) input.value = "";
                      }}
                      className="w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 p-3 transition-all hover:border-destructive/60 hover:bg-destructive/5 group"
                      disabled={isSaving}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                        <div>
                          <p className="text-sm text-muted-foreground group-hover:text-destructive transition-colors font-medium">
                            Retirer le logo
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Code unique <span className="text-destructive">*</span></Label>
              <Input
                placeholder="EX: CARD_VISA, ORANGE_MONEY"
                value={form.code}
                onChange={(e) => {
                  onClearError?.("code");
                  setForm({
                    ...form,
                    code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                  });
                }}
                disabled={Boolean(editingItem)}
                {...invalidFieldProps(errors.code, "font-mono text-xs")}
              />
              <FieldError message={errors.code} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Libellé / Nom <span className="text-destructive">*</span></Label>
              <Input
                placeholder="EX: Carte Bancaire Visa"
                value={form.label}
                onChange={(e) => {
                  onClearError?.("label");
                  setForm({ ...form, label: e.target.value });
                }}
                {...invalidFieldProps(errors.label, "text-xs")}
              />
              <FieldError message={errors.label} />
            </div>
          </div>

          {/* Backend & Kind */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Backend technique <span className="text-destructive">*</span></Label>
              <Select
                value={form.backend}
                onValueChange={(val: BankingBackendType) => {
                  onClearError?.("backend");
                  setForm({ ...form, backend: val });
                }}
              >
                <SelectTrigger {...invalidFieldProps(errors.backend, "text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORE_BANKING">CORE_BANKING (Banque)</SelectItem>
                  <SelectItem value="PI_SPI">PI_SPI (Paiement Instantané)</SelectItem>
                  <SelectItem value="WALLET_ENGINE">WALLET_ENGINE (Portefeuille)</SelectItem>
                  <SelectItem value="CARD_PROCESSOR">CARD_PROCESSOR (Monétique / Cartes)</SelectItem>
                  <SelectItem value="BILLER_HUB">BILLER_HUB (Facturiers)</SelectItem>
                  <SelectItem value="KYC">KYC</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.backend} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type de moyen (Kind) <span className="text-destructive">*</span></Label>
              <Select
                value={form.kind}
                onValueChange={(val: MethodKind) => {
                  onClearError?.("kind");
                  setForm({ ...form, kind: val });
                }}
              >
                <SelectTrigger {...invalidFieldProps(errors.kind, "text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_ACCOUNT">BANK_ACCOUNT (Compte)</SelectItem>
                  <SelectItem value="WALLET">WALLET (Portefeuille)</SelectItem>
                  <SelectItem value="CARD">CARD (Carte)</SelectItem>
                  <SelectItem value="CASH">CASH (Espèces)</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.kind} />
            </div>
          </div>

          {/* Loop Type & KYC Tier */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type de boucle (Loop)</Label>
              <Select
                value={form.loop_type || "NONE"}
                onValueChange={(val) =>
                  setForm({
                    ...form,
                    loop_type: val === "NONE" ? "" : (val as LoopType),
                  })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Non défini" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Non défini</SelectItem>
                  <SelectItem value="OPEN">OPEN (Boucle ouverte)</SelectItem>
                  <SelectItem value="CLOSED">CLOSED (Boucle fermée)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Niveau KYC minimum</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={form.min_kyc_tier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    min_kyc_tier: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="text-xs"
              />
            </div>
          </div>

          {/* Currencies & Supported Operations */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Devises supportées</Label>
              <Input
                placeholder="EX: XOF, EUR, USD (séparées par virgule)"
                value={form.currencies}
                onChange={(e) => setForm({ ...form, currencies: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Opérations supportées</Label>
              <Input
                placeholder="EX: GET_BALANCE, KYC_CHECK, PAY"
                value={form.supported_operations}
                onChange={(e) => setForm({ ...form, supported_operations: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea
              placeholder="Description et notes fonctionnelles sur ce moyen de paiement..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Activer le moyen de paiement</p>
              <p className="text-[11px] text-muted-foreground">
                Rendre ce moyen de paiement éligible pour les packages et règles de routage.
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs"
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="text-xs gradient-accent text-accent-foreground"
          >
            {editingItem ? "Mettre à jour" : "Créer le moyen de paiement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDialog;
