import { useState, useMemo, useEffect } from "react";
import {
  CampaignOut,
  CampaignFormState,
  MediaType,
  CampaignTarget,
  mediaTypeLabels,
  targetLabels,
  resolveCampaignMediaUrl,
  extractFilenameFromMediaUrl,
} from "../../models/types";
import { AgenceRead } from "@/features/agences/models/types";
import { StructureRead } from "@/features/structures/models/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, Upload, Trash2, Volume2, FileVideo, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { cn } from "@/lib/utils";
import type { CampaignFormField } from "../../viewmodels/useDiffusion";

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCampaign: CampaignOut | null;
  form: CampaignFormState;
  setForm: (form: CampaignFormState | ((prev: CampaignFormState) => CampaignFormState)) => void;
  mediaTypes: readonly MediaType[];
  targets: readonly CampaignTarget[];
  clientTypes?: readonly string[];
  agencesList: AgenceRead[];
  structuresList?: StructureRead[];
  isSaving: boolean;
  /** Erreur renvoyée par l'API (les erreurs de saisie sont affichées sous les champs). */
  errorMessage?: string | null;
  onSave: () => void;
  /** Erreurs de validation affichées sous les champs. */
  errors?: FieldErrors<CampaignFormField>;
  clearError?: (field: CampaignFormField) => void;
  /** Valide le formulaire (et affiche les erreurs) avant la confirmation de modification. */
  onValidate?: () => boolean;
}

const formatClientTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    PARTICULIER: "Particulier",
    ENTREPRISE: "Entreprise",
    COMMERCANT: "Commerçant",
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export const CampaignDialog = ({
  open,
  onOpenChange,
  editingCampaign,
  form,
  setForm,
  mediaTypes,
  targets,
  clientTypes = ["PARTICULIER", "ENTREPRISE", "COMMERCANT"],
  agencesList,
  structuresList,
  isSaving,
  errorMessage = null,
  onSave,
  errors = {},
  clearError,
  onValidate,
}: CampaignDialogProps) => {
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  // Stable blob preview URL that doesn't re-create on every render
  const previewBlobUrl = useMemo(() => {
    if (!form.file) return null;
    try {
      return URL.createObjectURL(form.file);
    } catch {
      return null;
    }
  }, [form.file]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const onFilePicked = (file: File | null) => {
    if (file) clearError?.("file");
    if (!file) {
      setForm((prev) => ({ ...prev, file: null }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      file,
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign
                ? editingCampaign.status === "deja_diffusee" || editingCampaign.status === "suspendue"
                  ? "Relancer la campagne publicitaire"
                  : "Modifier la campagne publicitaire"
                : "Nouvelle campagne publicitaire"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les paramètres, la cible et le fichier média de la campagne.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Libellé + Structure */}
            <div className={structuresList && structuresList.length > 0 ? "grid grid-cols-2 gap-3" : "space-y-1.5"}>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Libellé <span className="text-destructive">*</span></Label>
                <Input
                  value={form.libelle}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, libelle: e.target.value }));
                    clearError?.("libelle");
                  }}
                  placeholder="Ex. Lancement Service Crédit Express"
                  {...invalidFieldProps(errors.libelle, "text-xs")}
                />
                <FieldError message={errors.libelle} />
              </div>

              {structuresList && structuresList.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Structure (Optionnel)</Label>
                  <Select
                    value={form.structure_id || "ALL"}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, structure_id: val === "ALL" ? "" : val }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Toutes les structures (Global)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">Toutes les structures (Global)</SelectItem>
                      {structuresList.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Type de média + Cible */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Type de média <span className="text-destructive">*</span></Label>
                <Select
                  value={form.type}
                  onValueChange={(val) => {
                    setForm((prev) => ({ ...prev, type: val as MediaType }));
                    clearError?.("type");
                  }}
                  disabled={!!editingCampaign}
                >
                  <SelectTrigger {...invalidFieldProps(errors.type, "text-xs")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaTypes.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {mediaTypeLabels[t] || t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.type} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cible client <span className="text-destructive">*</span></Label>
                <Select
                  value={form.cible}
                  onValueChange={(val) => {
                    setForm((prev) => ({ ...prev, cible: val as CampaignTarget, cible_ids: [] }));
                    clearError?.("cible");
                    clearError?.("cible_ids");
                    clearError?.("age_min");
                    clearError?.("age_max");
                  }}
                >
                  <SelectTrigger {...invalidFieldProps(errors.cible, "text-xs")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((tgt) => (
                      <SelectItem key={tgt} value={tgt} className="text-xs">
                        {targetLabels[tgt] || tgt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.cible} />
              </div>
            </div>

            {/* Sélections spécifiques pour cible_ids */}
            {form.cible === "agences" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sélectionner les agences ciblées <span className="text-destructive">*</span></Label>
                <div
                  aria-invalid={errors.cible_ids ? true : undefined}
                  className={cn("grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-2 border rounded-lg bg-background/50", errors.cible_ids && "border-destructive")}
                >
                  {agencesList.map((a) => {
                    const isSelected = form.cible_ids.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          const nextIds = isSelected
                            ? form.cible_ids.filter((id) => id !== a.id)
                            : [...form.cible_ids, a.id];
                          setForm((prev) => ({ ...prev, cible_ids: nextIds }));
                          clearError?.("cible_ids");
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all text-left ${
                          isSelected
                            ? "border-accent bg-accent/10 text-accent font-semibold"
                            : "border-border text-muted-foreground hover:border-accent/40"
                        }`}
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-accent border-accent" : "border-muted-foreground/35"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                        </div>
                        <span className="truncate">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.cible_ids} />
              </div>
            )}

            {form.cible === "localite" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sélectionner les pays / localités ciblés <span className="text-destructive">*</span></Label>
                <div
                  aria-invalid={errors.cible_ids ? true : undefined}
                  className={cn("grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-2 border rounded-lg bg-background/50", errors.cible_ids && "border-destructive")}
                >
                  {["Sénégal", "Mali", "Côte d'Ivoire", "Burkina Faso", "Togo", "Bénin", "Niger", "Guinée-Bissau", "UEMOA"].map(
                    (country) => {
                      const isSelected = form.cible_ids.includes(country);
                      return (
                        <button
                          key={country}
                          type="button"
                          onClick={() => {
                            const nextIds = isSelected
                              ? form.cible_ids.filter((id) => id !== country)
                              : [...form.cible_ids, country];
                            setForm((prev) => ({ ...prev, cible_ids: nextIds }));
                            clearError?.("cible_ids");
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all text-left ${
                            isSelected
                              ? "border-accent bg-accent/10 text-accent font-semibold"
                              : "border-border text-muted-foreground hover:border-accent/40"
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-accent border-accent" : "border-muted-foreground/35"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                          </div>
                          <span className="truncate">{country}</span>
                        </button>
                      );
                    },
                  )}
                </div>
                <FieldError message={errors.cible_ids} />
              </div>
            )}

            {form.cible === "type_client" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sélectionner les types de clients ciblés <span className="text-destructive">*</span></Label>
                <div
                  aria-invalid={errors.cible_ids ? true : undefined}
                  className={cn("grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 border rounded-lg bg-background/50", errors.cible_ids && "border-destructive")}
                >
                  {clientTypes.map((type) => {
                    const isSelected = form.cible_ids.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const nextIds = isSelected
                            ? form.cible_ids.filter((id) => id !== type)
                            : [...form.cible_ids, type];
                          setForm((prev) => ({ ...prev, cible_ids: nextIds }));
                          clearError?.("cible_ids");
                        }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-all text-left ${
                          isSelected
                            ? "border-accent bg-accent/10 text-accent font-semibold"
                            : "border-border text-muted-foreground hover:border-accent/40"
                        }`}
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-accent border-accent" : "border-muted-foreground/35"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                        </div>
                        <span className="truncate">{formatClientTypeLabel(type)}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.cible_ids} />
              </div>
            )}

            {form.cible === "tranche_age" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Définir la tranche d'âge <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Âge Minimum</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.cible_ids[0] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const max = form.cible_ids[1] || "";
                        setForm((prev) => ({ ...prev, cible_ids: [val, max] }));
                        clearError?.("age_min");
                        clearError?.("age_max");
                      }}
                      placeholder="Ex. 18"
                      {...invalidFieldProps(errors.age_min, "text-xs")}
                    />
                    <FieldError message={errors.age_min} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Âge Maximum</span>
                    <Input
                      type="number"
                      min="0"
                      value={form.cible_ids[1] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const min = form.cible_ids[0] || "";
                        setForm((prev) => ({ ...prev, cible_ids: [min, val] }));
                        clearError?.("age_min");
                        clearError?.("age_max");
                      }}
                      placeholder="Ex. 35"
                      {...invalidFieldProps(errors.age_max, "text-xs")}
                    />
                    <FieldError message={errors.age_max} />
                  </div>
                </div>
              </div>
            )}

            {/* Dates de début et de fin */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date de début <span className="text-destructive">*</span></Label>
                <Input
                  type="datetime-local"
                  value={form.date_debut}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, date_debut: e.target.value }));
                    clearError?.("date_debut");
                    clearError?.("date_fin");
                  }}
                  {...invalidFieldProps(errors.date_debut, "text-xs")}
                />
                <FieldError message={errors.date_debut} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date de fin <span className="text-destructive">*</span></Label>
                <Input
                  type="datetime-local"
                  value={form.date_fin}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, date_fin: e.target.value }));
                    clearError?.("date_fin");
                  }}
                  {...invalidFieldProps(errors.date_fin, "text-xs")}
                />
                <FieldError message={errors.date_fin} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Entrez les détails ou le texte accompagnant le média..."
                className="text-xs min-h-[60px]"
              />
            </div>

            {/* Zone de fichier média */}
            {(() => {
              const existingMediaUrl = editingCampaign
                ? editingCampaign.media_url ?? resolveCampaignMediaUrl(editingCampaign)
                : null;
              const currentFilename =
                editingCampaign?.filename ||
                extractFilenameFromMediaUrl(existingMediaUrl) ||
                (form.type === "video"
                  ? "Fichier vidéo enregistré"
                  : form.type === "audio"
                    ? "Fichier audio enregistré"
                    : "Image enregistrée");

              return (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Média à diffuser <span className="text-destructive">*</span>
                  </Label>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
                    {/* 1. Aperçu d'un nouveau fichier sélectionné */}
                    {form.file && previewBlobUrl ? (() => {
                      const isNewVideo =
                        form.file.type.startsWith("video/") ||
                        /\.(mp4|webm|ogg|mov|mkv)$/i.test(form.file.name);
                      const isNewAudio =
                        form.file.type.startsWith("audio/") ||
                        /\.(mp3|wav|ogg|aac|m4a)$/i.test(form.file.name);

                      return (
                        <div className="space-y-3">
                          {isNewVideo ? (
                            <div className="rounded-lg overflow-hidden border border-border/60 bg-black/90 flex flex-col items-center justify-center p-2">
                              <video
                                key={previewBlobUrl}
                                src={previewBlobUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full max-h-[220px] rounded object-contain"
                              >
                                Votre navigateur ne supporte pas la lecture de cette vidéo.
                              </video>
                            </div>
                          ) : isNewAudio ? (
                            <div className="p-3 rounded-lg bg-background/80 border border-border/50 space-y-2">
                              <audio
                                key={previewBlobUrl}
                                src={previewBlobUrl}
                                controls
                                preload="metadata"
                                className="w-full h-8"
                              >
                                Votre navigateur ne supporte pas la lecture audio.
                              </audio>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-2 bg-background/70 rounded-lg border border-border/50">
                              <img
                                src={previewBlobUrl}
                                alt="Aperçu nouveau média"
                                className="max-h-[180px] w-auto object-contain rounded"
                              />
                            </div>
                          )}

                        <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-background/80 border border-border/50">
                          <div className="min-w-0 space-y-0.5">
                            <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
                              Nouveau fichier sélectionné
                            </span>
                            <p className="text-xs font-medium text-foreground truncate" title={form.file.name}>
                              {form.file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {(form.file.size / 1024 / 1024).toFixed(2)} Mo
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, file: null }));
                              const inputCreate = document.getElementById("campaign-file-create") as HTMLInputElement | null;
                              if (inputCreate) inputCreate.value = "";
                              const inputReplace = document.getElementById("campaign-file-replace") as HTMLInputElement | null;
                              if (inputReplace) inputReplace.value = "";
                            }}
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Retirer
                          </Button>
                        </div>
                      </div>
                    );
                  })() : editingCampaign ? (
                      /* 2. Affichage du média existant lors de la modification */
                      <div className="space-y-3">
                        {form.type === "video" ? (
                          <div className="rounded-lg overflow-hidden border border-border/60 bg-black/90 p-2 space-y-2">
                            <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground">
                              <span className="font-semibold text-accent uppercase tracking-wider text-[10px]">
                                Vidéo actuelle
                              </span>
                              <span className="truncate max-w-[280px] font-mono text-foreground" title={currentFilename}>
                                {currentFilename}
                              </span>
                            </div>
                            {existingMediaUrl ? (
                              <video
                                key={existingMediaUrl}
                                src={existingMediaUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full max-h-[220px] rounded object-contain"
                              >
                                Votre navigateur ne supporte pas la lecture de cette vidéo.
                              </video>
                            ) : (
                              <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                <FileVideo className="h-8 w-8 text-accent/60" />
                                <p className="text-xs">Fichier vidéo enregistré sur le serveur</p>
                              </div>
                            )}
                          </div>
                        ) : form.type === "audio" ? (
                          <div className="p-3 rounded-lg bg-background/70 border border-border/50 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-accent uppercase tracking-wider text-[10px]">
                                Audio actuel
                              </span>
                              <span className="truncate max-w-[280px] font-mono text-foreground" title={currentFilename}>
                                {currentFilename}
                              </span>
                            </div>
                            {existingMediaUrl ? (
                              <audio key={existingMediaUrl} src={existingMediaUrl} controls preload="metadata" className="w-full h-8" />
                            ) : (
                              <div className="py-3 flex items-center justify-center text-muted-foreground gap-2">
                                <Volume2 className="h-5 w-5 text-accent/60" />
                                <span className="text-xs">Fichier audio enregistré</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 p-2.5 rounded-lg bg-background/70 border border-border/50">
                            <div className="h-20 w-20 rounded-xl border bg-background overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                              {existingMediaUrl ? (
                                <img
                                  src={existingMediaUrl}
                                  alt={editingCampaign?.libelle || "Média actuel"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                  <FileVideo className="h-6 w-6 text-accent" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
                                Image actuelle
                              </span>
                              <p className="text-xs font-medium text-foreground truncate" title={currentFilename}>
                                {currentFilename}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Remplacer le média */}
                        <input
                          id="campaign-file-replace"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            onFilePicked(file);
                          }}
                        />
                        <label
                          htmlFor="campaign-file-replace"
                          className="group w-full cursor-pointer rounded-lg border border-dashed border-border/80 bg-muted/10 py-2.5 px-3 transition-all hover:border-accent/60 hover:bg-muted/30 flex items-center justify-center gap-2"
                        >
                          <Upload className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                            Remplacer par un nouveau fichier...
                          </span>
                        </label>
                      </div>
                    ) : (
                      /* 3. Zone de glisser-déposer pour la création */
                      <div>
                        <input
                          id="campaign-file-create"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            onFilePicked(file);
                          }}
                        />
                        <label
                          htmlFor="campaign-file-create"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0] || null;
                            onFilePicked(file);
                          }}
                          aria-invalid={errors.file ? true : undefined}
                          className={cn(
                            "group w-full cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 py-5 px-4 transition-all hover:border-muted-foreground/40 hover:bg-muted/20 block",
                            errors.file && "border-destructive hover:border-destructive",
                          )}
                        >
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Upload className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <div>
                              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                Glissez un fichier ou <span className="underline text-accent font-semibold">cliquez ici</span>
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                  <FieldError message={errors.file} />
                </div>
              );
            })()}

            {/* Erreur renvoyée par l'API, en bas du formulaire */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs animate-in fade-in-50 duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (editingCampaign) {
                  if (onValidate && !onValidate()) return;
                  onOpenChange(false);
                  setConfirmUpdate(true);
                } else {
                  onSave();
                }
              }}
              className="gradient-accent text-accent-foreground text-xs"
              disabled={isSaving}
            >
              {editingCampaign ? "Enregistrer" : "Créer la campagne"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full"
              />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                {editingCampaign ? "Enregistrement en cours..." : "Création en cours..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={confirmUpdate}
        onOpenChange={(open) => {
          setConfirmUpdate(open);
          if (!open && editingCampaign) {
            onOpenChange(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la modification</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment enregistrer les modifications apportées à cette campagne ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmUpdate(false);
                onOpenChange(true);
              }}
              className="text-xs"
            >
              Non
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setConfirmUpdate(false);
                onSave();
              }}
              className="gradient-accent text-accent-foreground text-xs"
            >
              Oui, enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CampaignDialog;
