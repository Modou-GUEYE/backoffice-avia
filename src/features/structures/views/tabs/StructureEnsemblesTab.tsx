import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import type { StructureDetailVm } from "./types";

export const StructureEnsemblesTab: React.FC<{ vm: StructureDetailVm }> = ({ vm }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Distributeurs de la structure</h2>
        <p className="text-xs text-muted-foreground">{vm.ensembles.length} distributeur(s)</p>
      </div>

      {/* Filtres Distributeurs */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un distributeur..."
              value={vm.ensembleSearch}
              onChange={(e) => vm.setEnsembleSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select
            value={vm.ensembleStatus}
            onValueChange={vm.setEnsembleStatus}
          >
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
      </div>

      {vm.ensemblesLoading ? (
        <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Chargement des distributeurs...</span>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Distributeur</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.ensembles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucun distributeur associé à cette structure
                  </TableCell>
                </TableRow>
              ) : (
                vm.ensembles.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/dashboard/distributeurs/${e.id}`)}
                  >
                    <TableCell className="font-medium">{e.nom || e.name || "—"}</TableCell>
                    <TableCell>{e.contact_email || "—"}</TableCell>
                    <TableCell>{e.contact_phone || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          e.is_active || e.statut === "actif"
                            ? "bg-accent/15 text-accent border-accent/30"
                            : "bg-destructive/15 text-destructive border-destructive/30"
                        }
                        variant="outline"
                      >
                        {e.is_active || e.statut === "actif" ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-accent p-0 h-auto"
                        onClick={() => navigate(`/dashboard/distributeurs/${e.id}`)}
                      >
                        Voir détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
