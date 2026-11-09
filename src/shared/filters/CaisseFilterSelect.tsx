import { Landmark, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaisseFilterOption } from "./useCaisseFilterOptions";

type CaisseFilterSelectProps = {
  value?: string;
  options: CaisseFilterOption[];
  /** Caisse imposée par le périmètre (caissier). */
  lockedCaisseId?: string | null;
  needsAgency: boolean;
  onChange: (value: string | undefined) => void;
  triggerClassName?: string;
};

/** Filtre Caisse du Reporting (caisse_id) : caisses de l'agence choisie, verrouillé pour un caissier. */
export const CaisseFilterSelect = ({
  value,
  options,
  lockedCaisseId,
  needsAgency,
  onChange,
  triggerClassName = "h-9 text-xs bg-background",
}: CaisseFilterSelectProps) => (
  <Select
    value={value || lockedCaisseId || "all"}
    onValueChange={(next) => onChange(next === "all" ? undefined : next)}
    disabled={Boolean(lockedCaisseId) || needsAgency}
  >
    <SelectTrigger className={triggerClassName} aria-label="Caisse" title={needsAgency ? "Choisissez d'abord une agence" : undefined}>
      <div className="flex items-center gap-1.5 truncate">
        {lockedCaisseId ? (
          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <Landmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <SelectValue placeholder={needsAgency ? "Choisir d'abord une agence" : "Toutes les caisses"} />
      </div>
    </SelectTrigger>
    <SelectContent>
      {!lockedCaisseId && (
        <SelectItem value="all" className="text-xs">
          {needsAgency ? "Choisir d'abord une agence" : "Toutes les caisses"}
        </SelectItem>
      )}
      {options.map((caisse) => (
        <SelectItem key={caisse.id} value={caisse.id} className="text-xs">
          {caisse.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default CaisseFilterSelect;
