import React, { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Building2, Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { fetchStructures, fetchStructureById } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { cn } from "@/lib/utils";

export interface StructureSelectComboboxProps {
  value?: string | null;
  onChange: (structureId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
  id?: string;
  className?: string;
}

export const StructureSelectCombobox: React.FC<StructureSelectComboboxProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Sélectionner une structure",
  allowClear = true,
  clearLabel = "Sélectionner une structure",
  id,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [structures, setStructures] = useState<StructureRead[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<StructureRead | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load selected structure details when value changes
  useEffect(() => {
    if (!value) {
      setSelectedStructure(null);
      return;
    }

    const found = structures.find((s) => s.id === value);
    if (found) {
      setSelectedStructure(found);
      return;
    }

    let isMounted = true;
    fetchStructureById(value)
      .then((s) => {
        if (isMounted) setSelectedStructure(s);
      })
      .catch(() => {
        // Fallback: search by ID
        fetchStructures(value)
          .then((res) => {
            if (isMounted && res.items.length > 0) {
              const matched = res.items.find((item) => item.id === value) || res.items[0];
              setSelectedStructure(matched);
            }
          })
          .catch(() => {
            // Keep fallback
          });
      });

    return () => {
      isMounted = false;
    };
  }, [value, structures]);

  // Dynamic server search without local client filtering
  const performSearch = (searchTerm: string) => {
    setIsLoading(true);
    fetchStructures({
      search: searchTerm.trim() || undefined,
      limit: 30,
      include_inactive: true,
    })
      .then((res) => {
        setStructures(res.items);
      })
      .catch((err) => {
        console.error("[StructureSelectCombobox] Erreur recherche structures:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performSearch(newSearch);
    }, 300);
  };

  // Pre-load on first popover open if empty
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && structures.length === 0) {
      performSearch("");
    }
  };

  const handleSelectStructure = (structureId: string | null) => {
    onChange(structureId);
    if (structureId) {
      const found = structures.find((s) => s.id === structureId);
      if (found) setSelectedStructure(found);
    } else {
      setSelectedStructure(null);
    }
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full h-9 justify-between text-xs font-normal border-border/50 bg-background px-3",
              !value && "text-muted-foreground",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {value ? (
                <>
                  <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="truncate text-foreground font-medium">
                    {selectedStructure ? selectedStructure.name : value}
                  </span>
                </>
              ) : (
                <>
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{placeholder}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {value && allowClear && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectStructure(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      handleSelectStructure(null);
                    }
                  }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Effacer la sélection"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 border-border/50 rounded-xl shadow-xl bg-background"
          align="start"
        >
          <Command shouldFilter={false} className="w-full">
            <CommandInput
              placeholder="Rechercher une structure..."
              value={search}
              onValueChange={handleSearchChange}
              className="text-xs h-9"
            />
            <CommandList className="max-h-60 overflow-y-auto p-1">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  Recherche des structures...
                </div>
              ) : (
                <>
                  <CommandGroup>
                    {allowClear && (
                      <CommandItem
                        value="__global_template__"
                        onSelect={() => handleSelectStructure(null)}
                        className="text-xs cursor-pointer flex items-center justify-between py-2 px-2 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className={cn("truncate font-medium", !value && "font-semibold")}>
                            {clearLabel || placeholder}
                          </span>
                        </div>
                        {!value && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </CommandItem>
                    )}

                    {structures.map((structure) => {
                      const isSelected = value === structure.id;
                      return (
                        <CommandItem
                          key={structure.id}
                          value={structure.id}
                          onSelect={() => handleSelectStructure(structure.id)}
                          className="text-xs cursor-pointer flex items-center justify-between py-2 px-2 rounded-lg"
                        >
                          <span className={cn("truncate font-medium", isSelected && "font-semibold")}>
                            {structure.name}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>

                  {structures.length === 0 && (
                    <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                      Aucune structure trouvée.
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
