import React from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useAdministration } from "../viewmodels/useAdministration";
import {
  AdministrationFormCard,
  AdministrationListCard,
  AdministrationConfirmationDialog,
} from "./components";

export interface AdministrationPageProps {
  embedded?: boolean;
}

export const AdministrationPage: React.FC<AdministrationPageProps> = ({ embedded = false }) => {
  const vm = useAdministration({ enabled: true });

  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <AdministrationFormCard vm={vm} />
        <AdministrationListCard vm={vm} />
      </div>

      <AdministrationConfirmationDialog vm={vm} />
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
          <Building2 className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground text-sm">
            Gestion des entités faîtières et d'administration centrale de la plateforme.
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

export default AdministrationPage;
