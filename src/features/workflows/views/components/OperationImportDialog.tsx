import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UploadCloud,
  CheckCircle2,
  Plus,
  AlertTriangle,
  AlertCircle,
  Download,
  Search,
  File,
  X,
  Loader2,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useIntegrations } from "../../viewmodels/useIntegrations";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError } from "@/shared/forms/fieldErrors";

interface OperationImportDialogProps {
  integrationsVm: ReturnType<typeof useIntegrations>;
}

export const OperationImportDialog: React.FC<OperationImportDialogProps> = ({
  integrationsVm,
}) => {
  const {
    showImportDialog,
    setShowImportDialog,
    importFile,
    isAnalyzingFile,
    importAnalysisError,
    importCandidates,
    selectedCandidate,
    selectedResponseCode,
    setSelectedResponseCode,
    importFormErrors,
    isImportingOperation,
    handleSelectImportFile,
    handleAnalyzeImportFile,
    handleSelectCandidate,
    handleConfirmUseCandidate,
  } = integrationsVm;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterSearch, setFilterSearch] = useState("");

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 octet";
    if (bytes < 1024) return `${bytes} octets`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  // Helper pour les méthode HTTP badge
  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "POST":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "PATCH":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "DELETE":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/40";
    }
  };

  // Filter les candidats par recherche 
  const filteredCandidates = useMemo(() => {
    if (!filterSearch.trim()) return importCandidates;
    const q = filterSearch.toLowerCase().trim();
    return importCandidates.filter(
      (c) =>
        c.method.toLowerCase().includes(q) ||
        c.relative_path.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q)
    );
  }, [importCandidates, filterSearch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleSelectImportFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSelectImportFile(file);
    }
  };

  const hasAnalysisResults = importCandidates.length > 0;

  return (
    <>
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl bg-background border border-border/50 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {isImportingOperation && (
            <LoadingOverlay
              title={"Import de l'opération"}
              description="Veuillez patienter pendant la création de l'opération..."
            />
          )}
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/30 bg-muted/5">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Importer une opération
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Importez une opération depuis un fichier pour l'ajouter à cette intégration.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: File Selection & Model Download */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Fichier de spécification
                </span>
                <a
                  href="/templates/openapi-operation-template.yaml"
                  download="openapi-operation-template.yaml"
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
                  title="Télécharger le modèle OpenAPI au format YAML"
                >
                  <Download className="h-3 w-3" />
                  Télécharger le modèle(.yaml)
                </a>
              </div>

              {/* Upload Dropzone */}
              {!importFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/70 hover:border-accent/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-accent/5 space-y-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml,application/json,application/x-yaml,text/yaml,text/x-yaml"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground group-hover:text-accent transition-colors" />
                  <div className="text-xs font-semibold text-foreground">
                    Cliquez pour choisir un fichier ou glissez-le ici
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Format JSON ou YAML UTF-8 (Maximum 2 MiB)
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                      {isAnalyzingFile ? (
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      ) : (
                        <File className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {importFile.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span>{formatFileSize(importFile.size)}</span>
                        <span>•</span>
                        {isAnalyzingFile ? (
                          <span className="text-accent flex items-center gap-1 font-medium">
                            Analyse automatique en cours…
                          </span>
                        ) : hasAnalysisResults ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-3 w-3 inline" /> Analyse terminée
                          </span>
                        ) : importAnalysisError ? (
                          <span className="text-destructive font-medium">Échec de l'analyse</span>
                        ) : (
                          <span>Fichier sélectionné</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {importAnalysisError && !isAnalyzingFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyzeImportFile}
                        className="text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                        title="Relancer l'analyse du fichier"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Réessayer
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzingFile}
                      className="text-xs h-8"
                    >
                      Remplacer
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSelectImportFile(null)}
                      disabled={isAnalyzingFile}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Supprimer le fichier sélectionné"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.yaml,.yml,application/json,application/x-yaml,text/yaml,text/x-yaml"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {importAnalysisError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{importAnalysisError}</div>
                </div>
              )}

              {/* Aucune opération à sélectionner : le message reste sous le fichier */}
              {!hasAnalysisResults && <FieldError message={importFormErrors.candidate} />}
            </div>

            {/* Step 2: Discovered Candidates */}
            {hasAnalysisResults && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">Opérations découvertes</span>
                  {importCandidates.length > 3 && (
                    <div className="relative min-w-[170px] max-w-xs">
                      <Search className="absolute left-2.5 top-1.5 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Filtrer..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="pl-7 text-xs h-7 bg-background border-border/50"
                      />
                    </div>
                  )}
                </div>

                {filteredCandidates.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    Aucune opération ne correspond à votre recherche.
                  </div>
                ) : (
                  <div
                    aria-invalid={importFormErrors.candidate ? true : undefined}
                    className={`divide-y divide-border/30 border rounded-lg overflow-hidden max-h-[280px] overflow-y-auto ${
                      importFormErrors.candidate ? "border-destructive" : "border-border/40"
                    }`}
                  >
                    {filteredCandidates.map((candidate) => {
                      const candidateId = `${candidate.method}:${candidate.relative_path}`;
                      const isSelected =
                        selectedCandidate?.method === candidate.method &&
                        selectedCandidate?.relative_path === candidate.relative_path;
                      const hasErrors = candidate.errors && candidate.errors.length > 0;
                      const hasWarnings = candidate.warnings && candidate.warnings.length > 0;

                      return (
                        <div
                          key={candidateId}
                          onClick={() => { if (!hasErrors) handleSelectCandidate(candidate); }}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${hasErrors
                              ? "opacity-50 cursor-not-allowed bg-muted/5"
                              : isSelected
                                ? "bg-accent/10 cursor-pointer"
                                : "cursor-pointer hover:bg-muted/30"
                            }`}
                        >
                          {/* Radio dot */}
                          <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? "border-accent" : "border-border/50"}`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                          </div>

                          {/* Method */}
                          <Badge variant="outline" className={`font-mono text-[9px] font-bold px-1.5 py-0 shrink-0 ${getMethodBadgeClass(candidate.method)}`}>
                            {candidate.method}
                          </Badge>

                          {/* Path */}
                          <span className="font-mono text-[11px] font-medium text-foreground truncate flex-1">
                            {candidate.relative_path}
                          </span>

                          {/* Label */}
                          <span className="text-[11px] text-muted-foreground truncate max-w-[160px] hidden sm:block">
                            {candidate.label}
                          </span>

                          {/* Status */}
                          {hasErrors && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          {!hasErrors && hasWarnings && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
                <FieldError message={importFormErrors.candidate} />
              </div>
            )}

            {/* Step 3: Response Selection if Multiple */}
            {selectedCandidate && selectedCandidate.requires_response_selection && (
              <div
                aria-invalid={importFormErrors.response_code ? true : undefined}
                className={`p-4 rounded-xl bg-amber-500/5 border space-y-3 ${
                  importFormErrors.response_code ? "border-destructive" : "border-amber-500/20"
                }`}
              >
                <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  Sélectionnez le contrat de réponse souhaité (obligatoire) :
                </div>
                <div className="space-y-2">
                  {selectedCandidate.response_options.map((opt) => {
                    const isPicked = selectedResponseCode === opt.status_code;
                    const isNoBody = opt.response_schema === null;

                    return (
                      <div
                        key={opt.status_code}
                        onClick={() => setSelectedResponseCode(opt.status_code)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-3 transition-colors ${isPicked
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 font-semibold"
                          : "border-border/40 bg-background hover:bg-muted/10 text-muted-foreground"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {opt.status_code}
                          </Badge>
                          <span>
                            {isNoBody
                              ? "Sans corps de réponse"
                              : "Réponse standard avec schéma JSON"}
                          </span>
                        </div>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isPicked
                            ? "border-amber-600 bg-amber-600"
                            : "border-border/60"
                            }`}
                        >
                          {isPicked && <div className="w-1 h-1 bg-white rounded-full" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <FieldError message={importFormErrors.response_code} />
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border/40 gap-2 sm:gap-0 bg-background">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(false)}
              disabled={isImportingOperation}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={
                isImportingOperation ||
                isAnalyzingFile ||
                // Sélection manquante : le bouton reste actif pour afficher l'erreur sous le champ concerné
                Boolean(selectedCandidate?.errors && selectedCandidate.errors.length > 0)
              }
              onClick={() => void handleConfirmUseCandidate()}
              className="gradient-accent text-accent-foreground"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};
