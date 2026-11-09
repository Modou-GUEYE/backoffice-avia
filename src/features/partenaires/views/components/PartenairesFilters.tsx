import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

type PartenairesFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  filterType: string;
  setFilterType: (value: string) => void;
  filterCategorie: string;
  setFilterCategorie: (value: string) => void;
  filterStatut: string;
  setFilterStatut: (value: string) => void;
};

export const PartenairesFilters: React.FC<PartenairesFiltersProps> = ({
  search,
  setSearch,
  filterType,
  setFilterType,
  filterCategorie,
  setFilterCategorie,
  filterStatut,
  setFilterStatut,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="glass-card rounded-xl p-4"
  >
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou libellé..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </div>
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="particulier">Particulier</SelectItem>
          <SelectItem value="entreprise">Entreprise</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterCategorie} onValueChange={setFilterCategorie}>
        <SelectTrigger>
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes catégories</SelectItem>
          <SelectItem value="marchand">Marchand</SelectItem>
          <SelectItem value="facturier">Facturier</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterStatut} onValueChange={setFilterStatut}>
        <SelectTrigger>
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous statuts</SelectItem>
          <SelectItem value="actif">Actif</SelectItem>
          <SelectItem value="inactif">Inactif</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </motion.div>
);

export default PartenairesFilters;
