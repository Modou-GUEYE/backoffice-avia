import React from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFieldCatalog } from "../../viewmodels/useFieldCatalog";
import { FieldTypeDetailDialog } from "./FieldTypeDetailDialog";
import { FieldDefinitionDetailDialog } from "./FieldDefinitionDetailDialog";
import { FieldTypeDialog } from "./FieldTypeDialog";
import { FieldDefinitionDialog } from "./FieldDefinitionDialog";
import { FieldCatalogConfirmationDialogs } from "./FieldCatalogConfirmationDialogs";

interface FieldCatalogTabProps {
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
  hasPerm?: (perm: string) => boolean;
}

export const FieldCatalogTab: React.FC<FieldCatalogTabProps> = ({ fieldCatalogVm, hasPerm }) => {
  const canCreate = hasPerm ? hasPerm("perm.bo.field.create") : true;
  const canUpdate = hasPerm ? hasPerm("perm.bo.field.update") : true;
  const canDelete = hasPerm ? hasPerm("perm.bo.field.delete") : true;

  return (
    <div className="space-y-6 pt-2">
      {/* Top Bar Navigation & Actions */}
      <div className="glass-card rounded-xl border border-border/30 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 gap-1.5 bg-muted/40 rounded-lg border border-border/30">
            <Button
              variant={fieldCatalogVm.catalogSubTab === "types" ? "default" : "ghost"}
              size="sm"
              className={`text-xs h-8 px-3 rounded-md font-semibold transition-all ${
                fieldCatalogVm.catalogSubTab === "types"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
              }`}
              onClick={() => fieldCatalogVm.setCatalogSubTab("types")}
            >
              Types de champs
            </Button>
            <Button
              variant={fieldCatalogVm.catalogSubTab === "definitions" ? "default" : "ghost"}
              size="sm"
              className={`text-xs h-8 px-3 rounded-md font-semibold transition-all ${
                fieldCatalogVm.catalogSubTab === "definitions"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
              }`}
              onClick={() => fieldCatalogVm.setCatalogSubTab("definitions")}
            >
              Définitions de champs
            </Button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={
                fieldCatalogVm.catalogSubTab === "types"
                  ? "Rechercher un type..."
                  : "Rechercher une définition..."
              }
              value={
                fieldCatalogVm.catalogSubTab === "types"
                  ? fieldCatalogVm.typeSearchTerm
                  : fieldCatalogVm.definitionSearchTerm
              }
              onChange={(e) =>
                fieldCatalogVm.catalogSubTab === "types"
                  ? fieldCatalogVm.setTypeSearchTerm(e.target.value)
                  : fieldCatalogVm.setDefinitionSearchTerm(e.target.value)
              }
              className="pl-8 text-xs h-8 bg-background shadow-none border-border/40"
            />
          </div>
        </div>

        {fieldCatalogVm.catalogSubTab === "types" ? (
          canCreate && (
            <Button
              onClick={fieldCatalogVm.handleOpenNewType}
              className="gradient-accent text-accent-foreground rounded-xl shadow-md font-semibold text-xs px-4 h-9 flex items-center gap-2 transition-all hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Nouveau type de champ
            </Button>
          )
        ) : (
          canCreate && (
            <Button
              onClick={fieldCatalogVm.handleOpenNewDefinition}
              className="gradient-accent text-accent-foreground rounded-xl shadow-md font-semibold text-xs px-4 h-9 flex items-center gap-2 transition-all hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Nouvelle définition de champ
            </Button>
          )
        )}
      </div>

      {/* Section 1: Types de Champs (Field Types) - Full Width Table */}
      {fieldCatalogVm.catalogSubTab === "types" && (
        <div className="glass-card rounded-2xl border border-border/30 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50">
                <TableHead className="font-semibold text-xs py-3.5 px-4">Libellé</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4">Clé</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4">Type de valeur</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4">Source de données</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4">Statut</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldCatalogVm.isLoadingTypes ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : fieldCatalogVm.fieldTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-10">
                    Aucun type de champ configuré.
                  </TableCell>
                </TableRow>
              ) : (
                fieldCatalogVm.fieldTypes.map((fieldType) => (
                  <TableRow
                    key={fieldType.id}
                    className="border-border/30 hover:bg-muted/30 transition-all cursor-pointer group"
                    onClick={() => void fieldCatalogVm.handleSelectType(fieldType)}
                  >
                    <TableCell className="py-3 px-4">
                      <div className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                        {fieldType.label}
                      </div>
                      {fieldType.description && (
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          {fieldType.description}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-3 px-4 font-mono text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {fieldType.renderer_key}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 px-4 font-mono text-xs text-foreground">
                      {fieldType.value_type}
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      {fieldType.supports_data_source ? (
                        <Badge variant="default" className="text-[9px] bg-blue-500/15 text-blue-600 border-blue-500/30">
                          Oui
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] bg-muted text-muted-foreground">
                          Non
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      {fieldType.active ? (
                        <Badge variant="default" className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] bg-muted text-muted-foreground">
                          Inactif
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canUpdate && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => fieldCatalogVm.handleOpenEditType(fieldType)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => fieldCatalogVm.handleDeleteType(fieldType.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Section 2: Définitions de Champs (Field Definitions) - Full Width Table */}
      {fieldCatalogVm.catalogSubTab === "definitions" && (
        <div className="glass-card rounded-2xl border border-border/30 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50">
                <TableHead className="font-semibold text-xs py-3.5 px-4">Libellé</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4">Type de champ</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4">Texte indicatif</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4">Obligatoire</TableHead>
                <TableHead className="font-semibold text-xs py-3.5 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldCatalogVm.isLoadingDefinitions ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : fieldCatalogVm.fieldDefinitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-10">
                    Aucune définition de champ configurée dans le dictionnaire.
                  </TableCell>
                </TableRow>
              ) : (
                fieldCatalogVm.fieldDefinitions.map((defItem) => (
                  <TableRow
                    key={defItem.id}
                    className="border-border/30 hover:bg-muted/30 transition-all cursor-pointer group"
                    onClick={() => fieldCatalogVm.setSelectedDefinition(defItem)}
                  >
                    <TableCell className="py-3 px-4">
                      <div className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                        {defItem.label}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4 font-mono text-xs">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {fieldCatalogVm.rawFieldTypes.find((t) => t.id === defItem.field_type_id)?.label ||
                          defItem.field_type_id}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">
                      {defItem.placeholder || "-"}
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      {defItem.required ? (
                        <Badge variant="default" className="text-[9px] px-2 py-0.5">
                          Oui
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] px-2 py-0.5 bg-muted text-muted-foreground">
                          Non
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canUpdate && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => fieldCatalogVm.handleOpenEditDefinition(defItem)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => fieldCatalogVm.handleDeleteDefinition(defItem.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals & Dialogs */}
      <FieldTypeDetailDialog fieldCatalogVm={fieldCatalogVm} />
      <FieldDefinitionDetailDialog fieldCatalogVm={fieldCatalogVm} />
      <FieldTypeDialog fieldCatalogVm={fieldCatalogVm} />
      <FieldDefinitionDialog fieldCatalogVm={fieldCatalogVm} />
      <FieldCatalogConfirmationDialogs fieldCatalogVm={fieldCatalogVm} />
    </div>
  );
};

export default FieldCatalogTab;
