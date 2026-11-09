import React, { useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { getProfileDisplayName, requiresAgence, requiresCaisse, requiresDistributor } from "../../models/profileLabels";
import { useUtilisateurs } from "../../viewmodels/useUtilisateurs";

type StructureFieldProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  selectedId: string;
  selectedLabel?: string;
  structures: Array<{ id: string; name: string; code?: string }>;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  error?: string;
};

const StructureField = ({
  open,
  onOpenChange,
  disabled,
  selectedId,
  selectedLabel,
  structures,
  isLoading,
  search,
  onSearchChange,
  onSelect,
  error,
}: StructureFieldProps) => {
  let commandContent: React.ReactNode;
  if (isLoading) {
    commandContent = (
      <div className="flex justify-center items-center py-6 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Recherche en cours...
      </div>
    );
  } else if (structures.length === 0) {
    commandContent = <CommandEmpty>Aucune structure trouvée.</CommandEmpty>;
  } else {
    commandContent = (
      <CommandGroup>
        {structures.map((structure) => (
          <CommandItem key={structure.id} value={structure.id} onSelect={() => onSelect(structure.id)}>
            <Check className={cn("mr-2 h-4 w-4", selectedId === structure.id ? "opacity-100" : "opacity-0")} />
            {structure.name}{structure.code ? ` (${structure.code})` : ""}
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }

  return (
    <div className="space-y-1.5 col-span-2 flex flex-col">
      <Label>Structure <span className="text-destructive">*</span></Label>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            {...invalidFieldProps(error, "w-full justify-between font-normal border-input")}
            disabled={disabled}
          >
            {selectedLabel || (selectedId ? "Structure sélectionnée" : "Sélectionner une structure")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Rechercher une structure..." value={search} onValueChange={onSearchChange} />
            <CommandList>{commandContent}</CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FieldError message={error} />
    </div>
  );
};

export interface UtilisateurFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vm: ReturnType<typeof useUtilisateurs>;
}

type AgenceOption = { id: string; name: string; code?: string | null };

/** Sélection de plusieurs agences : aucune = siège (toutes les agences). */
const AgencesMultiSelect = ({
  agences,
  selectedIds,
  onChange,
}: {
  agences: AgenceOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = agences.filter((agence) => selectedIds.includes(agence.id));
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);


  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/* Même apparence que les listes déroulantes du formulaire : fond et texte inchangés au survol */}
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="truncate text-muted-foreground">Sélectionner une ou plusieurs agences</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher une agence..." />
            <CommandList>
              <CommandEmpty>Aucune agence trouvée.</CommandEmpty>
              <CommandGroup>
                {agences.map((agence) => {
                  const isSelected = selectedIds.includes(agence.id);
                  return (
                    <CommandItem
                      key={agence.id}
                      value={`${agence.name} ${agence.code ?? ""} ${agence.id}`}
                      onSelect={() => toggle(agence.id)}
                    >
                      {/* Case à cocher sur fond clair : reste lisible sur la ligne survolée (fond accent) */}
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        aria-hidden
                        className={cn(
                          "mr-2 pointer-events-none bg-background",
                          "data-[state=checked]:bg-background data-[state=checked]:text-primary",
                          isSelected ? "border-primary" : "border-muted-foreground/50",
                        )}
                      />
                      {agence.name}
                      {agence.code ? <span className="ml-1 opacity-70">({agence.code})</span> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {/* Agences choisies, affichées sous le champ */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((agence) => (
            <Badge key={agence.id} variant="secondary" className="gap-1 font-normal">
              {agence.name}
              <button
                type="button"
                onClick={() => toggle(agence.id)}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
                aria-label={`Retirer ${agence.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export const UtilisateurFormDialog: React.FC<UtilisateurFormDialogProps> = ({
  open,
  onOpenChange,
  vm,
}) => {
  const [structurePopoverOpen, setStructurePopoverOpen] = useState(false);
  const isStructureOrAgenceRole =
    vm.form.role.startsWith("profile.bo.structure-") || vm.form.role.startsWith("profile.bo.agence-");
  const showStructureField = vm.connectedEntityContext === "Administration" && isStructureOrAgenceRole;
  const showAgenceField = requiresAgence(vm.form.role);
  const showCaisseField = requiresCaisse(vm.form.role);
  const showDistributorField = requiresDistributor(vm.form.role);
  const isEditMode = Boolean(vm.editingUtilisateur);
  const errors = vm.formErrors;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={vm.editingUtilisateur ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
      description={
        vm.editingUtilisateur
          ? "Mettez à jour les informations du compte utilisateur."
          : "Renseignez les informations pour créer un nouvel utilisateur."
      }
      submitLabel={vm.editingUtilisateur ? "Modifier" : "Ajouter"}
      onSubmit={vm.save}
      loading={vm.isSaving}
      submitDisabled={vm.editingUtilisateur ? !vm.permissions.canUpdate : !vm.permissions.canCreate}
      contentClassName="max-w-2xl"
      submitClassName="gradient-accent text-accent-foreground"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Prénom */}
        <div className="space-y-1.5">
          <Label>Prénom <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Prénom"
            value={vm.form.prenom}
            {...invalidFieldProps(errors.prenom)}
            onChange={(e) => {
              vm.clearFormError("prenom");
              const prenom = e.target.value;
              const generatedLogin = isEditMode
                ? vm.form.username
                : vm.deriveLogin(prenom, vm.form.nom, vm.utilisateurs.map((u) => u.username));
              vm.setForm({
                ...vm.form,
                prenom,
                username: generatedLogin,
              });
            }}
          />
          <FieldError message={errors.prenom} />
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <Label>Nom <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Nom"
            value={vm.form.nom}
            {...invalidFieldProps(errors.nom)}
            onChange={(e) => {
              vm.clearFormError("nom");
              const nom = e.target.value;
              const generatedLogin = isEditMode
                ? vm.form.username
                : vm.deriveLogin(vm.form.prenom, nom, vm.utilisateurs.map((u) => u.username));
              vm.setForm({
                ...vm.form,
                nom,
                username: generatedLogin,
              });
            }}
          />
          <FieldError message={errors.nom} />
        </div>

        {/* Login (généré automatiquement depuis prénom + nom) */}
        <div className="space-y-1.5">
          <Label>Login <span className="text-destructive">*</span></Label>
          <Input
            value={vm.form.username}
            placeholder="Généré automatiquement"
            disabled
            readOnly
          />
        </div>

        {/* E-mail */}
        <div className="space-y-1.5">
          <Label>E-mail <span className="text-destructive">*</span></Label>
          <Input
            type="email"
            placeholder="utilisateur@domaine.com"
            value={vm.form.email}
            {...invalidFieldProps(errors.email)}
            onChange={(e) => {
              vm.clearFormError("email");
              vm.setForm({ ...vm.form, email: e.target.value });
            }}
          />
          <FieldError message={errors.email} />
        </div>

        {/* Téléphone */}
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input
            type="tel"
            placeholder="Ex: +221770000000"
            value={vm.form.telephone}
            onChange={(e) => vm.setForm({ ...vm.form, telephone: e.target.value })}
          />
        </div>

        {/* Matricule */}
        <div className="space-y-1.5">
          <Label>Matricule</Label>
          <Input
            placeholder="Matricule"
            value={vm.form.matricule ?? ""}
            onChange={(e) => vm.setForm({ ...vm.form, matricule: e.target.value })}
          />
        </div>

        {/* Profil */}
        <div className="space-y-1.5 col-span-2">
          <Label>Profil <span className="text-destructive">*</span></Label>
          <Select
            value={vm.form.role}
            onValueChange={(value) => {
              vm.clearFormError("role");
              vm.setForm({ ...vm.form, role: value, agenceId: "", agenceIds: [], caisseId: "" });
            }}
          >
            <SelectTrigger {...invalidFieldProps(errors.role)}>
              <SelectValue placeholder="Sélectionner un profil" />
            </SelectTrigger>
            <SelectContent>
              {vm.availableRoles.map((role) => (
                <SelectItem key={role} value={role}>{getProfileDisplayName(role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.role} />
        </div>

        {/* Structure (conditionnelle: visible uniquement pour l'admin créant un profil Structure/Agence) */}
        {showStructureField && (
          <StructureField
            open={structurePopoverOpen}
            onOpenChange={setStructurePopoverOpen}
            disabled={isEditMode}
            selectedId={vm.form.structure}
            selectedLabel={vm.structures.find((structure) => structure.id === vm.form.structure)?.name}
            structures={vm.structures}
            isLoading={vm.isStructuresLoading}
            search={vm.structureSearch}
            onSearchChange={vm.setStructureSearch}
            error={errors.structure}
            onSelect={(structureId) => {
              vm.clearFormError("structure");
              vm.setForm({ ...vm.form, structure: structureId, agenceId: "", agenceIds: [], caisseId: "" });
              setStructurePopoverOpen(false);
            }}
          />
        )}

        {/* Agence (conditionnelle: Superviseur ou Agent) — plusieurs agences possibles */}
        {showAgenceField && (
          <div className="space-y-1.5 col-span-2">
            <div className="flex items-center justify-between">
              <Label>Agences</Label>
              <span className="text-[11px] text-muted-foreground">Optionnel</span>
            </div>
            <AgencesMultiSelect
              agences={vm.agences}
              selectedIds={vm.form.agenceIds ?? []}
              onChange={(agenceIds) => vm.setForm({ ...vm.form, agenceIds, agenceId: "", caisseId: "" })}
            />
            <p className="text-[11px] text-muted-foreground">
              {(vm.form.agenceIds?.length ?? 0) === 0
                ? "Aucune agence : rattaché au siège, accès à toutes les agences."
                : (vm.form.agenceIds?.length ?? 0) === 1
                  ? "L'utilisateur est restreint aux informations de cette agence."
                  : "L'utilisateur est restreint aux informations des agences sélectionnées."}
            </p>
          </div>
        )}

        {/* Caisse (conditionnelle: Agent uniquement) */}
        {showCaisseField && (
          <div className="space-y-1.5 col-span-2">
            <div className="flex items-center justify-between">
              <Label>Caisse</Label>
              <span className="text-[11px] text-muted-foreground">Optionnel</span>
            </div>
            <Select
              value={vm.form.caisseId || "__none__"}
              onValueChange={(value) => vm.setForm({ ...vm.form, caisseId: value === "__none__" ? "" : value })}
              disabled={!vm.singleSelectedAgenceId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    vm.singleSelectedAgenceId ? "Sélectionner une caisse" : "Non applicable"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  Aucune caisse assignée
                </SelectItem>
                {vm.caissesForSelectedAgence.map((caisse) => (
                  <SelectItem key={caisse.id} value={caisse.id}>
                    {caisse.name}{caisse.code ? ` (${caisse.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Distributeur */}
        {showDistributorField && (
          <div className="space-y-1.5 col-span-2">
            <Label>Distributeur <span className="text-destructive">*</span></Label>
            <Select
              value={vm.form.distributorId ?? ""}
              onValueChange={(value) => {
                vm.clearFormError("distributorId");
                vm.setForm({ ...vm.form, distributorId: value });
              }}
            >
              <SelectTrigger {...invalidFieldProps(errors.distributorId)}>
                <SelectValue placeholder="Sélectionner un distributeur" />
              </SelectTrigger>
              <SelectContent>
                {vm.distributors.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    Aucun distributeur disponible
                  </SelectItem>
                ) : (
                  vm.distributors.map((distributor) => (
                    <SelectItem key={distributor.id} value={distributor.id}>
                      {distributor.nom}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FieldError message={errors.distributorId} />
          </div>
        )}
      </div>
    </FormDialog>
  );
};
