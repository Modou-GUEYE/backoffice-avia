import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { useWorkflows } from "../../viewmodels/useWorkflows";

interface StepApiMappingTabProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
}

export const StepApiMappingTab: React.FC<StepApiMappingTabProps> = ({ workflowsVm }) => {
  const selectedOp = workflowsVm.operations.find(
    (o) => o.id === workflowsVm.stepFormData.integration_operation_id
  );

  // Cibles attendues : depuis mappingContext du serveur, ou depuis le request_schema de l'opération
  const targetsToDisplay = workflowsVm.mappingContext?.targets || (
    selectedOp?.request_schema &&
      typeof selectedOp.request_schema === "object" &&
      selectedOp.request_schema.properties
      ? Object.entries(
        selectedOp.request_schema.properties as Record<string, { type?: string; description?: string }>
      ).map(([key, schema]) => ({
        key,
        label: schema.description || key,
        value_type: schema.type || "string",
        required:
          Array.isArray(selectedOp.request_schema?.required) &&
          selectedOp.request_schema.required.includes(key),
        nullable: false,
      }))
      : []
  );

  // Sources disponibles uniquement depuis mappingContext du serveur
  const sourcesToDisplay = workflowsVm.mappingContext?.sources || [];

  // Propriétés suggérées pour la sortie (output_mapping) depuis response_schema
  const suggestedResponseProps =
    selectedOp?.response_schema &&
      typeof selectedOp.response_schema === "object" &&
      selectedOp.response_schema.properties
      ? Object.keys(selectedOp.response_schema.properties as Record<string, unknown>)
      : [];

  return (
    <div className="space-y-5 m-0">
      <div className="pb-2 border-b border-border/30">
        <h4 className="text-xs font-semibold text-foreground">Catalogue de Mapping (Requête & Réponse)</h4>
      </div>

      {!workflowsVm.stepFormData.integration_operation_id ? (
        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/10 space-y-2">
          <p className="font-semibold text-foreground">Aucune opération d'intégration sélectionnée</p>
          <p>
            Veuillez sélectionner une intégration et une opération dans l'onglet <strong>Général</strong> pour charger le catalogue des sources et cibles de mapping.
          </p>
        </div>
      ) : workflowsVm.isLoadingMappingContext ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto mb-2" />
          Chargement du catalogue de mapping depuis le serveur...
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1. Sources disponibles */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Sources disponibles pour cette étape :
            </span>
            {sourcesToDisplay.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic">
                Aucune source disponible depuis les étapes précédentes ou le contexte workflow.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sourcesToDisplay.map((src) => (
                  <Badge
                    key={src.path}
                    variant="outline"
                    className="text-[10px] font-mono bg-background hover:bg-muted/40 cursor-pointer"
                    title={`${src.label} (${src.value_type}${src.nullable ? ", nullable" : ""})`}
                  >
                    {src.path}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 2. Cibles de la Requête (request_mapping) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Mapping de Requête (request_mapping) :
              </Label>
            </div>

            {targetsToDisplay.length === 0 ? (
              <div className="p-3 text-[11px] text-muted-foreground italic text-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                Aucune cible obligatoire déclarée dans le schéma de requête de cette opération.
              </div>
            ) : (
              <div className="space-y-2">
                {targetsToDisplay.map((tgt) => {
                  const currentMapping = workflowsVm.stepFormData.request_mapping[tgt.key];
                  const currentFrom = currentMapping?.from || "";
                  const currentValue =
                    currentMapping?.value !== undefined ? String(currentMapping.value) : "";

                  return (
                    <div key={tgt.key} className="p-3 rounded-xl border border-border/40 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">{tgt.key}</span>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                            {tgt.value_type}
                          </Badge>
                          {tgt.required && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">
                              Requis
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{tgt.label}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground font-medium">Source dynamique :</span>
                          <select
                            className="w-full h-8 text-xs rounded-lg border border-border/50 bg-background px-2 font-mono"
                            value={currentFrom}
                            onChange={(e) => {
                              const path = e.target.value;
                              workflowsVm.setStepFormData({
                                ...workflowsVm.stepFormData,
                                request_mapping: {
                                  ...workflowsVm.stepFormData.request_mapping,
                                  [tgt.key]: path ? { from: path } : {},
                                },
                              });
                            }}
                          >
                            <option value="">-- Choisir une source --</option>
                            {sourcesToDisplay.map((s) => (
                              <option key={s.path} value={s.path}>
                                {s.path}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground font-medium">Ou valeur constante :</span>
                          <Input
                            className="h-8 text-xs font-mono"
                            placeholder={
                              tgt.value_type === "number" || tgt.value_type === "integer"
                                ? "Ex. 5000"
                                : "Ex. XOF, SUCCESS..."
                            }
                            value={currentValue}
                            disabled={Boolean(currentFrom)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              let typedVal: unknown = raw;
                              if (tgt.value_type === "number" || tgt.value_type === "integer") {
                                if (raw.trim() !== "" && !isNaN(Number(raw))) {
                                  typedVal = Number(raw);
                                }
                              } else if (tgt.value_type === "boolean") {
                                if (raw === "true") typedVal = true;
                                else if (raw === "false") typedVal = false;
                              }
                              workflowsVm.setStepFormData({
                                ...workflowsVm.stepFormData,
                                request_mapping: {
                                  ...workflowsVm.stepFormData.request_mapping,
                                  [tgt.key]: raw !== "" ? { value: typedVal } : {},
                                },
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Mapping de Réponse (output_mapping) */}
          <div className="space-y-2.5 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Mapping de Réponse (output_mapping) :
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => workflowsVm.handleAddOutputMappingEntry()}
              >
                <Plus className="h-3 w-3" /> Ajouter un champ
              </Button>
            </div>

            {/* Suggestions de champs basées sur le schéma de réponse de l'opération */}
            {suggestedResponseProps.length > 0 && (
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30 space-y-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Champs suggérés depuis le contrat de réponse :
                </span>
                <div className="flex flex-wrap gap-1">
                  {suggestedResponseProps.map((prop) => {
                    const isMapped = workflowsVm.stepFormData.output_mapping_entries.some(
                      (e) => e.targetKey === prop || e.from === prop
                    );
                    return (
                      <Badge
                        key={prop}
                        variant={isMapped ? "default" : "outline"}
                        className={`text-[10px] font-mono cursor-pointer transition-all ${
                          isMapped ? "bg-accent/30 text-accent hover:bg-accent/40" : "hover:bg-muted/40"
                        }`}
                        onClick={() => {
                          if (!isMapped) {
                            workflowsVm.handleAddOutputMappingEntry(prop, prop);
                          }
                        }}
                      >
                        {isMapped ? `✓ ${prop}` : `+ ${prop}`}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Liste des champs d'output_mapping */}
            <div className="space-y-2">
              {workflowsVm.stepFormData.output_mapping_entries.length === 0 ? (
                <div className="text-[11px] text-muted-foreground italic p-3 text-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                  Aucun mapping de sortie défini. Cliquez sur <strong>+ Ajouter un champ</strong> ou sur l&apos;une des suggestions ci-dessus.
                </div>
              ) : (
                workflowsVm.stepFormData.output_mapping_entries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/40">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-muted-foreground font-medium">Clé destination dans collected_data :</span>
                      <Input
                        className="h-8 text-xs font-mono"
                        value={entry.targetKey}
                        placeholder="ex: fees, result, transaction_id"
                        onChange={(e) =>
                          workflowsVm.handleUpdateOutputMappingEntry(entry.id, { targetKey: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-muted-foreground font-medium">Chemin dans la réponse API (from) :</span>
                      <Input
                        className="h-8 text-xs font-mono"
                        value={entry.from}
                        placeholder="ex: fees, data.amount, result.id"
                        onChange={(e) =>
                          workflowsVm.handleUpdateOutputMappingEntry(entry.id, { from: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 mt-5 shrink-0"
                      title="Supprimer ce champ"
                      onClick={() => workflowsVm.handleRemoveOutputMappingEntry(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
