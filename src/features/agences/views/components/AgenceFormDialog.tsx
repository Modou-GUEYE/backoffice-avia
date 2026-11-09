import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, type FieldErrors, hasFieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { Landmark, MapPin, Plus, Trash2, X } from "lucide-react";
import { AgenceCaisseFormLine, AgenceForm, AgenceRead, AgencyParentType } from "../../models/types";
import { paysOptions } from "../../models/data";
import type { AgenceFormField } from "../../viewmodels/useAgences";

interface AgenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAgence: AgenceRead | null;
  form: AgenceForm;
  setForm: React.Dispatch<React.SetStateAction<AgenceForm>>;
  structureFormOptions: Array<{ id: string; nom: string }>;
  distributorFormOptions?: Array<{ id: string; nom: string }>;
  singleStructureMode: boolean;
  isRestrictedContext?: boolean;
  onSelectStructure: (structureId: string) => void;
  onSelectParent?: (parentId: string, parentType?: AgencyParentType) => void;
  onSelectParentType?: (parentType: AgencyParentType) => void;
  onAddCaisseLine: () => void;
  onUpdateCaisseLine: (index: number, line: Partial<AgenceCaisseFormLine>) => void;
  onRemoveCaisseLine: (index: number) => void;
  onSubmit: () => Promise<void>;
  loading?: boolean;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<AgenceFormField>;
  /** Efface l'erreur d'un champ quand l'utilisateur le modifie. */
  onClearError?: (field: AgenceFormField) => void;
}

const NO_ERRORS: FieldErrors<AgenceFormField> = {};

