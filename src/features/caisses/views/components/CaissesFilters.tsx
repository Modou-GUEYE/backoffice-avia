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
import { AgencyParentType } from "@/features/agences/models/types";

interface CaissesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterAgencyId: string;
  onFilterAgencyIdChange: (value: string) => void;
  onAgencyDropdownOpen?: () => void;
  filterStatut: string;
  onFilterStatutChange: (value: string) => void;
  filterParentType: "all" | AgencyParentType;
  onFilterParentTypeChange: (value: "all" | AgencyParentType) => void;
  agenceOptions: Array<{ id: string; nom: string }>;
}

export const CaissesFilters: React.FC<CaissesFiltersProps> = ({
  search,
  onSearchChange,
  filterAgencyId,
  onFilterAgencyIdChange,
  onAgencyDropdownOpen,
  filterStatut,
  onFilterStatutChange,
  filterParentType,
  onFilterParentTypeChange,
  agenceOptions,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-xl p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, code ou caissier..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background/50"
            aria-label="Rechercher par nom, code ou caissier"
          />
        </div>

        <Select
          value={filterParentType}
          onValueChange={(val) => onFilterParentTypeChange(val as "all" | AgencyParentType)}
        >
          <SelectTrigger className="bg-background/50" aria-label="Filtrer par type de parent">
            <SelectValue placeholder="Type de parent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="STRUCTURE">Structures</SelectItem>
            <SelectItem value="DISTRIBUTOR">Distributeurs</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterAgencyId}
          onValueChange={onFilterAgencyIdChange}
          onOpenChange={(open) => {
            if (open && onAgencyDropdownOpen) {
              onAgencyDropdownOpen();
            }
          }}
        >
          <SelectTrigger className="bg-background/50" aria-label="Filtrer par agence">
            <SelectValue placeholder="Agence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            {agenceOptions.map((agency) => (
              <SelectItem key={agency.id} value={agency.id}>
                {agency.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatut} onValueChange={onFilterStatutChange}>
          <SelectTrigger className="bg-background/50" aria-label="Filtrer par statut">
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
