import React from "react";
import { motion } from "framer-motion";
import { UserRound, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileInfoTab, ProfileSecurityTab } from "./components";

const ProfilePage: React.FC = () => {
  return (
    <div className="p-6 lg:p-8 w-full space-y-6">
      {/* ===== HEADER ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center shrink-0">
          <UserRound className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
          <p className="text-muted-foreground text-sm">
            Gestion de vos informations et de votre sécurité
          </p>
        </div>
      </motion.div>

      {/* ===== ONGLETS SECTIONS ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="info" className="space-y-6 w-full">
          {/* Même présentation que les onglets des fiches détail (ex. Produit) */}
          <TabsList className="grid w-full grid-cols-2 max-w-sm h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="info" className="flex items-center justify-center gap-2 py-2">
              <UserRound className="h-4 w-4" /> Informations
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center justify-center gap-2 py-2">
              <KeyRound className="h-4 w-4" /> Mot de passe
            </TabsTrigger>
          </TabsList>

          {/* SECTION 1: INFORMATIONS DU COMPTE */}
          <TabsContent value="info" className="space-y-6 pt-2 w-full">
            <ProfileInfoTab />
          </TabsContent>

          {/* SECTION 2: CHANGEMENT DE MOT DE PASSE */}
          <TabsContent value="security" className="space-y-6 pt-2 w-full">
            <ProfileSecurityTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
