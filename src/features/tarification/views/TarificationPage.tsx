import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Percent, TrendingDown, Receipt, PieChart, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { useFees } from "../viewmodels/useFees";
import { useCaps } from "../viewmodels/useCaps";
import { useTaxes } from "../viewmodels/useTaxes";
import { useCommissions } from "../viewmodels/useCommissions";
import { usePromos } from "../viewmodels/usePromos";
import { TarificationSubTab } from "../models/types";
import { getTarificationSubTabs } from "../models/subTabs";
import type { ControlledSubTabProps } from "@/shared/navigation/subTabs";
import {
  FeesTab,
  CapsTab,
  TaxesTab,
  CommissionsTab,
  CommissionDialog,
  PromosTab,
  PromoDialog,
  FeeDialog,
  CapDialog,
  TaxDialog,
  TarificationConfirmationDialogs,
} from "./components";

export interface TarificationPageProps extends ControlledSubTabProps {
  embedded?: boolean;
}

export const TarificationPage: React.FC<TarificationPageProps> = ({
  embedded = false,
  subTab,
  onSubTabChange,
  hideSubTabNav = false,
}) => {
  const { currentPermissions = [] } = useCurrentActor();

  const subTabs = useMemo(() => getTarificationSubTabs(currentPermissions), [currentPermissions]);
  const visible = new Set(subTabs.items.map((item) => item.value));
  const canAccessFees = visible.has("frais");
  const canAccessCaps = visible.has("plafonds");
  const canAccessTaxes = visible.has("taxes");
  const canAccessCommissions = visible.has("commissions");
  const canAccessPromos = visible.has("promos");

  const defaultSubTab = subTabs.defaultValue as TarificationSubTab;

  const [internalSubTab, setInternalSubTab] = useState<string>(defaultSubTab);
  // Sous-onglet piloté par Paramètres quand il est fourni
  const currentSubTab = subTab ?? internalSubTab;
  const setCurrentSubTab = (value: string) => {
    setInternalSubTab(value);
    onSubTabChange?.(value);
  };

  // ViewModels (activés uniquement pour l'onglet actif)
  const feesVm = useFees({ enabled: canAccessFees && currentSubTab === "frais" });
  const capsVm = useCaps({
    enabled: canAccessCaps && currentSubTab === "plafonds",
    structures: feesVm.structures,
    catalogServices: feesVm.catalogServices,
    products: feesVm.produitsOptions,
    agencies: feesVm.agencies,
    distributors: feesVm.distributors,
  });
  const taxesVm = useTaxes({
    enabled: canAccessTaxes && currentSubTab === "taxes",
    structures: feesVm.structures,
    catalogServices: feesVm.catalogServices,
    products: feesVm.produitsOptions,
    agencies: feesVm.agencies,
    distributors: feesVm.distributors,
  });
  const commissionsVm = useCommissions({ enabled: canAccessCommissions && currentSubTab === "commissions" });
  const promosVm = usePromos({
    enabled: canAccessPromos && currentSubTab === "promos",
    structures: feesVm.structures,
    catalogServices: feesVm.catalogServices,
    agencies: feesVm.agencies,
    distributors: feesVm.distributors,
  });

  // Confirmation dialogs state for Caps and Taxes
  const [capToDelete, setCapToDelete] = useState<string | null>(null);
  const [taxToDelete, setTaxToDelete] = useState<string | null>(null);
  const [taxToToggle, setTaxToToggle] = useState<{ id: string; nextActive: boolean; label: string } | null>(null);

  const content = (
    <div className="space-y-6">
      <Tabs
        key={defaultSubTab}
        defaultValue={defaultSubTab}
        value={currentSubTab}
        onValueChange={setCurrentSubTab}
        className="space-y-6"
      >
        {!hideSubTabNav && (
        <TabsList className="flex flex-wrap h-auto w-full sm:w-auto gap-1 p-1 bg-muted/40 rounded-xl border border-border/30">
          {canAccessFees && (
            <TabsTrigger value="frais" className="flex-1 sm:flex-none px-3.5 py-2 text-xs rounded-lg flex items-center justify-center gap-1.5">
              <Percent className="h-3.5 w-3.5" />
              Frais
            </TabsTrigger>
          )}
          {canAccessCaps && (
            <TabsTrigger value="plafonds" className="flex-1 sm:flex-none px-3.5 py-2 text-xs rounded-lg flex items-center justify-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Plafonds
            </TabsTrigger>
          )}
          {canAccessTaxes && (
            <TabsTrigger value="taxes" className="flex-1 sm:flex-none px-3.5 py-2 text-xs rounded-lg flex items-center justify-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Taxes
            </TabsTrigger>
          )}
          {canAccessCommissions && (
            <TabsTrigger value="commissions" className="flex-1 sm:flex-none px-3.5 py-2 text-xs rounded-lg flex items-center justify-center gap-1.5">
              <PieChart className="h-3.5 w-3.5" />
              Commissions
            </TabsTrigger>
          )}
          {canAccessPromos && (
            <TabsTrigger value="promos" className="flex-1 sm:flex-none px-3.5 py-2 text-xs rounded-lg flex items-center justify-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Promotions
            </TabsTrigger>
          )}
        </TabsList>
        )}

        {canAccessFees && (
          <TabsContent value="frais">
            <FeesTab vm={feesVm} />
          </TabsContent>
        )}

        {canAccessCaps && (
          <TabsContent value="plafonds">
            <CapsTab
              vm={capsVm}
              onOpenDeleteCap={setCapToDelete}
              structures={feesVm.structures}
            />
          </TabsContent>
        )}

        {canAccessTaxes && (
          <TabsContent value="taxes">
            <TaxesTab
              vm={taxesVm}
              onOpenDeleteTax={setTaxToDelete}
              onOpenToggleTax={setTaxToToggle}
              structures={feesVm.structures}
              catalogServices={feesVm.catalogServices}
            />
          </TabsContent>
        )}

        {canAccessCommissions && (
          <TabsContent value="commissions">
            <CommissionsTab vm={commissionsVm} />
          </TabsContent>
        )}

        {canAccessPromos && (
          <TabsContent value="promos">
            <PromosTab vm={promosVm} />
          </TabsContent>
        )}
      </Tabs>

      {/* ===== ALL DIALOGS (ISOLATED IN COMPONENTS) ===== */}
      <FeeDialog vm={feesVm} />
      <CapDialog vm={capsVm} />
      <TaxDialog vm={taxesVm} />
      <CommissionDialog vm={commissionsVm} />
      <PromoDialog vm={promosVm} />

      <TarificationConfirmationDialogs
        feeToDelete={feesVm.feeToDelete}
        onCloseDeleteFee={() => feesVm.setFeeToDelete(null)}
        onConfirmDeleteFee={feesVm.confirmDeleteFee}
        feeToToggle={feesVm.feeToToggle}
        onCloseToggleFee={() => feesVm.setFeeToToggle(null)}
        onConfirmToggleFee={feesVm.confirmToggleFee}
        capToDelete={capToDelete}
        onCloseDeleteCap={() => setCapToDelete(null)}
        onConfirmDeleteCap={async () => {
          if (capToDelete) {
            await capsVm.removeCap(capToDelete);
            setCapToDelete(null);
          }
        }}
        taxToDelete={taxToDelete}
        onCloseDeleteTax={() => setTaxToDelete(null)}
        onConfirmDeleteTax={async () => {
          if (taxToDelete) {
            await taxesVm.removeTax(taxToDelete);
            setTaxToDelete(null);
          }
        }}
        taxToToggle={taxToToggle}
        onCloseToggleTax={() => setTaxToToggle(null)}
        onConfirmToggleTax={async () => {
          if (taxToToggle) {
            await taxesVm.toggleTax(taxToToggle.id, !taxToToggle.nextActive);
            setTaxToToggle(null);
          }
        }}
      />
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
          <Percent className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarification, Plafonds & Taxes</h1>
          <p className="text-muted-foreground text-sm">
            Configuration globale des règles financières, grilles tarifaires, plafonds, taxes, commissions et promotions.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {content}
      </motion.div>
    </div>
  );
};

export default TarificationPage;

