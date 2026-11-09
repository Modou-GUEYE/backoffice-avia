import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code,
  Clock,
  Radio,
  Server,
  Tag,
  Globe,
  Settings2,
  ListTree,
} from "lucide-react";
import {
  OperationDialogTab,
  OperationFormData,
  OperationFormField,
  getOperationErrorTab,
  useIntegrations,
} from "../../viewmodels/useIntegrations";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { FormSection } from "./FormSection";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

interface OperationDialogProps {
  integrationsVm: ReturnType<typeof useIntegrations>;
}

const selectClassName =
  "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-semibold focus:outline-none focus:ring-1 focus:ring-accent";

const textareaClassName =
  "w-full text-xs font-mono rounded-lg border border-border/50 bg-muted/20 p-2.5 focus:outline-none focus:ring-1 focus:ring-accent";

export const OperationDialog: React.FC<OperationDialogProps> = ({ integrationsVm }) => {
  const formData = integrationsVm.operationFormData;
  const isEditing = Boolean(integrationsVm.editingOperation);
  const isPolling = formData.completion_mode === "POLLING";
  const isEvent = formData.completion_mode === "EVENT";

  const errors = integrationsVm.operationFormErrors;
  const [activeTab, setActiveTab] = useState<OperationDialogTab>("general");

  // Chaque ouverture du dialogue repart sur l'onglet Général
  useEffect(() => {
    if (integrationsVm.showOperationDialog) setActiveTab("general");
  }, [integrationsVm.showOperationDialog]);

  const updateField = <K extends keyof OperationFormData>(field: K, value: OperationFormData[K]) => {
    integrationsVm.setOperationFormData({ ...formData, [field]: value });
    integrationsVm.clearOperationFormError(field as OperationFormField);
  };

  const handleSave = async () => {
    const validationErrors = await integrationsVm.handleSaveOperation();
    // Affiche l'onglet qui contient le premier champ en erreur
    const errorTab = getOperationErrorTab(validationErrors);
    if (errorTab) setActiveTab(errorTab);
  };

  return (
    <Dialog
      open={integrationsVm.showOperationDialog}
      onOpenChange={integrationsVm.setShowOperationDialog}
    >
      <DialogContent className="sm:max-w-3xl bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {integrationsVm.isSavingOperation && (
          <LoadingOverlay
            title={isEditing ? "Modification de l'opération" : "Création de l'opération"}
            description="Veuillez patienter pendant l'enregistrement de l'opération..."
          />
        )}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <Server className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? "Modifier l'opération" : "Nouvelle opération"}
              </DialogTitle>
              {integrationsVm.selectedIntegration && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-accent/10 text-accent border-accent/25"
                >
                  {integrationsVm.selectedIntegration.label}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? "Modifiez les paramètres de cette opération."
                : "Créez une nouvelle opération pour cette intégration."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as OperationDialogTab)}
          className="w-full flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 pt-3 border-b border-border/30 bg-muted/5">
            <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/40 rounded-lg">
              <TabsTrigger value="general" className="text-xs font-semibold rounded-md">
                Général
              </TabsTrigger>
              <TabsTrigger value="schemas" className="text-xs font-semibold rounded-md flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-accent" /> Schémas JSON
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <TabsContent value="general" className="space-y-4 m-0">
              {/* Identification */}
              <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="opKey" className="text-xs font-semibold">
                      Clé unique <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="opKey"
                      {...invalidFieldProps(errors.key, "h-9 text-xs bg-background font-mono")}
                      placeholder="Ex. calculate-fees"
                      value={formData.key}
                      disabled={isEditing}
                      onChange={(e) => updateField("key", e.target.value)}
                    />
                    <FieldError message={errors.key} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="opLabel" className="text-xs font-semibold">
                      Libellé <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="opLabel"
                      {...invalidFieldProps(errors.label, "h-9 text-xs bg-background")}
                      placeholder="Ex. Calculer les frais de transfert"
                      value={formData.label}
                      onChange={(e) => updateField("label", e.target.value)}
                    />
                    <FieldError message={errors.label} />
                  </div>
                </div>
              </FormSection>

              {/* Requête HTTP */}
              <FormSection icon={<Globe className="h-3.5 w-3.5 text-accent" />} title="Requête HTTP">
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="opMethod" className="text-xs font-semibold">
                      Méthode <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="opMethod"
                      {...invalidFieldProps(errors.method, selectClassName)}
                      value={formData.method}
                      onChange={(e) => updateField("method", e.target.value)}
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <FieldError message={errors.method} />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="opPath" className="text-xs font-semibold">
                      Chemin relatif <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="opPath"
                      {...invalidFieldProps(errors.relative_path, "h-9 text-xs bg-background font-mono")}
                      placeholder="/v1/fees/calculate"
                      value={formData.relative_path}
                      onChange={(e) => updateField("relative_path", e.target.value)}
                    />
                    <FieldError message={errors.relative_path} />
                  </div>
                </div>
              </FormSection>

              {/* Exécution */}
              <FormSection icon={<Settings2 className="h-3.5 w-3.5 text-accent" />} title="Exécution">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="opCompletionMode" className="text-xs font-semibold">
                      Mode de complétion <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="opCompletionMode"
                      {...invalidFieldProps(errors.completion_mode, selectClassName)}
                      value={formData.completion_mode}
                      onChange={(e) => updateField("completion_mode", e.target.value)}
                    >
                      <option value="IMMEDIATE">IMMEDIATE</option>
                      <option value="POLLING">POLLING</option>
                      <option value="EVENT">EVENT</option>
                    </select>
                    <FieldError message={errors.completion_mode} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="opAuthMode" className="text-xs font-semibold">
                      Mode d'autorisation <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="opAuthMode"
                      {...invalidFieldProps(errors.authorization_mode, selectClassName)}
                      value={formData.authorization_mode}
                      onChange={(e) => updateField("authorization_mode", e.target.value)}
                    >
                      <option value="NONE">NONE</option>
                      <option value="FORWARD_BEARER">FORWARD_BEARER</option>
                    </select>
                    <FieldError message={errors.authorization_mode} />
                  </div>
                </div>

                {isPolling && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Paramètres de polling
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="opOperationIdField" className="text-[11px]">Champ Operation ID</Label>
                        <Input
                          id="opOperationIdField"
                          className="h-8 text-xs font-mono bg-background"
                          placeholder="operation_id"
                          value={formData.operation_id_field}
                          onChange={(e) => updateField("operation_id_field", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="opStatusPath" className="text-[11px]">Chemin de statut</Label>
                        <Input
                          id="opStatusPath"
                          className="h-8 text-xs font-mono bg-background"
                          placeholder="/v1/fees/{operation_id}/status"
                          value={formData.status_path}
                          onChange={(e) => updateField("status_path", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isEvent && (
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-3">
                    <div className="text-[11px] font-semibold text-purple-700 flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5" /> Paramètres événement Kafka
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="opEventTopic" className="text-[11px]">Topic événement (optionnel)</Label>
                      <Input
                        id="opEventTopic"
                        className="h-8 text-xs font-mono bg-background"
                        placeholder="packages.integration.events"
                        value={formData.event_topic}
                        onChange={(e) => updateField("event_topic", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="opTimeout" className="text-[11px]">Timeout appel (s)</Label>
                    <Input
                      id="opTimeout"
                      type="number"
                      min={1}
                      className="h-8 text-xs font-mono bg-background"
                      value={formData.timeout_seconds}
                      onChange={(e) => updateField("timeout_seconds", Number(e.target.value))}
                    />
                  </div>
                  {isPolling && (
                    <div className="space-y-1">
                      <Label htmlFor="opPollInterval" className="text-[11px]">Intervalle de polling (s)</Label>
                      <Input
                        id="opPollInterval"
                        type="number"
                        min={1}
                        className="h-8 text-xs font-mono bg-background"
                        value={formData.poll_interval_seconds}
                        onChange={(e) => updateField("poll_interval_seconds", Number(e.target.value))}
                      />
                    </div>
                  )}
                  {(isPolling || isEvent) && (
                    <div className="space-y-1">
                      <Label htmlFor="opCompletionTimeout" className="text-[11px]">Timeout total (s)</Label>
                      <Input
                        id="opCompletionTimeout"
                        type="number"
                        min={1}
                        className="h-8 text-xs font-mono bg-background"
                        value={formData.completion_timeout_seconds}
                        onChange={(e) => updateField("completion_timeout_seconds", Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </FormSection>

              {/* Lecture de la réponse */}
              <FormSection
                icon={<ListTree className="h-3.5 w-3.5 text-accent" />}
                title="Lecture de la réponse"
                description="Champs de la réponse du service contenant le résultat et les erreurs."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="opResultField" className="text-[11px]">Champ résultat</Label>
                    <Input
                      id="opResultField"
                      className="h-8 text-xs font-mono bg-background"
                      placeholder="result"
                      value={formData.result_field}
                      onChange={(e) => updateField("result_field", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="opErrorCodeField" className="text-[11px]">Champ code d'erreur</Label>
                    <Input
                      id="opErrorCodeField"
                      className="h-8 text-xs font-mono bg-background"
                      placeholder="error_code"
                      value={formData.error_code_field}
                      onChange={(e) => updateField("error_code_field", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="opErrorMessageField" className="text-[11px]">Champ message d'erreur</Label>
                    <Input
                      id="opErrorMessageField"
                      className="h-8 text-xs font-mono bg-background"
                      placeholder="error_message"
                      value={formData.error_message_field}
                      onChange={(e) => updateField("error_message_field", e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>
            </TabsContent>

            <TabsContent value="schemas" className="space-y-4 m-0">
              <FormSection
                icon={<Code className="h-3.5 w-3.5 text-accent" />}
                title="Schéma de requête"
                description="JSON Schema des données envoyées au service (request_schema)."
              >
                <textarea
                  id="opRequestSchema"
                  rows={8}
                  {...invalidFieldProps(errors.request_schema_str, textareaClassName)}
                  placeholder='{"type": "object", "required": ["amount", "currency"], "properties": {"amount": {"type": "number"}, "currency": {"type": "string"}}}'
                  value={formData.request_schema_str}
                  onChange={(e) => updateField("request_schema_str", e.target.value)}
                />
                <FieldError message={errors.request_schema_str} />
              </FormSection>

              <FormSection
                icon={<Code className="h-3.5 w-3.5 text-accent" />}
                title="Schéma de réponse"
                description="JSON Schema des données renvoyées par le service (response_schema)."
              >
                <textarea
                  id="opResponseSchema"
                  rows={8}
                  {...invalidFieldProps(errors.response_schema_str, textareaClassName)}
                  placeholder='{"type": "object", "properties": {"result": {"type": "object", "properties": {"fees": {"type": "number"}}}}}'
                  value={formData.response_schema_str}
                  onChange={(e) => updateField("response_schema_str", e.target.value)}
                />
                <FieldError message={errors.response_schema_str} />
              </FormSection>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
          <Button
            variant="ghost"
            onClick={() => integrationsVm.setShowOperationDialog(false)}
            className="text-xs h-9"
          >
            Annuler
          </Button>
          <Button
            className="gradient-accent text-accent-foreground text-xs h-9"
            disabled={integrationsVm.isSavingOperation}
            onClick={() => void handleSave()}
          >
            Enregistrer l'opération
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
