import { Settings, Shield, Layers, Save, Trash2, RefreshCw, Database, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { useConnectivite } from "../../viewmodels/useConnectivite";
import type { ConnectivitePermissions } from "../../models/permissions";
import { connectionOriginLevels } from "../../models/types";

type ConnectiviteVm = ReturnType<typeof useConnectivite>;

interface ConnectionConfigTabProps {
  vm: ConnectiviteVm;
  perms: ConnectivitePermissions["connection"];
}

export const ConnectionConfigTab = ({ vm, perms }: ConnectionConfigTabProps) => {
  const isDbProc = vm.configForm.protocol === "DB_PROC";
  const errors = vm.configErrors;

  const retryPolicy = vm.configForm.retry_policy;
  // Connexion propre à la structure : au moins un champ vient du niveau STRUCTURE (resolved_from)
  const originLevels = vm.bankingConfig ? connectionOriginLevels(vm.bankingConfig) : [];
  const isInheritedConnection = originLevels.length > 0 && !originLevels.includes("STRUCTURE");
  const hasOwnConnection = !!vm.bankingConfig && !isInheritedConnection;
  // CONN_002 : une connexion existe mais l'API ne la renvoie pas car désactivée ; seule la suppression est possible
  const isDisabledHidden = vm.configLoadErrorCode === "CONN_002";
  const canDeleteConnection = hasOwnConnection || isDisabledHidden;
  const structureName =
    vm.structures.find((s) => s.id === vm.selectedStructureId)?.name ?? "la structure";
  const setRetry = (field: "max_attempts" | "backoff_ms", fallback: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      vm.setConfigForm({
        ...vm.configForm,
        retry_policy: { ...retryPolicy, [field]: e.target.value ? parseInt(e.target.value, 10) : fallback },
      });

  // Message de l'API quand la connexion du backend choisi n'a pas pu être lue (404, 409…)
  const loadErrorLine = !vm.isLoadingConfig && vm.configLoadError && (
    <p className="text-xs text-muted-foreground">{vm.configLoadError}</p>
  );

  if (vm.isLoadingConfig) {
    return (
      <div className="text-center py-16 text-xs text-muted-foreground">
        Chargement de la configuration de connexion...
      </div>
    );
  }

  return (
    <div className="space-y-4">
    {loadErrorLine}
    {isInheritedConnection && (
      <p className="text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        Cette structure n'a pas de connexion propre pour ce backend : les valeurs affichées sont héritées de la connexion par défaut (GLOBAL).
        Enregistrer crée la connexion propre de la structure.
      </p>
    )}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Details */}
      <fieldset disabled={!perms.update} className="lg:col-span-2 space-y-6 min-w-0">

        {/* === Protocole === */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-accent" /> Protocole de Connexion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Protocole</Label>
              <Select
                value={vm.configForm.protocol ?? "HTTP"}
                onValueChange={(v) => {
                  vm.setConfigForm({ ...vm.configForm, protocol: v as "HTTP" | "DB_PROC" });
                  vm.clearConfigError("headers");
                  vm.clearConfigError("driver_options");
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP" className="text-xs font-semibold">Mode HTTP</SelectItem>
                  <SelectItem value="DB_PROC" className="text-xs font-semibold">Mode Procédure</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {isDbProc
                  ? "Le backend cible expose des procédures stockées (Oracle, SQL Server…)"
                  : "Le backend cible expose une API HTTP/REST"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Environnement</Label>
              <Select
                value={vm.configForm.environment || "SANDBOX"}
                onValueChange={(v) => vm.setConfigForm({ ...vm.configForm, environment: v as "SANDBOX" | "PRODUCTION" })}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SANDBOX" className="text-xs">Sandbox (Test)</SelectItem>
                  <SelectItem value="PRODUCTION" className="text-xs">Production (Prod)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* === Paramètres de Connexion === */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {isDbProc
              ? <Database className="h-4 w-4 text-accent" />
              : <Settings className="h-4 w-4 text-accent" />}
            {isDbProc ? "Connexion Base de Données" : "Paramètres de Connexion HTTP"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Timeout (ms)</Label>
              <Input
                type="number"
                min={50}
                className="h-9 text-xs bg-background"
                value={vm.configForm.timeout_ms ?? 5000}
                onChange={(e) => vm.setConfigForm({
                  ...vm.configForm,
                  timeout_ms: e.target.value ? parseInt(e.target.value) : 5000
                })}
                placeholder="5000"
              />
            </div>

            {isDbProc && (
              <div className="space-y-1.5">
                <Label className="text-xs">Version moteur DB <span className="text-muted-foreground">(descriptif)</span></Label>
                <Input
                  type="text"
                  className="h-9 text-xs bg-background font-mono"
                  value={vm.configForm.dbms_version || ""}
                  onChange={(e) => vm.setConfigForm({ ...vm.configForm, dbms_version: e.target.value })}
                  placeholder="Ex: 19c, 2019, 15.2"
                />
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">
                {isDbProc ? "Descripteur de connexion" : "URL de base (API Endpoint)"}
              </Label>
              <Input
                type="text"
                className="h-9 text-xs bg-background font-mono"
                value={vm.configForm.base_url || ""}
                onChange={(e) => vm.setConfigForm({ ...vm.configForm, base_url: e.target.value })}
                placeholder={isDbProc ? "oracle://host:1521/SERVICE (sans identifiants)" : "https://api.corebanking.com/v1"}
              />
              {isDbProc && (
                <p className="text-[10px] text-muted-foreground">Descripteur de la base sans identifiants — ceux-ci sont dans auth_secret_ref</p>
              )}
            </div>
          </div>
        </div>

        {/* === Sécurité & Authentification === */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" /> Sécurité &amp; Authentification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Type d'authentification</Label>
              <Select
                value={vm.configForm.auth_type || "NONE"}
                onValueChange={(v) => {
                  vm.setConfigForm({ ...vm.configForm, auth_type: v as typeof vm.configForm.auth_type });
                  vm.clearConfigError("auth_secret_ref");
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-xs">NONE</SelectItem>
                  <SelectItem value="API_KEY" className="text-xs">API_KEY</SelectItem>
                  <SelectItem value="OAUTH2" className="text-xs">OAUTH2</SelectItem>
                  <SelectItem value="MTLS" className="text-xs">MTLS</SelectItem>
                  {isDbProc && (
                    <SelectItem value="DB_CREDENTIALS" className="text-xs">DB_CREDENTIALS</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* auth_secret_ref — commun à tous les types sauf NONE */}
            {vm.configForm.auth_type !== "NONE" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {vm.configForm.auth_type === "DB_CREDENTIALS" ? "Référence credentials DB (Vault)" :
                   vm.configForm.auth_type === "API_KEY" ? "Clé API (Vault ID / Ref)" :
                   vm.configForm.auth_type === "MTLS" ? "Certificat client (Vault ID / Ref)" :
                   "Secret (Vault ID / Ref)"}
                  {" "}<span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  {...invalidFieldProps(errors.auth_secret_ref, "h-9 text-xs bg-background font-mono")}
                  value={vm.configForm.auth_secret_ref || ""}
                  onChange={(e) => {
                    vm.setConfigForm({ ...vm.configForm, auth_secret_ref: e.target.value });
                    vm.clearConfigError("auth_secret_ref");
                  }}
                  placeholder="vault://bank/secret-ref"
                />
                <FieldError message={errors.auth_secret_ref} />
                <p className="text-[10px] text-muted-foreground">Référence opaque vers le vault — jamais le secret en clair</p>
              </div>
            )}
          </div>
        </div>

        {/* === Politique de rejeu === */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-accent" /> Politique de rejeu
            <span className="text-xs font-normal text-muted-foreground">(facultatif)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tentatives max</Label>
              <Input type="number" min={0} max={10} className="h-9 text-xs bg-background font-mono" value={retryPolicy?.max_attempts ?? 0} onChange={setRetry("max_attempts", 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Délai entre essais (ms)</Label>
              <Input type="number" min={100} className="h-9 text-xs bg-background font-mono" value={retryPolicy?.backoff_ms ?? 1000} onChange={setRetry("backoff_ms", 1000)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rejouer sur</Label>
              <Input
                type="text"
                className="h-9 text-xs bg-background font-mono"
                value={vm.retryOnString}
                onChange={(e) => vm.setRetryOnString(e.target.value)}
                placeholder="502, 503, 504"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Rejeu désactivé à 0 tentative. « Rejouer sur » : codes HTTP séparés par des virgules.
          </p>
        </div>
      </fieldset>

      {/* Headers & Driver Options & Action */}
      <div className="space-y-6">
        <div className="glass-card rounded-xl p-5 space-y-4 flex flex-col h-full justify-between">
          <fieldset disabled={!perms.update} className="space-y-4 min-w-0">
            {/* En-têtes HTTP — HTTP uniquement */}
            {!isDbProc && (
              <>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" /> En-têtes HTTP par défaut
                </h3>
                <div className="space-y-1.5">
                  <Label className="text-xs">En-têtes HTTP (Format JSON)</Label>
                  <Textarea
                    {...invalidFieldProps(errors.headers, "text-xs font-mono min-h-[120px] bg-background border-border")}
                    value={vm.headersString}
                    onChange={(e) => {
                      vm.setHeadersString(e.target.value);
                      vm.clearConfigError("headers");
                    }}
                    placeholder={`{\n  "X-Partner-ID": "avia",\n  "Accept": "application/json"\n}`}
                  />
                  <FieldError message={errors.headers} />
                </div>
              </>
            )}

            {/* Options pilote — DB_PROC uniquement */}
            {isDbProc && (
              <>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Database className="h-4 w-4 text-accent" /> Options pilote DB
                </h3>
                <div className="space-y-1.5">
                  <Label className="text-xs">Driver options (Format JSON)</Label>
                  <Textarea
                    {...invalidFieldProps(errors.driver_options, "text-xs font-mono min-h-[120px] bg-background border-border")}
                    value={vm.driverOptionsString}
                    onChange={(e) => {
                      vm.setDriverOptionsString(e.target.value);
                      vm.clearConfigError("driver_options");
                    }}
                    placeholder={`{\n  "service_name": "ORCLPDB",\n  "encoding": "UTF-8"\n}`}
                  />
                  <FieldError message={errors.driver_options} />
                  <p className="text-[10px] text-muted-foreground">Paramètres transmis tels quels au pilote (clés dépendantes du DBMS)</p>
                </div>
              </>
            )}

            <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/5">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block">Activer la liaison</span>
                <span className="text-[10px] text-muted-foreground block leading-tight">
                  {isDbProc ? "Activer les appels vers ce backend DB" : "Activer les appels vers ce Core"}
                </span>
              </div>
              <Switch
                checked={vm.configForm.is_active ?? false}
                onCheckedChange={(checked) => vm.setConfigForm({ ...vm.configForm, is_active: checked })}
              />
            </div>
          </fieldset>

          {(perms.update || perms.delete) && (
          <div className="pt-4">
            <div className="flex gap-2">
              {perms.update && (
              <Button
                onClick={vm.handleSaveConfig}
                disabled={vm.isSavingConfig}
                className="gradient-accent text-accent-foreground flex-1 hover:opacity-90 flex items-center justify-center gap-2 font-medium py-2 shadow-md text-xs h-9"
              >
                {vm.isSavingConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Enregistrer la connexion
              </Button>
              )}
              {perms.delete && vm.selectedStructureId !== "GLOBAL_DEFAULTS" && (
                <Button
                  variant="outline"
                  onClick={() => vm.setConfirmingDeleteConnection(true)}
                  disabled={vm.isSavingConfig || !canDeleteConnection}
                  className="text-destructive hover:text-destructive h-9"
                  title="Supprimer la connexion de la structure"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>

    <Dialog open={vm.isConfirmingDeleteConnection} onOpenChange={vm.setConfirmingDeleteConnection}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Supprimer la connexion {vm.selectedBackend}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {isDisabledHidden
              ? `La connexion propre de ${structureName} est désactivée : l'API ne la renvoie pas, son contenu ne peut donc pas être affiché.`
              : `La connexion propre de ${structureName} sera supprimée.`}{" "}
            La structure héritera ensuite de la connexion par défaut (GLOBAL), si elle existe.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" disabled={vm.isSavingConfig} onClick={() => vm.setConfirmingDeleteConnection(false)} className="text-xs">
            Annuler
          </Button>
          <Button variant="destructive" size="sm" disabled={vm.isSavingConfig} onClick={vm.handleDeleteConnection} className="text-xs">
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
};
