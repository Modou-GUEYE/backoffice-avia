import React from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StructureParamsActionsProps {
  canSave: boolean;
  canReset: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
}

export const StructureParamsActions: React.FC<StructureParamsActionsProps> = ({
  canSave,
  canReset,
  isSaving,
  onReset,
  onSave,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-card rounded-xl md:col-span-2">
      {canReset ? (
        <Button
          variant="outline"
          onClick={onReset}
          disabled={isSaving}
          className="text-xs h-9 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-500"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Réinitialiser aux valeurs globales
        </Button>
      ) : (
        <span />
      )}

      {canSave && (
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="gradient-accent text-accent-foreground hover:opacity-90 flex items-center gap-2 font-medium py-2 px-6 shadow-md"
        >
          <Save className="h-4 w-4" />
          Enregistrer les paramètres
        </Button>
      )}
    </div>
  );
};

export default StructureParamsActions;
