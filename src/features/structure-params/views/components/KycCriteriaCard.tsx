import React from "react";
import { Shield } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UpdateStructureParamsRequest } from "../../models/types";

interface KycCriteriaCardProps {
  form: UpdateStructureParamsRequest;
  onChange: (updated: UpdateStructureParamsRequest) => void;
  disabled?: boolean;
}

export const KycCriteriaCard: React.FC<KycCriteriaCardProps> = ({
  form,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Shield className="h-4 w-4 text-accent" /> Seuils de correspondance KYC
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Seuil correspondance Nom (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9 text-xs"
            value={form.kyc_match_nom_pct ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                kyc_match_nom_pct: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Ex. 80"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Seuil correspondance Prénom (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9 text-xs"
            value={form.kyc_match_prenom_pct ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                kyc_match_prenom_pct: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Ex. 80"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Seuil correspondance Date de Naissance (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9 text-xs"
            value={form.kyc_match_date_naissance_pct ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                kyc_match_date_naissance_pct: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Ex. 90"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Seuil correspondance Libellé/Nom Entreprise (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9 text-xs"
            value={form.kyc_match_libelle_pct ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                kyc_match_libelle_pct: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Ex. 85"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Seuil correspondance NINEA (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9 text-xs"
            value={form.kyc_match_ninea_pct ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                kyc_match_ninea_pct: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Ex. 95"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Seuil correspondance NIF (Identité Fiscale) (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9 text-xs"
            value={form.kyc_match_num_identite_fiscale_pct ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                kyc_match_num_identite_fiscale_pct: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Ex. 95"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default KycCriteriaCard;
