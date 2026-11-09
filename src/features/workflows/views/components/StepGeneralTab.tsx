import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle2, Server, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RuntimeOutputEntry, runtimeOutputErrorKey, useWorkflows } from "../../viewmodels/useWorkflows";
import { KNOWN_RUNTIME_OUTPUT_KEYS, RUNTIME_OUTPUT_VALUE_TYPES, RuntimeOutputValueType, StepType } from "../../models/workflowsTypes";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface StepGeneralTabProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
}

const CUSTOM_KEY = "__custom__";

export const StepGeneralTab: React.FC<StepGeneralTabProps> = ({ workflowsVm }) => {
  const isApi = workflowsVm.stepFormData.step_type === "API";
  const isInfo = workflowsVm.stepFormData.step_type === "INFO";
  const isConfirmation = workflowsVm.stepFormData.step_type === "CONFIRMATION";
  const isForm = workflowsVm.stepFormData.step_type === "FORM";
  const errors = workflowsVm.stepFormErrors;

  const runtimeOutputs = workflowsVm.stepFormData.runtime_outputs;
  const setRuntimeOutputs = (next: RuntimeOutputEntry[]) =>
    workflowsVm.setStepFormData({ ...workflowsVm.stepFormData, runtime_outputs: next });
  const updateRuntimeOutput = (id: string, partial: Partial<RuntimeOutputEntry>, index: number) => {
    workflowsVm.clearStepFormError(runtimeOutputErrorKey(index));
    setRuntimeOutputs(runtimeOutputs.map((o) => (o.id === id ? { ...o, ...partial } : o)));
  };

  return (
    <div className="space-y-4 m-0">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="stepKey" className="text-xs font-semibold flex items-center gap-1">
            Clé de l'étape <span className="text-destructive">*</span>
          </Label>
          <Input
            id="stepKey"
            {...invalidFieldProps(errors.step_key, "h-9 text-xs bg-background font-mono focus:ring-accent")}
            placeholder="Ex. step_identity, calculate_fees"
            value={workflowsVm.stepFormData.step_key}
            onChange={(e) => {
              workflowsVm.setStepFormData({
                ...workflowsVm.stepFormData,
                step_key: e.target.value,
              });
              workflowsVm.clearStepFormError("step_key");
            }}
          />
          <FieldError message={errors.step_key} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stepTypeSelect" className="text-xs font-semibold flex items-center gap-1">
            Type d'étape <span className="text-destructive">*</span>
          </Label>
          <select
            id="stepTypeSelect"
            {...invalidFieldProps(
              errors.step_type,
              "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
            )}
            value={workflowsVm.stepFormData.step_type}
            onChange={(e) => {
              const nextType = e.target.value;
              // Les erreurs propres à l'ancien type d'étape ne s'appliquent plus
              workflowsVm.clearStepFormErrorsWhere(
                (key) => key !== "step_key" && key !== "title" && key !== "condition_str" && key !== "next_step_rules_str"
              );
              const nextIsApi = nextType === "API";
              const nextIsInfo = nextType === "INFO";
              const nextIsConfirmation = nextType === "CONFIRMATION";
              const nextIsForm = nextType === "FORM";
              workflowsVm.setStepFormData({
                ...workflowsVm.stepFormData,
                step_type: nextType,
                responsibility: nextIsApi ? "SYSTEM" : "MOBILE",
                execution_mode: nextIsApi ? "INLINE" : "INLINE",
                integration_id: nextIsApi ? workflowsVm.stepFormData.integration_id : "",
                integration_operation_id: nextIsApi ? workflowsVm.stepFormData.integration_operation_id : "",
              });
              if (nextIsForm) {
                void workflowsVm.loadForms();
              }
              if (nextIsApi) {
                void workflowsVm.loadIntegrations();
              }
              if (nextIsApi || nextIsInfo || nextIsConfirmation) {
                if (workflowsVm.selectedWorkflow) {
                  if (workflowsVm.editingStep) {
                    void workflowsVm.loadMappingContext(workflowsVm.selectedWorkflow.id, workflowsVm.editingStep.id);
                  } else {
                    if (nextIsInfo || nextIsConfirmation) {
                      void workflowsVm.loadStepContext(nextType as StepType, null);
                    } else if (nextIsApi && workflowsVm.stepFormData.integration_operation_id) {
                      void workflowsVm.loadStepContext("API", workflowsVm.stepFormData.integration_operation_id);
                    } else {
                      workflowsVm.setMappingContext(null);
                    }
                  }
                }
              } else {
                workflowsVm.setMappingContext(null);
              }
            }}
          >
            <option value="FORM">FORM</option>
            <option value="CONFIRMATION">CONFIRMATION</option>
            <option value="INFO">INFO</option>
            <option value="API">API</option>
          </select>
          <FieldError message={errors.step_type} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stepTitle" className="text-xs font-semibold flex items-center gap-1">
          Titre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="stepTitle"
          {...invalidFieldProps(errors.title, "h-9 text-xs bg-background")}
          placeholder="Ex. Calcul des frais ou Saisie du montant"
          value={workflowsVm.stepFormData.title}
          onChange={(e) => {
            workflowsVm.setStepFormData({ ...workflowsVm.stepFormData, title: e.target.value });
            workflowsVm.clearStepFormError("title");
          }}
        />
        <FieldError message={errors.title} />
      </div>

      {/* Section spécifique FORM */}
      {isForm && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-foreground">
                Configuration de l'Étape FORM
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono">
              MOBILE
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="formSelect" className="text-xs font-semibold">
              Formulaire associé <span className="text-destructive">*</span>
            </Label>
            <select
              id="formSelect"
              {...invalidFieldProps(
                errors.form_id,
                "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-medium focus:outline-none focus:ring-1 focus:ring-accent"
              )}
              value={workflowsVm.stepFormData.form_id}
              onChange={(e) => {
                const newFormId = e.target.value;
                workflowsVm.clearStepFormError("form_id");
                workflowsVm.setStepFormData({
                  ...workflowsVm.stepFormData,
                  form_id: newFormId,
                  config_str: newFormId ? JSON.stringify({ form_id: newFormId }, null, 2) : "",
                });
              }}
              disabled={workflowsVm.isLoadingForms}
            >
              <option value="">-- Sélectionner un formulaire --</option>
              {workflowsVm.forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title} ({f.code})
                </option>
              ))}
            </select>
            <FieldError message={errors.form_id} />
            {workflowsVm.isLoadingForms && (
              <p className="text-[10px] text-muted-foreground italic">
                Chargement des formulaires en cours...
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <Label className="text-xs font-semibold">Valeurs techniques fournies par le mobile</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Valeurs non affichées, transmises avec la soumission de l'étape (ex. identifiant du compte bancaire).
              </p>
            </div>
            {runtimeOutputs.map((output, index) => (
              <div key={output.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  {output.custom ? (
                    <Input
                      aria-label="Clé technique"
                      {...invalidFieldProps(errors[runtimeOutputErrorKey(index)], "h-9 text-xs bg-background font-mono flex-1")}
                      placeholder="ma_cle_technique"
                      value={output.key}
                      onChange={(e) => updateRuntimeOutput(output.id, { key: e.target.value }, index)}
                    />
                  ) : (
                    <select
                      aria-label="Clé technique"
                      {...invalidFieldProps(
                        errors[runtimeOutputErrorKey(index)],
                        "h-9 text-xs rounded-lg border border-border/50 bg-background px-2 font-mono flex-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      )}
                      value={output.key}
                      onChange={(e) => {
                        const key = e.target.value;
                        if (key === CUSTOM_KEY) return updateRuntimeOutput(output.id, { key: "", custom: true }, index);
                        const known = KNOWN_RUNTIME_OUTPUT_KEYS.find((k) => k.key === key);
                        updateRuntimeOutput(output.id, { key, value_type: known?.value_type ?? output.value_type }, index);
                      }}
                    >
                      <option value="">-- Choisir une clé --</option>
                      {KNOWN_RUNTIME_OUTPUT_KEYS.map((k) => (
                        <option
                          key={k.key}
                          value={k.key}
                          disabled={runtimeOutputs.some((o) => o.id !== output.id && o.key === k.key)}
                        >
                          {k.key}
                        </option>
                      ))}
                      <option value={CUSTOM_KEY}>Autre clé…</option>
                    </select>
                  )}
                  <select
                    aria-label="Type de la valeur"
                    className="h-9 text-xs rounded-lg border border-border/50 bg-background px-2 font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                    value={output.value_type}
                    onChange={(e) =>
                      updateRuntimeOutput(output.id, { value_type: e.target.value as RuntimeOutputValueType }, index)
                    }
                  >
                    {RUNTIME_OUTPUT_VALUE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={output.required}
                      onChange={(e) => updateRuntimeOutput(output.id, { required: e.target.checked }, index)}
                    />
                    Obligatoire
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="Supprimer la valeur technique"
                    onClick={() => {
                      workflowsVm.clearStepRuntimeOutputErrors();
                      setRuntimeOutputs(runtimeOutputs.filter((o) => o.id !== output.id));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <FieldError message={errors[runtimeOutputErrorKey(index)]} />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() =>
                setRuntimeOutputs([
                  ...runtimeOutputs,
                  { id: `rt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, key: "", value_type: "string", required: true, custom: false },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une valeur technique
            </Button>
          </div>
        </div>
      )}

      {/* Section spécifique INFO */}
      {isInfo && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-foreground">
                Configuration de l'Étape INFO
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono">
              MOBILE
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="infoMessageGeneral" className="text-xs font-semibold">
              Message principal
            </Label>
            <Input
              id="infoMessageGeneral"
              className="h-8 text-xs bg-background"
              placeholder="Ex. Transfer details"
              value={workflowsVm.stepFormData.info_message}
              onChange={(e) =>
                workflowsVm.setStepFormData({
                  ...workflowsVm.stepFormData,
                  info_message: e.target.value,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Section spécifique CONFIRMATION */}
      {isConfirmation && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-foreground">
                Configuration de l'Étape CONFIRMATION
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono">
              MOBILE
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmationMessageGeneral" className="text-xs font-semibold">
              Message principal
            </Label>
            <Input
              id="confirmationMessageGeneral"
              className="h-8 text-xs bg-background"
              placeholder="Ex. Veuillez confirmer les informations de l'opération"
              value={workflowsVm.stepFormData.confirmation_message}
              onChange={(e) =>
                workflowsVm.setStepFormData({
                  ...workflowsVm.stepFormData,
                  confirmation_message: e.target.value,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Section spécifique API */}
      {isApi && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-foreground">
                Paramètres d'Intégration Technique (API)
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono">
              SYSTEM
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="execMode" className="text-xs font-semibold">
                Mode d'exécution <span className="text-destructive">*</span>
              </Label>
              <select
                id="execMode"
                {...invalidFieldProps(
                  errors.execution_mode,
                  "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                )}
                value={workflowsVm.stepFormData.execution_mode}
                onChange={(e) => {
                  workflowsVm.setStepFormData({
                    ...workflowsVm.stepFormData,
                    execution_mode: e.target.value,
                  });
                  workflowsVm.clearStepFormError("execution_mode");
                }}
              >
                <option value="INLINE">INLINE</option>
                <option value="ASYNC">ASYNC</option>
              </select>
              <FieldError message={errors.execution_mode} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="integrationSelect" className="text-xs font-semibold">
                Système externe (Intégration)
              </Label>
              <select
                id="integrationSelect"
                className="w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                value={workflowsVm.stepFormData.integration_id}
                onChange={(e) => {
                  const newIntegId = e.target.value;
                  workflowsVm.setStepFormData({
                    ...workflowsVm.stepFormData,
                    integration_id: newIntegId,
                    integration_operation_id: "",
                  });
                  if (!workflowsVm.editingStep) {
                    workflowsVm.setMappingContext(null);
                  }
                  void workflowsVm.loadOperations(newIntegId);
                }}
              >
                <option value="">-- Sélectionner une intégration --</option>
                {workflowsVm.integrations.map((integ) => (
                  <option key={integ.id} value={integ.id}>
                    {integ.label || integ.key}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="operationSelect" className="text-xs font-semibold">
              Opération autorisée <span className="text-destructive">*</span>
            </Label>
            <select
              id="operationSelect"
              {...invalidFieldProps(
                errors.integration_operation_id,
                "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-medium focus:outline-none focus:ring-1 focus:ring-accent"
              )}
              value={workflowsVm.stepFormData.integration_operation_id}
              onChange={(e) => {
                const opId = e.target.value;
                workflowsVm.clearStepFormError("integration_operation_id");
                workflowsVm.setStepFormData({
                  ...workflowsVm.stepFormData,
                  integration_operation_id: opId,
                });
                if (workflowsVm.selectedWorkflow) {
                  if (opId) {
                    void workflowsVm.loadStepContext("API", opId);
                  } else {
                    workflowsVm.setMappingContext(null);
                  }
                }
              }}
              disabled={!workflowsVm.stepFormData.integration_id && workflowsVm.operations.length === 0}
            >
              <option value="">-- Sélectionner une opération --</option>
              {workflowsVm.operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label || op.key}
                </option>
              ))}
            </select>
            <FieldError message={errors.integration_operation_id} />
            {workflowsVm.stepFormData.integration_operation_id && (
              (() => {
                const selectedOp = workflowsVm.operations.find(
                  (o) => o.id === workflowsVm.stepFormData.integration_operation_id
                );
                if (!selectedOp) return null;
                return (
                  <div className="p-2 rounded-lg bg-background/80 border border-border/40 text-[11px] space-y-1 mt-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                        {selectedOp.method}
                      </Badge>
                      <span className="font-mono text-accent font-semibold">{selectedOp.relative_path}</span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        {selectedOp.completion_mode}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      Timeout: {selectedOp.timeout_seconds}s | Max total: {selectedOp.completion_timeout_seconds}s
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
};
