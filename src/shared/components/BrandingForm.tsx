import { EntityBranding } from "@/core/theme/ThemeContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Image, Upload, Trash2 } from "lucide-react";
import { useState, useEffect, useId, useRef } from "react";

interface BrandingFormProps {
  branding: Partial<EntityBranding>;
  onChange: (b: Partial<EntityBranding>) => void;
  showLogo?: boolean;
  onLogoFileChange?: (file: File | null) => void;
  entityId?: string;
}

// Convert HSL string to hex for color picker, and back
const hslToHex = (hsl: string) => {
  if (!hsl) return "";
  try {
    const cleanHsl = hsl.replace(/%/g, "");
    const parts = cleanHsl.trim().split(/\s+/);
    if (parts.length < 3) return "";
    const [h, s, l] = parts.map((v) => Number.parseFloat(v));
    if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return "";
    const sn = s / 100;
    const ln = l / 100;
    const a = sn * Math.min(ln, 1 - ln);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  } catch {
    return "";
  }
};

const hexToHsl = (hex: string) => {
  let cleanHex = hex.trim();
  if (cleanHex.startsWith("#")) {
    cleanHex = cleanHex.slice(1);
  }
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  if (cleanHex.length !== 6) {
    return null;
  }
  const r = Number.parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(cleanHex.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const ColorInput = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const [localHex, setLocalHex] = useState(() => hslToHex(value));
  const inputId = useId();

  useEffect(() => {
    const derivedHex = hslToHex(value);
    setLocalHex(derivedHex || "");
  }, [value]);

  const handleTextChange = (text: string) => {
    setLocalHex(text);
    const hsl = hexToHsl(text);
    if (hsl) {
      onChange(hsl);
    }
  };

  const handleColorPickerChange = (hex: string) => {
    const upperHex = hex.toUpperCase();
    setLocalHex(upperHex);
    const hsl = hexToHsl(upperHex);
    if (hsl) {
      onChange(hsl);
    }
  };

  const swatchColor = hslToHex(value);
  const isInvalid = localHex.trim() !== "" && !hexToHsl(localHex);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 transition-colors hover:border-border">
      {/* Pastille : le sélecteur natif est posé dessus, invisible, pour garder la palette du navigateur */}
      <label
        className="relative h-9 w-9 shrink-0 cursor-pointer rounded-full border border-border shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        style={{ backgroundColor: swatchColor || "transparent" }}
        title={`Choisir la couleur ${label.toLowerCase()}`}
      >
        <input
          type="color"
          value={swatchColor || "#10B981"}
          onChange={(e) => handleColorPickerChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`Couleur ${label}`}
        />
      </label>
      <div className="min-w-0 flex-1">
        <Label htmlFor={inputId} className="text-xs font-medium text-foreground">{label}</Label>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <Input
        id={inputId}
        value={localHex}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="#FFFFFF"
        aria-invalid={isInvalid}
        className={`h-8 w-[104px] shrink-0 text-xs font-mono uppercase ${isInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
      />
    </div>
  );
};

const COLOR_FIELDS: { key: keyof EntityBranding; label: string; hint: string }[] = [
  { key: "primaryColor", label: "Primaire", hint: "Boutons principaux, texte du menu" },
  { key: "secondaryColor", label: "Secondaire", hint: "Fonds et éléments secondaires" },
  { key: "accentColor", label: "Accent", hint: "Liens, focus, élément actif" },
  { key: "sidebarColor", label: "Sidebar", hint: "Fond du menu latéral" },
  { key: "borderColor", label: "Bordure", hint: "Traits du menu latéral" },
];

const toCssColor = (hsl?: string) => (hsl ? `hsl(${hsl})` : undefined);

/** Aperçu indicatif : menu latéral et contenu avec les couleurs choisies */
const BrandingPreview = ({ branding }: { branding: Partial<EntityBranding> }) => (
  <div className="space-y-2">
    <Label className="text-xs text-muted-foreground">Aperçu</Label>
    <div className="flex h-36 overflow-hidden rounded-lg border border-border bg-background">
      <div
        className="flex w-28 shrink-0 flex-col gap-1.5 border-r-2 p-2"
        style={{
          backgroundColor: toCssColor(branding.sidebarColor),
          borderColor: toCssColor(branding.borderColor || branding.primaryColor),
        }}
      >
        <div
          className="mb-1 h-3 w-14 rounded-sm opacity-90"
          style={{ backgroundColor: toCssColor(branding.primaryColor) }}
        />
        <div className="h-2 w-16 rounded-sm bg-white/30" />
        <div
          className="h-5 rounded-md"
          style={{ backgroundColor: toCssColor(branding.accentColor) }}
        />
        <div className="h-2 w-14 rounded-sm bg-white/30" />
        <div className="h-2 w-12 rounded-sm bg-white/30" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="h-2.5 w-24 rounded-sm bg-muted-foreground/30" />
        <div
          className="flex-1 rounded-md border border-border/50"
          style={{ backgroundColor: toCssColor(branding.secondaryColor) }}
        />
        <div className="flex gap-2">
          <div
            className="h-6 w-20 rounded-md"
            style={{ backgroundColor: toCssColor(branding.primaryColor) }}
          />
          <div
            className="h-6 w-14 rounded-md border-2"
            style={{ borderColor: toCssColor(branding.accentColor) }}
          />
        </div>
      </div>
    </div>
  </div>
);

const BrandingForm = ({ branding, onChange, showLogo = false, onLogoFileChange }: BrandingFormProps) => {
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof EntityBranding, value: string) => {
    onChange({ ...branding, [key]: value });
  };

  return (
    <div className="space-y-6">
      {showLogo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Image className="h-4 w-4 text-accent" />
              Logo de la structure
            </div>
            {branding.logoUrl && (
              <span className="text-[11px] text-muted-foreground font-medium">Format recommandé : PNG ou SVG</span>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/15 p-4 transition-all">
            <input
              id="branding-logo-input"
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file || !file.type.startsWith("image/")) {
                  return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                  const nextValue = typeof reader.result === "string" ? reader.result : "";
                  update("logoUrl", nextValue);
                  onLogoFileChange?.(file);
                };
                reader.readAsDataURL(file);
              }}
            />

            {branding.logoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo card preview */}
                <div className="h-20 w-20 rounded-xl border border-border/60 bg-white p-2 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={branding.logoUrl}
                    alt="Aperçu logo"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>

                {/* Details and Actions */}
                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Logo configuré</p>
                    <p className="text-[11px] text-muted-foreground">
                      Visible dans la barre latérale et sur les écrans de l'entité
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      Changer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update("logoUrl", "");
                        onLogoFileChange?.(null);
                        if (logoFileInputRef.current) {
                          logoFileInputRef.current.value = "";
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 bg-destructive/5 hover:bg-destructive/15 text-destructive transition-colors shadow-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                htmlFor="branding-logo-input"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const nextValue = typeof reader.result === "string" ? reader.result : "";
                      update("logoUrl", nextValue);
                      onLogoFileChange?.(file);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="group w-full cursor-pointer rounded-xl border-2 border-dashed border-border/80 hover:border-accent/60 bg-muted/10 hover:bg-accent/5 py-6 px-4 transition-all flex flex-col items-center justify-center gap-2 text-center"
              >
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Cliquez pour téléverser ou glissez-déposez le logo
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    PNG, JPG ou SVG (fond transparent ou blanc recommandé)
                  </p>
                </div>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Colors */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Palette className="h-4 w-4 text-accent" />
          Couleurs
        </div>
        {/* Une colonne : le formulaire vit aussi dans des boîtes étroites (max-w-2xl) */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {COLOR_FIELDS.map((field) => (
              <ColorInput
                key={field.key}
                label={field.label}
                hint={field.hint}
                value={(branding[field.key] as string | undefined) || ""}
                onChange={(v) => update(field.key, v)}
              />
            ))}
          </div>
          <BrandingPreview branding={branding} />
        </div>
      </div>
    </div>
  );
};

export default BrandingForm;
