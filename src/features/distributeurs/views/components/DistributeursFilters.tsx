import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DistributeursFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterStructureId: string;
  onFilterStructureIdChange: (value: string) => void;
  filterStatut: string;
  onFilterStatutChange: (value: string) => void;
  structureOptions: Array<{ id: string; nom: string }>;
  singleStructureMode?: boolean;
}

export const DistributeursFilters: React.FC<DistributeursFiltersProps> = ({
  search,
  onSearchChange,
  filterStructureId,
  onFilterStructureIdChange,
  filterStatut,
  onFilterStatutChange,
  structureOptions,
  singleStructureMode = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-xl p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un distributeur..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background/50"
            aria-label="Rechercher un distributeur"
          />
        </div>

        {!singleStructureMode && (
          <Select value={filterStructureId} onValueChange={onFilterStructureIdChange}>
            <SelectTrigger aria-label="Filtrer par structure">
              <SelectValue placeholder="Structure" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les structures</SelectItem>
              {structureOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterStatut} onValueChange={onFilterStatutChange}>
          <SelectTrigger aria-label="Filtrer par statut">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
};
