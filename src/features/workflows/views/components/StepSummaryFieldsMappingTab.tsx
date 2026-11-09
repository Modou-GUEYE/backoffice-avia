import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { stepSummaryFieldErrorKey, useWorkflows } from "../../viewmodels/useWorkflows";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface StepSummaryFieldsMappingTabProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
  stepType: "INFO" | "CONFIRMATION";
}

export const StepSummaryFieldsMappingTab: React.FC<StepSummaryFieldsMappingTabProps> = ({
  workflowsVm,
  stepType,
}) => {
  const isInfo = stepType === "INFO";
  const fields = isInfo
    ? workflowsVm.stepFormData.info_display_fields
    : workflowsVm.stepFormData.confirmation_summary_fields;

  const handleAddField = () => {
    if (isInfo) {
      workflowsVm.handleAddInfoDisplayField();
    } else {
      workflowsVm.handleAddConfirmationSummaryField();
    }
  };

  const handleUpdateField = (
    idx: number,
    partial: { label?: string; from?: string; format?: string; currency?: string }
  ) => {
    if (isInfo) {
      workflowsVm.handleUpdateInfoDisplayField(idx, partial);
    } else {
      workflowsVm.handleUpdateConfirmationSummaryField(idx, partial);
    }
  };

  const handleRemoveField = (idx: number) => {
    if (isInfo) {
      workflowsVm.handleRemoveInfoDisplayField(idx);
    } else {
      workflowsVm.handleRemoveConfirmationSummaryField(idx);
    }
  };

  const sourcesToDisplay = workflowsVm.mappingContext?.sources || [];
  const errors = workflowsVm.stepFormErrors;

  return (
    <div className="space-y-5 m-0">
      <div className="pb-2 border-b border-border/30">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-blue-600" />
          Mapping des données
        </h4>
      </div>

      {/* Liste des sources disponibles */}
      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Sorties disponibles des étapes précédentes (mapping-context) :
        </span>
        {workflowsVm.isLoadingMappingContext ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            Chargement des sources disponibles...
          </div>
        ) : sourcesToDisplay.length === 0 ? (
          <div className="text-[10px] text-muted-foreground italic">
            Aucune étape précédente avec sortie disponible ou workflow sans étapes préalables.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sourcesToDisplay.map((src) => (
              <Badge
                key={src.path}
                variant="outline"
                className="text-[10px] font-mono bg-background hover:bg-muted/40 cursor-pointer"
                title={`${src.path} (${src.value_type}${src.nullable ? ", nullable" : ""})`}
                onClick={() => {
                  const allowed = src.allowed_formats || [];
                  const chosenFmt = allowed[0] || "";
                  const isAmount = chosenFmt === "amount";
                  const newField = {
                    label: src.label || src.step_key || "Champ",
                    from: src.path,
                    format: chosenFmt,
                    currency: isAmount ? "XOF" : "",
                  };
                  if (isInfo) {
                    workflowsVm.setStepFormData({
                      ...workflowsVm.stepFormData,
                      info_display_fields: [
                        ...workflowsVm.stepFormData.info_display_fields,
                        newField,
                      ],
                    });
                  } else {
                    workflowsVm.setStepFormData({
                      ...workflowsVm.stepFormData,
                      confirmation_summary_fields: [
                        ...workflowsVm.stepFormData.confirmation_summary_fields,
                        newField,
                      ],
                    });
                  }
                }}
              >
                + {src.step_key ? `[${src.step_key} > ${src.label}]` : src.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Liste des champs récapitulatifs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">
            Champs récapitulatifs :
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
            onClick={handleAddField}
          >
            <Plus className="h-3 w-3" /> Ajouter un champ
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">
            <p>Aucun champ configuré pour cette étape.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, idx) => {
              const sourceError = errors[stepSummaryFieldErrorKey(idx, "from")];
              const labelError = errors[stepSummaryFieldErrorKey(idx, "label")];
              return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-border/40 bg-card space-y-3 shadow-sm relative group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/20">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                      #{idx + 1}
                    </Badge>
                    {field.label || `Champ ${idx + 1}`}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    title="Supprimer ce champ"
                    onClick={() => handleRemoveField(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-start">
                  {/* Source (Select) */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1 h-4">
                      Source <span className="text-destructive">*</span>
                    </Label>
                    <select
                      aria-label={`Source du champ ${idx + 1}`}
                      {...invalidFieldProps(
                        sourceError,
                        "w-full h-8 text-xs rounded-lg border border-border/50 bg-background px-2 font-mono focus:ring-1 focus:ring-accent"
                      )}
                      value={field.from}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchedSource = sourcesToDisplay.find((s) => s.path === val);
                        const autoLabel = !field.label && matchedSource ? matchedSource.label : field.label;
                        const allowed = matchedSource?.allowed_formats || [];

                        let nextFormat = "";
                        if (field.format && allowed.includes(field.format)) {
                          nextFormat = field.format;
                        } else if (allowed.length > 0) {
                          nextFormat = allowed[0];
                        }

                        const nextCurrency = nextFormat === "amount" ? (field.currency || "XOF") : "";

                        handleUpdateField(idx, {
                          from: val,
                          label: autoLabel,
                          format: nextFormat,
                          currency: nextCurrency,
                        });
                      }}
                    >
                      <option value="">-- Sélectionner une source --</option>
                      {sourcesToDisplay.map((s) => (
                        <option key={s.path} value={s.path}>
                          {s.step_key ? `[${s.step_key} > ${s.label}]` : s.label || s.path}
                        </option>
                      ))}
                    </select>
                    <FieldError message={sourceError} />
                  </div>

                  {/* Format */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1 h-4">
                      Format
                    </Label>
                    {(() => {
                      const matchedSource = sourcesToDisplay.find((s) => s.path === field.from);
                      const allowedFormats = matchedSource?.allowed_formats || [];

                      if (!field.from || allowedFormats.length === 0) {
                        return (
                          <select
                            disabled
                            className="w-full h-8 text-xs rounded-lg border border-border/50 bg-muted/30 px-2 text-muted-foreground cursor-not-allowed"
                            value=""
                          >
                            <option value="">
                              {!field.from ? "-- Choisir une source d'abord --" : "-- Aucun format disponible --"}
                            </option>
                          </select>
                        );
                      }

                      const currentFormat =
                        field.format && allowedFormats.includes(field.format)
                          ? field.format
                          : allowedFormats[0];

                      return (
                        <select
                          className="w-full h-8 text-xs rounded-lg border border-border/50 bg-background px-2 focus:ring-1 focus:ring-accent"
                          value={currentFormat}
                          onChange={(e) => {
                            const nextFmt = e.target.value;
                            handleUpdateField(idx, {
                              format: nextFmt,
                              currency: nextFmt === "amount" ? (field.currency || "XOF") : "",
                            });
                          }}
                        >
                          {allowedFormats.map((fmt) => (
                            <option key={fmt} value={fmt}>
                              {fmt}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <Label className={`text-[11px] font-semibold flex items-center gap-1 h-4 ${field.format === "amount" ? "text-foreground" : "text-muted-foreground/60"}`}>
                      Currency
                    </Label>
                    <Input
                      disabled={field.format !== "amount"}
                      className="h-8 text-xs font-mono uppercase bg-background disabled:opacity-40 disabled:cursor-not-allowed"
                      placeholder={field.format === "amount" ? "XOF" : "—"}
                      value={field.format === "amount" ? (field.currency || "") : ""}
                      onChange={(e) =>
                        handleUpdateField(idx, { currency: e.target.value.toUpperCase() })
                      }
                    />
                  </div>

                  {/* Label */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1 h-4">
                      Label <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      aria-label={`Label du champ ${idx + 1}`}
                      {...invalidFieldProps(labelError, "h-8 text-xs bg-background")}
                      placeholder="Ex. Frais, Total..."
                      value={field.label}
                      onChange={(e) =>
                        handleUpdateField(idx, { label: e.target.value })
                      }
                    />
                    <FieldError message={labelError} />
                  </div>
                </div>

                {field.from && (
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 pt-1">
                    <span className="text-muted-foreground/70">Chemin :</span>
                    <code className="text-accent">{field.from}</code>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
