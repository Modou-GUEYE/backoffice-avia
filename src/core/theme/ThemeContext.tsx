import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { getPartnerBranding } from "../partner-config/config";

export interface EntityBranding {
  id: string;
  entityName: string;
  logoUrl: string;
  faviconUrl: string;
  apsfdLogoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarColor: string;
  borderColor?: string;
  fontFamily: string;
  loginBgUrl: string;
  tagline: string;
}

interface ThemeContextType {
  branding: EntityBranding;
  setBranding: (b: EntityBranding) => void;
  resetBranding: () => void;
  allBrandings: EntityBranding[];
  saveBranding: (b: EntityBranding) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "avia_entity_brandings";

// Default branding fallback si config n'est pas chargée
export const DEFAULT_BRANDING: EntityBranding = {
  id: "default",
  entityName: "AVIA",
  logoUrl: "/logo_AVIA.png",
  faviconUrl: "/logo_AVIA.png",
  primaryColor: "#1a1a1a",
  secondaryColor: "#666666",
  accentColor: "#0066cc",
  sidebarColor: "#f8f9fa",
  fontFamily: "Inter",
  loginBgUrl: "/bg-login.jpg",
  tagline: "Plateforme de gestion AVIA",
};

const areBrandingsEqual = (a: EntityBranding, b: EntityBranding): boolean =>
  a.id === b.id &&
  a.entityName === b.entityName &&
  a.logoUrl === b.logoUrl &&
  a.faviconUrl === b.faviconUrl &&
  a.primaryColor === b.primaryColor &&
  a.secondaryColor === b.secondaryColor &&
  a.accentColor === b.accentColor &&
  a.sidebarColor === b.sidebarColor &&
  a.borderColor === b.borderColor &&
  a.fontFamily === b.fontFamily &&
  a.loginBgUrl === b.loginBgUrl &&
  a.tagline === b.tagline &&
  a.apsfdLogoUrl === b.apsfdLogoUrl;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const initialPartnerBranding = getPartnerBranding();
  const [allBrandings, setAllBrandings] = useState<EntityBranding[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [branding, setBranding] = useState<EntityBranding>(
    initialPartnerBranding || DEFAULT_BRANDING
  );

  // Re-sync branding when partner config loads
  useEffect(() => {
    const partnerBranding = getPartnerBranding();
    if (partnerBranding && areBrandingsEqual(branding, DEFAULT_BRANDING)) {
      setBranding(partnerBranding);
    }
  }, [branding]);

  // Apply CSS variables whenever branding changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", branding.primaryColor);
    root.style.setProperty("--secondary", branding.secondaryColor);
    root.style.setProperty("--accent", branding.accentColor);
    root.style.setProperty("--ring", branding.accentColor);
    root.style.setProperty("--sidebar-background", branding.sidebarColor);
    root.style.setProperty("--sidebar-foreground", branding.primaryColor);
    root.style.setProperty("--sidebar-secondary", branding.secondaryColor);
    root.style.setProperty("--sidebar-primary", branding.primaryColor);
    root.style.setProperty("--sidebar-accent", branding.accentColor);
    root.style.setProperty("--sidebar-border", branding.borderColor || branding.primaryColor);
    root.style.setProperty("--sidebar-ring", branding.accentColor);
    root.style.setProperty("--success", branding.accentColor);
    root.style.fontFamily = `'${branding.fontFamily}', system-ui, sans-serif`;

    // favicon
    if (branding.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = branding.faviconUrl;
    }

    // page title
    document.title = branding.entityName;
  }, [branding]);

  const applyBranding = useCallback((b: EntityBranding) => {
    setBranding((prev) => (areBrandingsEqual(prev, b) ? prev : b));
  }, []);

  const resetBranding = useCallback(() => {
    const partnerBranding = getPartnerBranding();
    applyBranding(partnerBranding || DEFAULT_BRANDING);
  }, [applyBranding]);

  const saveBranding = useCallback((b: EntityBranding) => {
    setAllBrandings((prev) => {
      const exists = prev.findIndex((x) => x.id === b.id);
      const updated = exists >= 0
        ? prev.map((x) => (x.id === b.id ? b : x))
        : [...prev, b];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const contextValue = useMemo(() => ({
    branding,
    setBranding: applyBranding,
    resetBranding,
    allBrandings,
    saveBranding,
  }), [branding, applyBranding, resetBranding, allBrandings, saveBranding]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider");
  return ctx;
};

