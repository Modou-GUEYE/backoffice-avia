import React from "react";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StructureRead } from "@/features/structures/models/types";
import { StructureParamsResponse } from "../../models/types";

interface StructureParamsHeaderProps {
  isStructureAdmin: boolean;
  selectedStructureId: string;
  onSelectStructureId: (id: string) => void;
  structures: StructureRead[];
  isLoadingStructures: boolean;
  structureParams: StructureParamsResponse | null;
  embedded?: boolean;
}

export const StructureParamsHeader: React.FC<StructureParamsHeaderProps> = ({
  isStructureAdmin,
  selectedStructureId,
  onSelectStructureId,
  structures,
  isLoadingStructures,
  structureParams,
  embedded = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {!embedded && <Building2 className="h-5 w-5 text-accent" />}
            Paramètres de Structure
          </h2>
          <p className="text-xs text-muted-foreground">
            Configuration des seuils KYC et du format des comptes bancaires
          </p>
        </div>

        {/* Structure Selector (only for central admin) */}
        {!isStructureAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Structure :</span>
            <Select
              value={selectedStructureId}
              onValueChange={onSelectStructureId}
              disabled={isLoadingStructures}
            >
              <SelectTrigger className="h-9 text-xs w-64 bg-background">
                <SelectValue placeholder="Sélectionner une structure..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL_DEFAULTS" className="text-xs font-semibold text-accent">
                  Valeurs globales par défaut
                </SelectItem>
                {structures.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {structureParams && (
        <div className="flex flex-wrap gap-2 text-[10px] items-center text-muted-foreground pb-2">
          <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-medium">
            Niveau : {structureParams.tenant_level}
          </span>
          {structureParams.badge && (
            <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-medium">
              Badge : {structureParams.badge}
            </span>
          )}
          {structureParams.structure_name && (
            <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-medium">
              Structure : {structureParams.structure_name}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StructureParamsHeader;