export const AgenceFormDialog: React.FC<AgenceFormDialogProps> = ({
  open,
  onOpenChange,
  editingAgence,
  form,
  setForm,
  structureFormOptions,
  distributorFormOptions = [],
  singleStructureMode,
  isRestrictedContext = false,
  onSelectStructure,
  onSelectParent,
  onSelectParentType,
  onAddCaisseLine,
  onUpdateCaisseLine,
  onRemoveCaisseLine,
  onSubmit,
  loading = false,
  errors = NO_ERRORS,
  onClearError,
}) => {
  const [activeTab, setActiveTab] = useState<string>("general");

  // Les champs obligatoires sont dans l'onglet Général : on y revient pour que les erreurs soient visibles
  useEffect(() => {
    if (hasFieldErrors(errors)) setActiveTab("general");
  }, [errors]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("general");
    }
    onOpenChange(isOpen);
  };

  const currentParentType = form.parent_type || "STRUCTURE";
  const currentParentId = form.parent_id || form.structureId || "";
  const parentOptions = currentParentType === "DISTRIBUTOR" ? distributorFormOptions : structureFormOptions;
  const isParentTypeLocked = Boolean(editingAgence) || isRestrictedContext;
  const isParentSelectDisabled = isRestrictedContext || (currentParentType === "STRUCTURE" && singleStructureMode);

  const handleParentTypeChange = (type: AgencyParentType) => {
    onClearError?.("parent_type");
    onClearError?.("parent_id");
    if (onSelectParentType) {
      onSelectParentType(type);
    } else {
      const defaultOptions = type === "DISTRIBUTOR" ? distributorFormOptions : structureFormOptions;
      const defaultId = defaultOptions[0]?.id || "";
      setForm((prev) => ({
        ...prev,
        parent_type: type,
        parent_id: defaultId,
        structureId: defaultId,
      }));
    }
  };

  const handleParentSelect = (id: string) => {
    onClearError?.("parent_id");
    if (onSelectParent) {
      onSelectParent(id, currentParentType);
    } else {
      onSelectStructure(id);
      setForm((prev) => ({ ...prev, parent_id: id, structureId: id }));
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={editingAgence ? "Modifier l'agence" : "Nouvelle agence"}
      description={
        editingAgence
          ? "Modifiez les informations de l'agence et ses caisses rattachées."
          : "Renseignez les détails pour créer une nouvelle agence."
      }
      submitLabel={editingAgence ? "Enregistrer" : "Créer l'agence"}
      onSubmit={onSubmit}
      loading={loading}
      contentClassName="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
      submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 py-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="coords">Coordonnées</TabsTrigger>
          <TabsTrigger value="caisses">Caisses</TabsTrigger>
        </TabsList>

        {/* Onglet Général */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de l'agence <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: Agence Principale"
                value={form.name}
                {...invalidFieldProps(errors.name)}
                onChange={(e) => {
                  onClearError?.("name");
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                }}
              />
              <FieldError message={errors.name} />
            </div>
            <div className="space-y-2">
              <Label>Code agence <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: AGC001"
                value={form.code}
                {...invalidFieldProps(errors.code)}
                onChange={(e) => {
                  onClearError?.("code");
                  setForm((prev) => ({ ...prev, code: e.target.value }));
                }}
              />
              <FieldError message={errors.code} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type d'entité parente <span className="text-destructive">*</span></Label>
              <Select
                value={currentParentType}
                onValueChange={(val) => handleParentTypeChange(val as AgencyParentType)}
                disabled={isParentTypeLocked}
              >
                <SelectTrigger {...invalidFieldProps(errors.parent_type)}>
                  <SelectValue placeholder="Type de parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRUCTURE">Structure (Banque / IMF)</SelectItem>
                  <SelectItem value="DISTRIBUTOR">Distributeur</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.parent_type} />
            </div>

            <div className="space-y-2">
              <Label>Entité de rattachement <span className="text-destructive">*</span></Label>
              <Select
                value={currentParentId}
                onValueChange={handleParentSelect}
                disabled={isParentSelectDisabled}
              >
                <SelectTrigger {...invalidFieldProps(errors.parent_id)}>
                  <SelectValue
                    placeholder={
                      currentParentType === "DISTRIBUTOR"
                        ? "Sélectionner un distributeur"
                        : "Sélectionner une structure"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.parent_id} />
            </div>
          </div>
        </TabsContent>

        {/* Onglet Coordonnées & Responsable */}
        <TabsContent value="coords" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                placeholder="Ex: Dakar"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Région</Label>
              <Input
                placeholder="Ex: Dakar"
                value={form.region}
                onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adresse physique</Label>
              <Input
                placeholder="Ex: Rue 10 x Avenue Blaise Diagne"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Select
                value={form.country || "Sénégal"}
                onValueChange={(v) => setForm((prev) => ({ ...prev, country: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {paysOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Téléphone de contact</Label>
              <Input
                placeholder="Ex: +221 33 000 00 00"
                value={form.contact_phone}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email de contact</Label>
              <Input
                type="email"
                placeholder="Ex: agence@banque.sn"
                value={form.contact_email}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>
          </div>
        </TabsContent>

        {/* Onglet Caisses */}
        <TabsContent value="caisses" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                Définissez les caisses opérationnelles rattachées à cette agence.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddCaisseLine}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Ajouter une caisse
            </Button>
          </div>

          {form.caisses.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-xs">
              <Landmark className="h-8 w-8 mx-auto mb-2 opacity-50 text-accent" />
              Aucune caisse configurée pour le moment. Vous pourrez en ajouter ultérieurement ou en ajouter une maintenant.
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {form.caisses.map((caisse, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-muted/20"
                >
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nom de la caisse (ex: Caisse 1)"
                      value={caisse.name}
                      onChange={(e) => onUpdateCaisseLine(index, { name: e.target.value })}
                      className="text-xs h-8 bg-background"
                    />
                    <Input
                      placeholder="Code caisse (ex: CSS001)"
                      value={caisse.code}
                      onChange={(e) => onUpdateCaisseLine(index, { code: e.target.value })}
                      className="text-xs h-8 bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => onRemoveCaisseLine(index)}
                    aria-label={`Supprimer la caisse ${caisse.name || index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </FormDialog>
  );
};
