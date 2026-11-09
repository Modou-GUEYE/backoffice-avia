import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { WorkflowResponse, DuplicateWorkflowRequest } from "../../models/workflowsTypes";
import { ServiceResponse, ServiceVersionResponse } from "@/features/packages/models/types";
import { fetchServices, fetchServiceVersions } from "@/features/packages/services/servicesService";
import { StructureSelectCombobox } from "./StructureSelectCombobox";
import { DuplicateWorkflowFormField, validateDuplicateWorkflowForm } from "../../viewmodels/useWorkflows";
import { FieldError, hasFieldErrors, invalidFieldProps, useFieldErrors } from "@/shared/forms/fieldErrors";

export interface DuplicateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWorkflow: WorkflowResponse | null;
  onDuplicate: (
    sourceWorkflowId: string,
    payload: DuplicateWorkflowRequest,
    sourceStructureId?: string
  ) => Promise<unknown>;
  isDuplicating: boolean;
  services?: ServiceResponse[];
  currentServiceId?: string;
}

export const DuplicateWorkflowDialog: React.FC<DuplicateWorkflowDialogProps> = ({
  open,
  onOpenChange,
  sourceWorkflow,
  onDuplicate,
  isDuplicating,
  services = [],
  currentServiceId = "",
}) => {
  const [name, setName] = useState("");
  const [destinationStructureId, setDestinationStructureId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceVersionId, setServiceVersionId] = useState("");
  const [allServices, setAllServices] = useState<ServiceResponse[]>(services);
  const [serviceVersions, setServiceVersions] = useState<ServiceVersionResponse[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  // Erreur renvoyée par le serveur lors de la duplication (les erreurs de saisie sont affichées sous les champs)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors<DuplicateWorkflowFormField>();

  // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
  useEffect(() => {
    resetErrors();
  }, [open, resetErrors]);

  // Sync services prop or fetch if empty
  useEffect(() => {
    if (services.length > 0) {
      setAllServices(services);
    } else if (open) {
      fetchServices()
        .then((data) => setAllServices(data))
        .catch(() => {});
    }
  }, [services, open]);

  // Load versions for a service
  const loadVersions = useCallback(async (serviceId: string, initialVersionId?: string) => {
    if (!serviceId) {
      setServiceVersions([]);
      return;
    }
    try {
      setIsLoadingVersions(true);
      const data = await fetchServiceVersions(serviceId);
      const versions = Array.isArray(data) ? data : [];
      setServiceVersions(versions);
      if (versions.length > 0) {
        const found = initialVersionId ? versions.find((v) => v.id === initialVersionId) : null;
        if (found) {
          setServiceVersionId(found.id);
        } else {
          const published = versions.find((v) => v.status?.toUpperCase() === "PUBLISHED") || versions[0];
          setServiceVersionId(published.id);
        }
      } else {
        setServiceVersionId("");
      }
    } catch {
      setServiceVersions([]);
    } finally {
      setIsLoadingVersions(false);
    }
  }, []);

  // Initialize form when dialog opens
  useEffect(() => {
    if (sourceWorkflow && open) {
      setName(`${sourceWorkflow.name} (Copie)`);
      setDestinationStructureId(sourceWorkflow.structure_id || "");
      setErrorMessage(null);

      const serviceIdToUse = currentServiceId || (allServices.length > 0 ? allServices[0].id : "");
      setSelectedServiceId(serviceIdToUse);

      if (serviceIdToUse) {
        void loadVersions(serviceIdToUse, sourceWorkflow.service_version_id || "");
      } else {
        setServiceVersionId(sourceWorkflow.service_version_id || "");
      }
    }
  }, [sourceWorkflow, open, currentServiceId, allServices, loadVersions]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (errorMessage) setErrorMessage(null);
    clearError("service");
    // La version cible est rechargée et présélectionnée pour le nouveau service
    clearError("service_version_id");
    void loadVersions(serviceId);
  };

  const handleVersionChange = (value: string) => {
    setServiceVersionId(value);
    if (errorMessage) setErrorMessage(null);
    clearError("service_version_id");
  };

  const handleSubmit = async () => {
    if (!sourceWorkflow) return;
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedVersionId = serviceVersionId.trim();
    const trimmedDestStructureId = destinationStructureId.trim();

    const validationErrors = validateDuplicateWorkflowForm({
      name,
      serviceId: selectedServiceId,
      serviceVersionId,
    });
    setErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    try {
      const payload: DuplicateWorkflowRequest = {
        name: trimmedName,
        service_version_id: trimmedVersionId,
        structure_id: trimmedDestStructureId || null,
      };
      await onDuplicate(
        sourceWorkflow.id,
        payload,
        sourceWorkflow.structure_id || undefined
      );
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur lors de la duplication du workflow");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Copy className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Dupliquer le workflow
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Créer une nouvelle copie du workflow source avec ses étapes et mappings.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="dupWfName" className="text-xs font-semibold">
              Nom de la copie <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dupWfName"
              {...invalidFieldProps(errors.name, "h-9 text-xs bg-background")}
              placeholder="Ex. Virement Agence Nord"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage(null);
                clearError("name");
              }}
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dupDestStructureId" className="text-xs font-semibold">
              Structure destination (Optionnel)
            </Label>
            <StructureSelectCombobox
              id="dupDestStructureId"
              value={destinationStructureId}
              onChange={(newId) => setDestinationStructureId(newId || "")}
              placeholder="Sélectionner une structure"
              clearLabel="Sélectionner une structure"
            />
          </div>

          {/* Service concerné * et Version de service cible * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dupServiceId" className="text-xs font-semibold">
                Service concerné <span className="text-destructive">*</span>
              </Label>
              <select
                id="dupServiceId"
                {...invalidFieldProps(
                  errors.service,
                  "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 focus:outline-none focus:ring-1 focus:ring-accent"
                )}
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                <option value="">-- Sélectionner un service --</option>
                {allServices.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.label} ({srv.code})
                  </option>
                ))}
              </select>
              <FieldError message={errors.service} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dupServiceVerId" className="text-xs font-semibold">
                Version de service cible <span className="text-destructive">*</span>
              </Label>
              {isLoadingVersions ? (
                <div className="flex items-center text-xs text-muted-foreground gap-2 py-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> Chargement des versions...
                </div>
              ) : serviceVersions.length > 0 ? (
                <select
                  id="dupServiceVerId"
                  {...invalidFieldProps(
                    errors.service_version_id,
                    "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  )}
                  value={serviceVersionId}
                  onChange={(e) => handleVersionChange(e.target.value)}
                >
                  {serviceVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version}
                    </option>
                  ))}
                </select>
              ) : selectedServiceId ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-amber-600 font-medium truncate">
                    Aucune version enregistrée :
                  </p>
                  <Input
                    id="dupServiceVerId"
                    {...invalidFieldProps(errors.service_version_id, "h-9 text-xs bg-background font-mono")}
                    placeholder="ID de version manuel..."
                    value={serviceVersionId}
                    onChange={(e) => handleVersionChange(e.target.value)}
                  />
                </div>
              ) : (
                <Input
                  id="dupServiceVerId"
                  {...invalidFieldProps(errors.service_version_id, "h-9 text-xs bg-background font-mono")}
                  placeholder="Sélectionnez un service..."
                  disabled
                />
              )}
              <FieldError message={errors.service_version_id} />
            </div>
          </div>


        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9"
            disabled={isDuplicating}
          >
            Annuler
          </Button>
          <Button
            disabled={isDuplicating}
            onClick={() => void handleSubmit()}
            className="gradient-accent text-accent-foreground text-xs h-9"
          >
            {isDuplicating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Dupliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
