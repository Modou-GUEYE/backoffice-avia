import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Edit, Loader2, MoreHorizontal, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { PartenaireRead } from "../../models/types";

type PartenairesDataTableProps = {
  filtered: PartenaireRead[];
  loading: boolean;
  error: string | null;
  getDisplayName: (p: PartenaireRead) => string;
  openDetail: (p: PartenaireRead) => void;
  openEdit: (p: PartenaireRead) => void;
  confirmToggle: (p: PartenaireRead) => void;
  confirmDelete: (p: PartenaireRead) => void;
};

export const PartenairesDataTable: React.FC<PartenairesDataTableProps> = ({
  filtered,
  loading,
  error,
  getDisplayName,
  openDetail,
  openEdit,
  confirmToggle,
  confirmDelete,
}) => {
  const list = filtered || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      <div className="overflow-y-auto max-h-[60vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Nom / Libellé</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Catégorie</TableHead>
              <TableHead className="font-semibold">E-mail</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des partenaires…
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Aucun partenaire trouvé
                </TableCell>
              </TableRow>
            ) : (
              list.map((p) => (
                <TableRow
                  key={p.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(p)}
                >
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      onClick={() => openDetail(p)}
                      className="text-left font-semibold text-foreground hover:text-accent transition-colors hover:underline"
                      title="Voir les détails"
                    >
                      {getDisplayName(p)}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {p.categorie}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        p.statut === "actif"
                          ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
                          : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                      }
                      variant="outline"
                    >
                      {p.statut === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmToggle(p)}>
                          {p.statut === "actif" ? (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-2" /> Désactiver
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-4 w-4 mr-2" /> Activer
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => confirmDelete(p)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default PartenairesDataTable;
