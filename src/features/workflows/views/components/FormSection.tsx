import React from "react";
import { Badge } from "@/components/ui/badge";

interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Bloc titré utilisé pour regrouper les champs dans les dialogues de configuration. */
export const FormSection: React.FC<FormSectionProps> = ({
  icon,
  title,
  description,
  optional,
  className = "",
  children,
}) => (
  <section className={`rounded-xl border border-border/40 bg-card/50 p-4 space-y-3 ${className}`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </h4>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {optional && (
        <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground shrink-0">
          Optionnel
        </Badge>
      )}
    </div>
    {children}
  </section>
);

/** Ligne avec interrupteur (statut actif, champ obligatoire, etc.). */
export const SwitchRow: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  control: React.ReactNode;
}> = ({ id, icon, title, description, control }) => (
  <div className="rounded-xl border border-border/40 bg-card/50 p-4 flex items-center justify-between gap-4">
    <div>
      <label
        htmlFor={id}
        className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer"
      >
        {icon}
        {title}
      </label>
      <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
    </div>
    {control}
  </div>
);

export const jsonTextareaClassName =
  "w-full text-xs font-mono rounded-lg border border-border/50 bg-muted/20 p-2.5 focus:outline-none focus:ring-1 focus:ring-accent focus:bg-background transition-all";

/** Paire libellé / valeur affichée dans les dialogues de détail. */
export const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <span className="text-[11px] text-muted-foreground block font-medium">{label}</span>
    <div className="text-xs text-foreground mt-1 break-words">{children}</div>
  </div>
);

/** Bloc JSON en lecture seule, avec un texte de repli quand la valeur est absente. */
export const JsonBlock: React.FC<{ value: unknown; emptyLabel: string }> = ({ value, emptyLabel }) =>
  value ? (
    <pre className="p-3 rounded-lg bg-muted/20 border border-border/40 font-mono text-[11px] overflow-x-auto max-h-48">
      {JSON.stringify(value, null, 2)}
    </pre>
  ) : (
    <p className="text-[11px] text-muted-foreground italic">{emptyLabel}</p>
  );
