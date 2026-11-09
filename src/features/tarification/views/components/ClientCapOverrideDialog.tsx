import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Check, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/network/errorUtils";
import { overrideClientCap } from "../../services/capsService";
import { fetchStructures, extractStructuresList } from "@/features/structures/services/structuresService";
import { useAuthStore, getCurrentInstitutionId, getCurrentInstitutionLabel } from "@/core/security/authStore";
import { FieldError, hasFieldErrors, invalidFieldProps, useFieldErrors } from "@/shared/forms/fieldErrors";
import { ClientCapOverrideField, validateClientCapOverride } from "../../models/validation";

interface ClientCapOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structures?: { id: string; name: string }[];
  initialClientId?: string;
  initialStructureId?: string;
}

export const ClientCapOverrideDialog: React.FC<ClientCapOverrideDialogProps> = ({
  open,
  onOpenChange,
  structures = [],
  initialClientId = "",
  initialStructureId = "",
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const userStructureId = getCurrentInstitutionId();
  const userStructureLabel = getCurrentInstitutionLabel();

  const [loadedStructures, setLoadedStructures] = useState<{ id: string; name: string }[]>(structures);
  const [clientId, setClientId] = useState(initialClientId);
  const [structureId, setStructureId] = useState(
    isStructureAdmin && userStructureId
      ? userStructureId
      : initialStructureId || structures[0]?.id || ""
  );
  const [newLimit, setNewLimit] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Erreur renvoyée par l'API (les erreurs de saisie sont affichées sous les champs)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors<ClientCapOverrideField>();

  useEffect(() => {
    if (isStructureAdmin && userStructureId) {
      setStructureId(userStructureId);
      return;
    }
    if (structures.length > 0) {
      setLoadedStructures(structures);
      if (!structureId) setStructureId(initialStructureId || structures[0].id);
    } else if (open) {
      fetchStructures()
        .then((res) => {
          const list = extractStructuresList(res);
          setLoadedStructures(list);
          if (list.length > 0 && !structureId) {
            setStructureId(initialStructureId || list[0].id);
          }
        })
        .catch((e) => console.error("Erreur chargement structures", e));
    }
  }, [structures, open, isStructureAdmin, userStructureId, structureId, initialStructureId]);

  useEffect(() => {
    if (open) {
      if (initialClientId) {
        setClientId(initialClientId);
      }
      if (initialStructureId) {
        setStructureId(initialStructureId);
      }
    }
  }, [open, initialClientId, initialStructureId]);

  // Les erreurs de saisie repartent de zéro à chaque ouverture/fermeture
  useEffect(() => {
    resetErrors();
  }, [open, resetErrors]);

  // Reset errors and fields on close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetErrors();
      setErrorMessage(null);
      if (!initialClientId) setClientId("");
      setNewLimit("");
      setComment("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const effectiveStructureId = isStructureAdmin && userStructureId ? userStructureId : structureId;
    const validationErrors = validateClientCapOverride({
      clientId,
      structureId: effectiveStructureId,
      newLimit,
      comment,
    });
    setErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const trimmedClient = clientId.trim();
    const limitNum = parseFloat(newLimit);
    const trimmedComment = comment.trim();

    setIsSubmitting(true);
    try {
      await overrideClientCap(trimmedClient, {
        client_id: trimmedClient,
        structure_id: effectiveStructureId,
        new_limit: limitNum,
        comment: trimmedComment,
      });

      toast.success("Dérogation accordée avec succès pour le client");
      handleOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, "Impossible d'accorder la dérogation au client"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Dérogation de plafond client
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accorder une augmentation exceptionnelle de plafond pour un client
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
          {/* Client ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Identifiant du client <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex: client_id"
              {...invalidFieldProps(errors.clientId, "h-9 text-xs font-mono")}
              value={clientId}
              onChange={(e) => {
                clearError("clientId");
                setClientId(e.target.value);
              }}
              disabled={isSubmitting}
              autoFocus
            />
            <FieldError message={errors.clientId} />
          </div>

          {/* Structure */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Structure cible <span className="text-destructive">*</span>
            </Label>
            {isStructureAdmin ? (
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted/40 text-xs font-medium text-foreground">
                <Badge className="mr-2 text-[10px] pointer-events-none bg-accent/15 text-accent border border-accent/25">
                  Structure
                </Badge>
                {userStructureLabel || userStructureId || "Ma structure"}
              </div>
            ) : (
              <Select
                value={structureId}
                onValueChange={(value) => {
                  clearError("structureId");
                  setStructureId(value);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger {...invalidFieldProps(errors.structureId, "h-9 text-xs")}>
                  <SelectValue placeholder="Sélectionner la structure..." />
                </SelectTrigger>
                <SelectContent>
                  {loadedStructures.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FieldError message={errors.structureId} />
          </div>

          {/* New limit */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Nouveau plafond autorisé (FCFA) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 5000000"
              {...invalidFieldProps(errors.newLimit, "h-9 text-xs font-mono")}
              value={newLimit}
              onChange={(e) => {
                clearError("newLimit");
                setNewLimit(e.target.value);
              }}
              disabled={isSubmitting}
            />
            <FieldError message={errors.newLimit} />
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Motif de la dérogation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Justification détaillée de l'octroi de ce plafond exceptionnel..."
              {...invalidFieldProps(errors.comment, "text-xs resize-none h-20")}
              value={comment}
              onChange={(e) => {
                clearError("comment");
                setComment(e.target.value);
              }}
              disabled={isSubmitting}
            />
            <FieldError message={errors.comment} />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gradient-accent text-accent-foreground text-xs hover:opacity-90 gap-1.5 min-w-28"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Valider la dérogation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default ClientCapOverrideDialog;
