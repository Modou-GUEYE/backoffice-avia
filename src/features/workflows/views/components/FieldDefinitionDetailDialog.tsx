import React from "react";
import { BookOpen, Tag, TextCursorInput, ShieldCheck, Database, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFieldCatalog } from "../../viewmodels/useFieldCatalog";
import { FormSection, DetailItem, JsonBlock } from "./FormSection";

interface FieldDefinitionDetailDialogProps {
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
}

export const FieldDefinitionDetailDialog: React.FC<FieldDefinitionDetailDialogProps> = ({
  fieldCatalogVm,
}) => {
  const definition = fieldCatalogVm.selectedDefinition;
  const fieldTypeLabel = definition
    ? fieldCatalogVm.rawFieldTypes.find((t) => t.id === definition.field_type_id)?.label || definition.field_type_id
    : "";

  return (
    <Dialog
      open={definition !== null}
      onOpenChange={(open) => !open && fieldCatalogVm.setSelectedDefinition(null)}
    >
      {definition && (
        <DialogContent className="sm:max-w-2xl bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-foreground">{definition.label}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Détail de la définition de champ.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Clé technique unique">
                  <span className="font-mono font-semibold">{definition.field_key}</span>
                </DetailItem>
                <DetailItem label="Libellé">{definition.label}</DetailItem>
              </div>
            </FormSection>

            <FormSection icon={<TextCursorInput className="h-3.5 w-3.5 text-accent" />} title="Saisie">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Type de champ">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {fieldTypeLabel}
                  </Badge>
                </DetailItem>
                <DetailItem label="Champ obligatoire">
                  {definition.required ? (
                    <Badge variant="default" className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 px-2 py-0.5">
                      Oui
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5">
                      Non
                    </Badge>
                  )}
                </DetailItem>
                <DetailItem label="Texte indicatif">{definition.placeholder || "—"}</DetailItem>
                <DetailItem label="Valeur par défaut">{definition.default_value || "—"}</DetailItem>
              </div>
            </FormSection>

            <FormSection icon={<ShieldCheck className="h-3.5 w-3.5 text-accent" />} title="Règles de validation">
              <JsonBlock value={definition.validation_rules} emptyLabel="Non configurées" />
            </FormSection>

            <FormSection icon={<Database className="h-3.5 w-3.5 text-accent" />} title="Source de données">
              <JsonBlock value={definition.data_source} emptyLabel="Non configurée" />
            </FormSection>

            <FormSection icon={<Palette className="h-3.5 w-3.5 text-accent" />} title="Configuration UI">
              <JsonBlock value={definition.ui_config} emptyLabel="Non configurée" />
            </FormSection>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10">
            <Button
              variant="ghost"
              onClick={() => fieldCatalogVm.setSelectedDefinition(null)}
              className="text-xs h-9"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
};
