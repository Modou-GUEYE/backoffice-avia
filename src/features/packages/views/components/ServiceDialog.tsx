import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ServiceForm, ServiceResponse } from "../../models/types";
import { FileCode, Upload } from "lucide-react";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { ServiceFormField } from "../../viewmodels/packageValidation";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  errors?: FieldErrors<ServiceFormField>;
  onClearError?: (field: ServiceFormField) => void;
  editingService: ServiceResponse | null;
  isSaving: boolean;
  onSave: () => void;
}

export const ServiceDialog: React.FC<ServiceDialogProps> = ({
  open,
  onOpenChange,
  form,
  setForm,
  errors = {},
  onClearError,
  editingService,
  isSaving,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "yaml">("upload");

  useEffect(() => {
    if (open) {
      setActiveTab(editingService ? "upload" : "yaml");
    }
  }, [open, editingService]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onClearError?.("contract");
    setForm((prev) => ({ ...prev, contractFile: file }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {isSaving && (
          <LoadingOverlay
            title={editingService ? "Modification du contrat" : "Création du contrat"}
            description="Veuillez patienter pendant l'enregistrement..."
          />
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingService
              ? `Modifier le contrat ${editingService.code}`
              : "Nouveau Contrat de Service"}
          </DialogTitle>
        </DialogHeader>

        {editingService && (
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Contrat cible :</span>
              <Badge variant="outline" className="font-mono text-xs text-accent">
                {editingService.code}
              </Badge>
              {editingService.version && (
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                  v{editingService.version}
                </Badge>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground">{editingService.label}</p>
            {editingService.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2">{editingService.description}</p>
            )}
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "upload" | "yaml")}
          className="space-y-4 py-1"
        >
          <TabsList className="grid grid-cols-2 w-full bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="upload" className="text-xs gap-1.5 rounded-lg">
              <Upload className="h-3.5 w-3.5" /> Upload Fichier (.yaml / .json)
            </TabsTrigger>
            <TabsTrigger value="yaml" className="text-xs gap-1.5 rounded-lg">
              <FileCode className="h-3.5 w-3.5" /> Éditeur YAML / JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3 m-0">
            <div
              {...invalidFieldProps(
                errors.contract,
                "space-y-2 p-6 rounded-xl border border-dashed border-border/60 bg-muted/10 text-center",
              )}
            >
              <Upload className="h-8 w-8 text-accent mx-auto mb-2 opacity-80" />
              <Label htmlFor="contractFileInput" className="text-xs font-semibold block cursor-pointer">
                {editingService
                  ? "Sélectionnez le nouveau fichier de contrat (.yaml, .yml ou .json)"
                  : "Sélectionnez un fichier de contrat (.yaml, .yml ou .json)"}
              </Label>
              <input
                id="contractFileInput"
                type="file"
                accept=".yaml,.yml,.json"
                className="text-xs mx-auto block file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30 cursor-pointer"
                onChange={handleFileChange}
              />
              {form.contractFile && (
                <p className="text-xs text-emerald-500 font-medium mt-2">
                  Fichier sélectionné : {form.contractFile.name} ({(form.contractFile.size / 1024).toFixed(1)} Ko)
                </p>
              )}
            </div>
            <FieldError message={errors.contract} />
          </TabsContent>

          <TabsContent value="yaml" className="space-y-2 m-0">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                {editingService ? "Nouvelle définition du contrat (YAML ou JSON) :" : "Définition du contrat (YAML ou JSON) :"}
              </Label>

              <div
                {...invalidFieldProps(
                  errors.contract,
                  "rounded-xl border border-border/60 bg-muted/20 overflow-hidden focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/20 transition-all shadow-sm",
                )}
              >
                <div className="flex items-center justify-between px-3.5 py-2 bg-muted/50 border-b border-border/40 select-none">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground ml-1.5 flex items-center gap-1.5 font-medium">
                      <FileCode className="h-3.5 w-3.5 text-accent" />
                      {editingService ? `${editingService.code.toLowerCase()}.yaml` : "contract_definition.yaml"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.rawContractYaml && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {form.rawContractYaml.split("\n").length} lignes
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0 border-border/60">
                      YAML / JSON
                    </Badge>
                  </div>
                </div>

                <Textarea
                  value={form.rawContractYaml ?? ""}
                  onChange={(e) => {
                    onClearError?.("contract");
                    setForm((prev) => ({
                      ...prev,
                      rawContractYaml: e.target.value,
                    }));
                  }}
                  rows={14}
                  className="font-mono text-xs leading-relaxed p-4 bg-background/50 text-foreground border-0 rounded-none focus-visible:ring-0 focus-visible:outline-none resize-y min-h-[320px] w-full"
                  placeholder="Collez ou saisissez ici la définition du contrat (YAML ou JSON)..."
                />
              </div>
              <FieldError message={errors.contract} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="gradient-accent text-accent-foreground min-w-[100px]"
          >
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDialog;

