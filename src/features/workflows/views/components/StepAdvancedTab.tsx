import React from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useWorkflows } from "../../viewmodels/useWorkflows";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface StepAdvancedTabProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
}

export const StepAdvancedTab: React.FC<StepAdvancedTabProps> = ({ workflowsVm }) => {
  const isForm = workflowsVm.stepFormData.step_type === "FORM";
  const errors = workflowsVm.stepFormErrors;
  const textareaClassName =
    "w-full text-xs font-mono p-3 rounded-xl bg-muted/20 border border-border/50 focus:outline-none focus:ring-1 focus:ring-accent focus:bg-background transition-all";

  return (
    <div className="space-y-4 m-0">
      {!isForm && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="stepConfig" className="text-xs font-semibold">
              Configuration (JSON)
            </Label>
            <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
              Optionnel
            </Badge>
          </div>
          <textarea
            id="stepConfig"
            rows={4}
            {...invalidFieldProps(errors.config_str, textareaClassName)}
            placeholder='{\n  "request_mapping": {\n    "amount": { "from": "collected_data.amount_entry.amount" },\n    "currency": { "value": "XOF" }\n  },\n  "output_mapping": {\n    "fees": { "from": "fees" }\n  }\n}'
            value={workflowsVm.stepFormData.config_str}
            onChange={(e) => {
              workflowsVm.setStepFormData({
                ...workflowsVm.stepFormData,
                config_str: e.target.value,
              });
              workflowsVm.clearStepFormError("config_str");
            }}
          />
          <FieldError message={errors.config_str} />
          <p className="text-[10px] text-muted-foreground">
            Contient `request_mapping` et `output_mapping` pour les étapes API, ou les paramètres personnalisés.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="stepCondition" className="text-xs font-semibold">
            Condition d'activation (JSON)
          </Label>
          <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
            Optionnel
          </Badge>
        </div>
        <textarea
          id="stepCondition"
          rows={2}
          {...invalidFieldProps(errors.condition_str, textareaClassName)}
          placeholder='{\n  "kyc_level": "LEVEL_2"\n}'
          value={workflowsVm.stepFormData.condition_str}
          onChange={(e) => {
            workflowsVm.setStepFormData({
              ...workflowsVm.stepFormData,
              condition_str: e.target.value,
            });
            workflowsVm.clearStepFormError("condition_str");
          }}
        />
        <FieldError message={errors.condition_str} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="stepNextRules" className="text-xs font-semibold">
            Règles étape suivante (JSON)
          </Label>
          <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
            Optionnel
          </Badge>
        </div>
        <textarea
          id="stepNextRules"
          rows={2}
          {...invalidFieldProps(errors.next_step_rules_str, textareaClassName)}
          placeholder='{\n  "default_next": "step_payment"\n}'
          value={workflowsVm.stepFormData.next_step_rules_str}
          onChange={(e) => {
            workflowsVm.setStepFormData({
              ...workflowsVm.stepFormData,
              next_step_rules_str: e.target.value,
            });
            workflowsVm.clearStepFormError("next_step_rules_str");
          }}
        />
        <FieldError message={errors.next_step_rules_str} />
      </div>
    </div>
  );
};
