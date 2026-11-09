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

export const StructureCaissesTab: React.FC<{ vm: StructureDetailVm }> = ({ vm }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Caisses rattachées à la structure</h2>
        <p className="text-xs text-muted-foreground">{vm.caisses.length} caisse(s)</p>
      </div>

      {/* Filtres Caisses */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou code..."
              value={vm.caisseSearch}
              onChange={(e) => vm.setCaisseSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select
            value={vm.caisseStatus}
            onValueChange={vm.setCaisseStatus}
          >
            <SelectTrigger aria-label="Filtrer par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {vm.caissesLoading ? (
        <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Chargement des caisses...</span>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Agence de rattachement</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.caisses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucune caisse associée à cette structure
                  </TableCell>
                </TableRow>
              ) : (
                vm.caisses.map((c) => {
                  const agency = vm.agences.find((a) => a.id === c.agency_id);
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => navigate(`/dashboard/agences/${c.agency_id}`)}
                    >
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{agency ? agency.name : c.agency_id}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.is_active
                              ? "bg-accent/15 text-accent border-accent/30"
                              : "bg-destructive/15 text-destructive border-destructive/30"
                          }
                          variant="outline"
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-accent p-0 h-auto"
                          onClick={() => navigate(`/dashboard/agences/${c.agency_id}`)}
                        >
                          Voir agence
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
