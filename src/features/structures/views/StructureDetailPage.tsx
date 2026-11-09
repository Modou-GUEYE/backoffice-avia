import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ArrowLeft, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStructureDetail } from "../viewmodels/useStructureDetail";
import {
  StructureDetailsTab,
  StructureAgencesTab,
  StructureCaissesTab,
  StructureEnsemblesTab,
  StructureUsersTab,
  StructureConfigurationsTab,
} from "./tabs";

interface StructureLogoProps {
  src?: string | null;
  alt: string;
}

const StructureLogo = ({ src, alt }: StructureLogoProps) => {
  const [hasError, setHasError] = useState(false);

  const validSrc = src && !hasError ? src : null;

  if (validSrc) {
    return (
      <img
        src={validSrc}
        alt={alt}
        className="h-full w-full object-contain p-2"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
      <Building2 className="h-7 w-7" />
    </div>
  );
};

const StructureDetailPage = () => {
  const vm = useStructureDetail();
  const navigate = useNavigate();

  if (vm.loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!vm.structure) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/structures")}
          className="gap-2 hover:bg-transparent hover:text-inherit"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux structures
        </Button>
        <div className="text-center py-12 text-muted-foreground">Structure introuvable</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent hover:text-inherit shrink-0"
            onClick={() => navigate("/dashboard/structures")}
            aria-label="Retour aux structures"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <StructureLogo
              key={vm.structure.media_url || "default"}
              src={vm.structure.media_url}
              alt={vm.structure.name}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vm.structure.name}</h1>
            <p className="text-muted-foreground text-sm flex items-center flex-wrap gap-x-2">
              {vm.structure.code && (
                <span>
                  Code : <span className="font-medium text-foreground">{vm.structure.code}</span>
                </span>
              )}
              {vm.structure.code && <span className="text-muted-foreground/40">•</span>}
              <span>
                Type : <span className="font-medium text-foreground">{vm.structure.type || "OTHER"}</span>
              </span>
            </p>
          </div>
        </div>
        <Badge
          className={
            vm.structure.is_active
              ? "bg-accent/15 text-accent border-accent/30 self-start sm:self-auto"
              : "bg-destructive/15 text-destructive border-destructive/30 self-start sm:self-auto"
          }
          variant="outline"
        >
          {vm.structure.is_active ? "Actif" : "Inactif"}
        </Badge>
      </motion.div>

      {/* Onglets principaux */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Tabs value={vm.activeTab} onValueChange={vm.handleTabChange} className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="agences">Agences</TabsTrigger>
            <TabsTrigger value="caisses">Caisses</TabsTrigger>
            <TabsTrigger value="ensembles">Distributeurs</TabsTrigger>
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
            <TabsTrigger value="configs">Configurations</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <StructureDetailsTab vm={vm} />
          </TabsContent>

          <TabsContent value="agences" className="space-y-4">
            <StructureAgencesTab vm={vm} />
          </TabsContent>

          <TabsContent value="caisses" className="space-y-4">
            <StructureCaissesTab vm={vm} />
          </TabsContent>

          <TabsContent value="ensembles" className="space-y-4">
            <StructureEnsemblesTab vm={vm} />
          </TabsContent>

          <TabsContent value="utilisateurs" className="space-y-4">
            <StructureUsersTab vm={vm} />
          </TabsContent>

          <TabsContent value="configs" className="space-y-6">
            <StructureConfigurationsTab vm={vm} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default StructureDetailPage;
