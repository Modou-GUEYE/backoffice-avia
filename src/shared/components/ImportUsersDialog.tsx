import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileText, CheckCircle2, XCircle, Download, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type ImportedUserRow = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profiles: string;
  matricule?: string;
  rowIndex: number;
  errors: string[];
};

type ImportUsersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé avec les lignes valides parsées du fichier */
  onImportRows?: (rows: ImportedUserRow[]) => void;
  /** Appelé avec le fichier brut pour envoi à l'API */
  onImportFile?: (file: File) => void;
};

const REQUIRED_COLUMNS = ["username", "email", "profiles"];
const ALL_COLUMNS = ["username", "email", "first_name", "last_name", "profiles", "matricule"];

const validateRow = (row: Record<string, string>, rowIndex: number): ImportedUserRow => {
  const errors: string[] = [];
  const username = (row["username"] ?? "").trim();
  const email = (row["email"] ?? "").trim();
  const first_name = (row["first_name"] ?? "").trim();
  const last_name = (row["last_name"] ?? "").trim();
  const profiles = (row["profiles"] ?? "").trim();
  const matricule = (row["matricule"] ?? "").trim() || undefined;

  if (!username) errors.push("username manquant");
  if (!email) errors.push("email manquant");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email invalide");
  if (!profiles) errors.push("profiles manquant");

  return { username, email, first_name, last_name, profiles, matricule, rowIndex, errors };
};

const parseFile = async (file: File): Promise<{ rows: ImportedUserRow[]; missingColumns: string[] }> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

  if (raw.length === 0) return { rows: [], missingColumns: REQUIRED_COLUMNS };

  const fileColumns = Object.keys(raw[0]).map((k) => k.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !fileColumns.includes(c));
  if (missingColumns.length > 0) return { rows: [], missingColumns };

  const normalized = raw.map((r) => {
    const entry: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      entry[k.trim().toLowerCase()] = String(v ?? "").trim();
    }
    return entry;
  });

  const rows = normalized.map((r, i) => validateRow(r, i + 2)); // row 1 = header
  return { rows, missingColumns: [] };
};

const ImportUsersDialog = ({ open, onOpenChange, onImportRows, onImportFile }: ImportUsersDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ImportedUserRow[] | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const validRows = parsedRows?.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = parsedRows?.filter((r) => r.errors.length > 0) ?? [];

  const handleClose = () => {
    if (isParsing) return;
    setSelectedFile(null);
    setParsedRows(null);
    setMissingColumns([]);
    setParseError(null);
    onOpenChange(false);
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setParsedRows(null);
    setMissingColumns([]);
    setParseError(null);
    setIsParsing(true);
    try {
      const { rows, missingColumns: missing } = await parseFile(file);
      setMissingColumns(missing);
      setParsedRows(rows);
    } catch {
      setParseError("Impossible de lire le fichier. Vérifiez qu'il est au format CSV ou Excel.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleConfirm = () => {
    if (validRows.length === 0 || !selectedFile) return;
    if (onImportRows) onImportRows(validRows);
    if (onImportFile) onImportFile(selectedFile);
    handleClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import d'utilisateurs depuis un fichier
          </DialogTitle>
          <DialogDescription>
            Les utilisateurs seront ajoutés à la liste et créés lors de la sauvegarde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Téléchargez le modèle.</p>
            <a href="/templates/import_utilisateurs_template.xlsx" download>
              <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5 h-7">
                <Download className="h-3.5 w-3.5" />
                Modèle Excel (.xlsx)
              </Button>
            </a>
          </div>

          {/* Drop zone */}
          <div
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer
              ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"}
              ${isParsing ? "pointer-events-none opacity-60" : ""}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />
            {isParsing ? (
              <><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Lecture du fichier…</p></>
            ) : selectedFile ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(selectedFile.size)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Cliquer pour changer</p>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Glissez votre fichier ici</p>
                  <p className="text-xs text-muted-foreground mt-1">ou <span className="text-primary">parcourir</span> · CSV, XLSX, XLS</p>
                </div>
              </>
            )}
          </div>

          {/* Colonnes attendues (avant sélection) */}
          {!selectedFile && !isParsing && (
            <div className="rounded-md border border-border p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Colonnes attendues :</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COLUMNS.map((col) => (
                  <span key={col} className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-mono
                    ${REQUIRED_COLUMNS.includes(col) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {col}
                    {REQUIRED_COLUMNS.includes(col) && <span className="text-destructive text-[10px]">*</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Colonnes manquantes */}
          {missingColumns.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-destructive">Colonnes obligatoires manquantes :</p>
                <p className="text-muted-foreground mt-0.5 font-mono">{missingColumns.join(", ")}</p>
              </div>
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3">
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{parseError}</p>
            </div>
          )}

          {/* Résultats du parsing */}
          {parsedRows && missingColumns.length === 0 && !parseError && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">{validRows.length}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">valide(s)</p>
                  </div>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{invalidRows.length}</p>
                      <p className="text-xs text-red-500">erreur(s)</p>
                    </div>
                  </div>
                )}
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="bg-muted/40 px-3 py-1.5 border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground">Lignes ignorées (erreurs)</p>
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border">
                    {invalidRows.map((row) => (
                      <div key={row.rowIndex} className="flex items-start gap-2 px-3 py-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-medium">Ligne {row.rowIndex}</span>
                          {row.username && <span className="text-muted-foreground ml-1">({row.username})</span>}
                          <span className="text-muted-foreground"> — {row.errors.join(", ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isParsing}>Annuler</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFile || validRows.length === 0}
            className="gradient-primary text-primary-foreground"
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportUsersDialog;
