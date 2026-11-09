import type { ReactNode } from "react";
import { Settings, Database, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogPortal,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { useConnectivite } from "../../viewmodels/useConnectivite";

type ConnectiviteVm = ReturnType<typeof useConnectivite>;

/** Valeur du sélecteur quand aucun moyen n'est choisi (Radix interdit la valeur vide) */
const NO_PAYMENT_METHOD = "__NONE__";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

interface EndpointEditDialogProps {
  vm: ConnectiviteVm;
}

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="space-y-3 border-t border-border/40 pt-4 first:border-t-0 first:pt-0">
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
      {hint && <span className="ml-1.5 font-normal normal-case tracking-normal">({hint})</span>}
    </h3>
    {children}
  </section>
);

export const EndpointEditDialog = ({ vm }: EndpointEditDialogProps) => {
  const isDbProc = vm.endpointForm.protocol === "DB_PROC";
  const errors = vm.endpointErrors;
  const isBusy = vm.isLoadingEndpointWiring;

  const levelLabel =
    vm.selectedStructureId === "GLOBAL_DEFAULTS"
      ? "Endpoint par défaut"
      : `Structure ${vm.structures.find((s) => s.id === vm.selectedStructureId)?.name ?? ""}`.trim();

  const isDefaultLevel = vm.selectedStructureId === "GLOBAL_DEFAULTS";
  const wiringHint = {
    STRUCTURE: "Surcharge déjà enregistrée pour cette structure.",
    DEFAULT: isDefaultLevel
      ? "Endpoint par défaut déjà enregistré."
      : "Valeurs héritées de l'endpoint par défaut. Enregistrer crée une surcharge pour la structure.",
    NONE: "Aucun câblage enregistré : enregistrer le crée.",
  }[vm.endpointWiringOrigin];

  const { backend, connection } = vm.getOperationConnection(vm.editingEndpoint?.operationCode ?? "");
  const protocolHint = connection
    ? `Protocole de la connexion ${backend}.`
    : `Connexion${backend ? ` ${backend}` : ""} indisponible à ce niveau : protocole HTTP par défaut.`;

  const setNumber = (field: "timeout_ms" | "retry_max_attempts" | "retry_backoff_ms", fallback: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      vm.setEndpointForm({ ...vm.endpointForm, [field]: e.target.value ? parseInt(e.target.value, 10) : fallback });

  return (
    <Dialog open={!!vm.editingEndpoint} onOpenChange={(open) => !open && vm.handleCancelEditEndpoint()}>
      {vm.isSavingEndpoint && (
        <DialogPortal>
          <LoadingOverlay
            title="Enregistrement de l'endpoint"
            description="Veuillez patienter pendant la configuration de l'endpoint..."
          />
        </DialogPortal>
      )}
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDbProc
              ? <Database className="h-5 w-5 text-accent" />
              : <Settings className="h-5 w-5 text-accent" />}
            Configuration d'endpoint
          </DialogTitle>
          <DialogDescription className="text-xs">
            {vm.endpointForm.op_label} · {levelLabel}
          </DialogDescription>
        </DialogHeader>

        {vm.editingEndpoint && (
          <div className="space-y-4 py-2 text-sm">
            <Section title="Cible">
              {/* Colonne centrale plus large : son libellé porte la mention « facultatif » */}
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] sm:items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Opération</Label>
                  <Select
                    value={vm.editingEndpoint.operationCode}
                    onValueChange={(v) => vm.handleSelectOperationForEdit(v)}
                    disabled={isBusy}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background font-mono font-semibold truncate">
                      <SelectValue placeholder="Sélectionner une opération" />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.operations.map((op) => (
                        <SelectItem key={op.code} value={op.code} className="text-xs font-mono font-semibold">
                          {op.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
                    Moyen de paiement
                    <span className="font-normal text-muted-foreground">(facultatif)</span>
                    {isBusy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="Chargement du câblage" />}
                  </Label>
                  <Select
                    value={vm.endpointPaymentMethodCode || NO_PAYMENT_METHOD}
                    onValueChange={(v) => v && vm.handleSelectEndpointPaymentMethod(v === NO_PAYMENT_METHOD ? "" : v)}
                    disabled={isBusy}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background truncate">
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PAYMENT_METHOD} className="text-xs">Aucun</SelectItem>
                      {vm.paymentMethods.map((pm) => (
                        <SelectItem key={pm.code} value={pm.code} className="text-xs">
                          {pm.label || pm.code}
                          {pm.is_active === false ? " (inactif)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Protocole</Label>
                  {/* Lecture seule : le protocole est celui de la connexion du backend de l'opération */}
                  <div className="h-9 flex items-center rounded-md border border-input bg-muted/40 px-3 text-xs font-semibold">
                    {isDbProc ? "Procédure stockée" : "HTTP"}
                  </div>
                </div>
              </div>
              {!isBusy && (
                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                  <p>{wiringHint}</p>
                  <p>{protocolHint}</p>
                </div>
              )}
            </Section>

            {!isDbProc ? (
              <Section title="Appel HTTP">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="space-y-1 sm:w-32 shrink-0">
                    <Label className="text-xs font-medium">Méthode</Label>
                    <Select value={vm.endpointForm.http_method} onValueChange={(v) => vm.setEndpointForm({ ...vm.endpointForm, http_method: v })}>
                      <SelectTrigger className="h-9 text-xs bg-background font-mono font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((method) => (
                          <SelectItem key={method} value={method} className="text-xs font-mono font-semibold">{method}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-xs font-medium">Chemin (CBS) <span className="text-destructive">*</span></Label>
                    <Input
                      type="text"
                      {...invalidFieldProps(errors.path, "h-9 text-xs bg-background font-mono px-3 w-full")}
                      value={vm.endpointForm.path || ""}
                      onChange={(e) => {
                        vm.setEndpointForm({ ...vm.endpointForm, path: e.target.value });
                        vm.clearEndpointError("path");
                      }}
                      placeholder="Ex: /api/amb/mobile_banking/account/kyc_request"
                    />
                    <FieldError message={errors.path} />
                  </div>
                </div>
              </Section>
            ) : (
              <Section title="Procédure stockée">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Nom de la procédure <span className="text-destructive">*</span></Label>
                    <Input
                      type="text"
                      {...invalidFieldProps(errors.procedure, "h-9 text-xs bg-background font-mono px-3 w-full")}
                      value={vm.endpointForm.procedure || ""}
                      onChange={(e) => {
                        vm.setEndpointForm({ ...vm.endpointForm, procedure: e.target.value });
                        vm.clearEndpointError("procedure");
                      }}
                      placeholder="Ex: PKG_PAYMENTS.PROCESS_DEBIT"
                    />
                    <FieldError message={errors.procedure} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Paramètres positionnels</Label>
                    <Input
                      type="text"
                      className="h-9 text-xs bg-background font-mono px-3 w-full"
                      value={(vm.endpointForm.parameters || []).join(", ")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const params = raw ? raw.split(",").map((p) => p.trim()).filter(Boolean) : [];
                        vm.setEndpointForm({ ...vm.endpointForm, parameters: params });
                      }}
                      placeholder="Ex: amount, currency, account_id"
                    />
                  </div>
                </div>
              </Section>
            )}

            <Section title="Mapping des champs" hint="facultatif">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Requête (AVIA → SI)</Label>
                  <Textarea
                    {...invalidFieldProps(errors.field_mapping, "text-xs font-mono min-h-[96px] bg-background border-border")}
                    value={vm.endpointForm.field_mapping_string}
                    onChange={(e) => {
                      vm.setEndpointForm({ ...vm.endpointForm, field_mapping_string: e.target.value });
                      vm.clearEndpointError("field_mapping");
                    }}
                    placeholder="{}"
                  />
                  <FieldError message={errors.field_mapping} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Réponse (SI → AVIA)</Label>
                  <Textarea
                    {...invalidFieldProps(errors.response_field_mapping, "text-xs font-mono min-h-[96px] bg-background border-border")}
                    value={vm.endpointForm.response_field_mapping_string || "{}"}
                    onChange={(e) => {
                      vm.setEndpointForm({ ...vm.endpointForm, response_field_mapping_string: e.target.value });
                      vm.clearEndpointError("response_field_mapping");
                    }}
                    placeholder="{}"
                  />
                  <FieldError message={errors.response_field_mapping} />
                </div>
              </div>
            </Section>

            <Section title="Exécution">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Timeout (ms)</Label>
                  <Input type="number" min={50} className="h-9 text-xs bg-background font-mono" value={vm.endpointForm.timeout_ms ?? 5000} onChange={setNumber("timeout_ms", 5000)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Tentatives max</Label>
                  <Input type="number" min={0} max={10} className="h-9 text-xs bg-background font-mono" value={vm.endpointForm.retry_max_attempts || 0} onChange={setNumber("retry_max_attempts", 0)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Délai entre essais (ms)</Label>
                  <Input type="number" min={100} className="h-9 text-xs bg-background font-mono" value={vm.endpointForm.retry_backoff_ms || 1000} onChange={setNumber("retry_backoff_ms", 1000)} placeholder="1000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Rejouer sur</Label>
                  <Input
                    type="text"
                    className="h-9 text-xs bg-background font-mono"
                    value={vm.endpointForm.retry_on || ""}
                    onChange={(e) => vm.setEndpointForm({ ...vm.endpointForm, retry_on: e.target.value })}
                    placeholder="502, 503, 504"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Rejeu désactivé à 0 tentative. « Rejouer sur » : codes HTTP séparés par des virgules.
              </p>
              <label className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3 cursor-pointer">
                <span className="space-y-0.5">
                  <span className="block text-xs font-medium text-foreground">Quoteparts de commission acceptées par le SI</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Désactivé : seuls frais et autre_taxe sont transmis au SI.
                  </span>
                </span>
                <Switch
                  checked={vm.endpointForm.supports_commission_split}
                  onCheckedChange={(checked) => vm.setEndpointForm({ ...vm.endpointForm, supports_commission_split: checked })}
                />
              </label>
            </Section>
          </div>
        )}

        <DialogFooter className="gap-3 pt-3 border-t border-border/40 shrink-0 mt-auto sm:justify-between sm:items-center">
          <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
            <Switch
              checked={vm.endpointForm.is_active ?? false}
              onCheckedChange={(checked) => vm.setEndpointForm({ ...vm.endpointForm, is_active: checked })}
            />
            Endpoint actif
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" disabled={vm.isSavingEndpoint} onClick={vm.handleCancelEditEndpoint} className="text-xs">Annuler</Button>
            <Button size="sm" disabled={vm.isSavingEndpoint || isBusy} onClick={vm.handleSaveEndpoint} className="text-xs gradient-accent text-accent-foreground">Enregistrer</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
