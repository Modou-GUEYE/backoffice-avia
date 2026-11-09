import React from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  ArrowUp,
  ArrowDown,
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
import { useForms } from "../../viewmodels/useForms";
import { useFieldCatalog } from "../../viewmodels/useFieldCatalog";
import { FormModalDialog } from "./FormModalDialog";
import { FormFieldDialog } from "./FormFieldDialog";
import { FormConfirmationDialogs } from "./FormConfirmationDialogs";

interface FormsTabProps {
  formsVm: ReturnType<typeof useForms>;
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
  hasPerm?: (perm: string) => boolean;
}

export const FormsTab: React.FC<FormsTabProps> = ({ formsVm, fieldCatalogVm, hasPerm }) => {
  const canCreate = hasPerm ? hasPerm("perm.bo.form.create") : true;
  const canUpdate = hasPerm ? hasPerm("perm.bo.form.update") : true;
  const canDelete = hasPerm ? hasPerm("perm.bo.form.delete") : true;

  return (
    <div className="space-y-4 pt-2">
      {/* Top Filter & Actions Bar - Masqué sur la page de détail d'un formulaire */}
      {!formsVm.selectedForm && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3.5 glass-card rounded-xl border border-border/30 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un formulaire..."
                value={formsVm.searchTerm}
                onChange={(e) => formsVm.setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 bg-background shadow-sm border-border/50"
              />
            </div>
          </div>

          {canCreate && (
            <Button
              onClick={formsVm.handleOpenNewForm}
              className="gradient-accent text-accent-foreground hover:opacity-90 text-xs h-9 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nouveau formulaire
            </Button>
          )}
        </div>
      )}

      {formsVm.selectedForm ? (
        /* Full Page Form Details & Fields View */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-accent/5 rounded-xl border border-accent/10">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
              <FileText className="h-4 w-4 text-accent shrink-0" />
              <span className="truncate">Champs : {formsVm.selectedForm.title}</span>
            </h3>
            <div className="flex items-center gap-2">
              {canUpdate && (
                <Button
                  onClick={formsVm.handleOpenNewField}
                  size="sm"
                  className="gradient-accent text-accent-foreground text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Nouveau champ
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => formsVm.handleSelectForm(null)}
                title="Fermer le constructeur de champs"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden border border-border/30">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50">
                  <TableHead className="w-16 font-semibold text-xs">Ordre</TableHead>
                  <TableHead className="font-semibold text-xs">Libellé</TableHead>
                  <TableHead className="font-semibold text-xs">Type</TableHead>
                  <TableHead className="font-semibold text-xs">Requis</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formsVm.isLoadingFields ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" />
                    </TableCell>
                  </TableRow>
                ) : formsVm.formFields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                      Aucun champ configuré pour ce formulaire.
                    </TableCell>
                  </TableRow>
                ) : (
                  formsVm.formFields.map((field, idx) => (
                    <TableRow key={field.id} className="border-border/30 hover:bg-muted/10 transition-colors">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={idx === 0}
                            onClick={() => void formsVm.handleMoveField(field, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={idx === formsVm.formFields.length - 1}
                            onClick={() => void formsVm.handleMoveField(field, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <div className="text-xs font-medium text-foreground">{field.label}</div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0.5">
                          {field.type}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-2.5">
                        {field.required ? (
                          <Badge
                            variant="default"
                            className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 px-2 py-0.5"
                          >
                            Oui
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5">
                            Non
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => formsVm.handleOpenEditField(field)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => formsVm.handleDeleteField(field.id)}
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
        </div>
      ) : (
        /* Full Width View: Data Table */
        <div className="glass-card rounded-xl overflow-hidden border border-border/30 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Code</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Titre</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Description</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formsVm.forms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                      Aucun formulaire trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  formsVm.forms.map((form) => {
                    const isSelected = formsVm.selectedForm?.id === form.id;
                    return (
                      <TableRow
                        key={form.id}
                        onClick={() => formsVm.handleSelectForm(form)}
                        className={`cursor-pointer border-border/30 transition-colors ${
                          isSelected ? "bg-accent/15 hover:bg-accent/20" : "hover:bg-muted/20"
                        }`}
                      >
                        <TableCell className="py-3 px-4 font-mono text-xs font-semibold text-accent whitespace-nowrap">
                          {form.code}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs font-semibold text-foreground whitespace-nowrap">
                          {form.title}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs text-muted-foreground max-w-md truncate">
                          {form.description || "—"}
                        </TableCell>

                        <TableCell className="text-right py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => formsVm.handleOpenEditForm(form)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => formsVm.handleDeleteForm(form.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      <FormModalDialog formsVm={formsVm} />
      <FormFieldDialog formsVm={formsVm} fieldCatalogVm={fieldCatalogVm} />
      <FormConfirmationDialogs formsVm={formsVm} />
    </div>
  );
};

export default FormsTab;
