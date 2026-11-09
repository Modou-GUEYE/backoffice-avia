import React from "react";
import { FileCode, Tag, Settings2, ShieldCheck, LayoutTemplate, Palette } from "lucide-react";
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

interface FieldTypeDetailDialogProps {
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
}

export const FieldTypeDetailDialog: React.FC<FieldTypeDetailDialogProps> = ({
  fieldCatalogVm,
}) => {
  const fieldType = fieldCatalogVm.selectedType;

  return (
    <Dialog
      open={fieldType !== null}
      onOpenChange={(open) => !open && void fieldCatalogVm.handleSelectType(null)}
    >
      {fieldType && (
        <DialogContent className="sm:max-w-2xl bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
              <FileCode className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-bold text-foreground">{fieldType.label}</DialogTitle>
                {fieldType.active ? (
                  <Badge variant="default" className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 px-1.5 py-0.5">
                    Actif
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5">
                    Inactif
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Détail du type de champ.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Code unique">
                  <span className="font-mono font-semibold">{fieldType.code}</span>
                </DetailItem>
                <DetailItem label="Libellé">{fieldType.label}</DetailItem>
              </div>
              <DetailItem label="Description">{fieldType.description || "—"}</DetailItem>
            </FormSection>

            <FormSection icon={<Settings2 className="h-3.5 w-3.5 text-accent" />} title="Rendu et valeur">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DetailItem label="Clé">
                  <span className="font-mono">{fieldType.renderer_key}</span>
                </DetailItem>
                <DetailItem label="Type de valeur">
                  <span className="font-mono">{fieldType.value_type}</span>
                </DetailItem>
                <DetailItem label="Source de données">
                  {fieldType.supports_data_source ? (
                    <Badge variant="default" className="text-[9px] bg-blue-500/15 text-blue-600 border-blue-500/30">
                      Oui
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] bg-muted text-muted-foreground">
                      Non
                    </Badge>
                  )}
                </DetailItem>
              </div>
            </FormSection>

            <FormSection icon={<ShieldCheck className="h-3.5 w-3.5 text-accent" />} title="Schéma de validation">
              <JsonBlock value={fieldType.validation_schema} emptyLabel="Non configuré" />
            </FormSection>

            <FormSection icon={<LayoutTemplate className="h-3.5 w-3.5 text-accent" />} title="Schéma UI">
              <JsonBlock value={fieldType.ui_schema} emptyLabel="Non configuré" />
            </FormSection>

            <FormSection icon={<Palette className="h-3.5 w-3.5 text-accent" />} title="Configuration UI par défaut">
              <JsonBlock value={fieldType.default_ui_config} emptyLabel="Non configurée" />
            </FormSection>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10">
            <Button
              variant="ghost"
              onClick={() => void fieldCatalogVm.handleSelectType(null)}
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
