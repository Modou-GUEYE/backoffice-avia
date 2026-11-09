import React from "react";
import { Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UpdateStructureParamsRequest } from "../../models/types";

interface ConnectivityAccountsCardProps {
  form: UpdateStructureParamsRequest;
  onChange: (updated: UpdateStructureParamsRequest) => void;
  disabled?: boolean;
}

export const ConnectivityAccountsCard: React.FC<ConnectivityAccountsCardProps> = ({
  form,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Building2 className="h-4 w-4 text-accent" /> Connectivité & Comptes
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Format du compte bénéficiaire</Label>
          <Select
            value={form.compte_beneficiaire_format || "NUMERIC"}
            onValueChange={(v) => onChange({ ...form, compte_beneficiaire_format: v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NUMERIC" className="text-xs">Numérique</SelectItem>
              <SelectItem value="ALPHANUMERIC" className="text-xs">Alphanumérique</SelectItem>
              <SelectItem value="IBAN" className="text-xs">IBAN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Longueur du compte bénéficiaire</Label>
          <Input
            type="number"
            min={0}
            className="h-9 text-xs"
            value={form.compte_beneficiaire_length ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                compte_beneficiaire_length: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="Ex. 24"
            disabled={disabled}
          />
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/5">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground block">Double Authentification</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Exiger une validation à deux facteurs
              </span>
            </div>
            <Switch
              checked={form.double_auth_enabled ?? false}
              onCheckedChange={(checked) => onChange({ ...form, double_auth_enabled: checked })}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/5">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground block">Ouverture Mutualisation</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Autoriser la mutualisation des comptes
              </span>
            </div>
            <Switch
              checked={form.ouverture_mutualisation ?? false}
              onCheckedChange={(checked) => onChange({ ...form, ouverture_mutualisation: checked })}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/5">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground block">Opérations POS Externe</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Accepter les opérations provenant de terminaux de paiement externes
              </span>
            </div>
            <Switch
              checked={form.accepte_operations_pos_externe ?? false}
              onCheckedChange={(checked) =>
                onChange({ ...form, accepte_operations_pos_externe: checked })
              }
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectivityAccountsCard;
