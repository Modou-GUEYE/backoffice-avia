import type { FeatureFlagKey } from "@/core/partner-config/config";
import { getFeatureFlag } from "@/core/partner-config/config";
import { FrontFeatureKey, hasFrontFeatureAccess } from "@/core/permissions/permissions";
import { getCurrentDistributorId, useAuthStore } from "@/core/security/authStore";
import { logoutAccessSecurityToken } from "@/core/security/accessSecurityService";
import { useTheme } from "@/core/theme/ThemeContext";
import { getProfileRoleDisplayLabel } from "@/features/utilisateurs/models/profileLabels";
import { fetchDistributeurById } from "@/features/distributeurs/services/distributeursService";
import { computeParametresAccess } from "@/features/parametres/models/parametresAccess";

import { NavLink } from "@/shared/components/NavLink";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  FileSpreadsheet,
  Handshake,
  History,
  Landmark,
  LogOut,
  MapPin,
  Package,
  ArrowLeftRight,
  Settings,
  Truck,
  UserCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  {
    title: "Tableau de bord",
    url: "/dashboard",
    icon: BarChart3,
    flag: "showDashboard",
    feature: "dashboard",
  },
  {
    title: "Journal des transactions",
    url: "/dashboard/transactions",
    icon: ArrowLeftRight,
    flag: "showDashboard",
    feature: "dashboard",
  },
  {
    title: "Relevés mensuels",
    url: "/dashboard/releves",
    icon: FileSpreadsheet,
    flag: "showDashboard",
    feature: "releves",
  },
  {
    title: "Partenaires",
    url: "/dashboard/partenaires",
    icon: Handshake,
    flag: "showPartenaires",
    feature: "partenaires",
  },
  {
    title: "Produits",
    url: "/dashboard/produits",
    icon: Package,
    flag: "showProduits",
    feature: "produits",
  },
  {
    title: "Structures",
    url: "/dashboard/structures",
    icon: Building2,
    flag: "showStructures",
    feature: "structures",
  },
  {
    title: "Agences",
    url: "/dashboard/agences",
    icon: MapPin,
    flag: "showAgences",
    feature: "agences",
  },
  {
    title: "Caisses",
    url: "/dashboard/caisses",
    icon: Landmark,
    flag: "showCaisses",
    feature: "caisses",
  },

  {
    title: "Utilisateurs",
    url: "/dashboard/utilisateurs",
    icon: Users,
    flag: "showUtilisateurs",
    feature: "utilisateurs",
  },
  {
    title: "Clients",
    url: "/dashboard/clients",
    icon: UserCheck,
    flag: "showUtilisateurs",
    feature: "clients",
  },
  {
    title: "Distributeurs",
    url: "/dashboard/distributeurs",
    icon: Truck,
    flag: "showEnsembleAutonome",
    feature: "distributeurs",
  },
  {
    title: "Tracking & Audit",
    url: "/dashboard/tracking",
    icon: History,
    flag: "showTracking",
    feature: "tracking",
  },
  {
    title: "Paramètres",
    url: "/dashboard/parametres",
    icon: Settings,
    flag: "showParametres",
    feature: "parametres",
  },
] as const;

const presentationEnabled = false;
const presentationHiddenRoutes = new Set([
  "/dashboard/parametres",
]);

const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { branding } = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const currentPermissions = useAuthStore((state) => state.user?.permissions);
  const user = useAuthStore((state) => state.user);
  const institutionId = user?.institutionId;
  const distributorId = getCurrentDistributorId();
  const isDistributor =
    user?.entityContext === "Distributeur" ||
    (Boolean(distributorId) && user?.entityContext !== "Administration" && user?.entityContext !== "Structure");
  const isAdministration = user?.entityContext === "Administration" || (!institutionId && !distributorId);

  const [logoError, setLogoError] = useState(false);
  const [distributorName, setDistributorName] = useState<string | null>(null);
  const [distributorLogo, setDistributorLogo] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isDistributor && distributorId) {
      if (user?.institutionLabel) {
        setDistributorName(user.institutionLabel);
      }
      fetchDistributeurById(distributorId)
        .then((distrib) => {
          if (isMounted && distrib) {
            const name = distrib.name || (distrib as unknown as { nom?: string }).nom;
            if (name) {
              setDistributorName(name);
            }
            const logo = distrib.media_url || (distrib as unknown as { logo?: string }).logo;
            if (logo) {
              setDistributorLogo(logo);
              useAuthStore.getState().updateUserMediaUrl(logo);
            }
          }
        })
        .catch((err) => {
          console.warn("[DashboardSidebar] Erreur lors de la récupération du nom du distributeur:", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isDistributor, distributorId, user?.institutionLabel]);

  // Logo de l'entité de l'utilisateur connecté (media_url)
  const displayLogoUrl = isDistributor
    ? (distributorLogo || (user?.media_url && !user.media_url.includes("logo_AVIA") ? user.media_url : null))
    : isAdministration
      ? "/logo_AVIA.png"
      : (user?.media_url || null);

  useEffect(() => {
    setLogoError(false);
  }, [displayLogoUrl]);

  const showImageLogo = Boolean(displayLogoUrl && !logoError);
  const displayStructureName = (!isAdministration && (distributorName || user?.institutionLabel))
    ? (distributorName || user?.institutionLabel)!
    : (branding.entityName || "AVIA");

  // Feature flags
  const showDashboard = getFeatureFlag("showDashboard");
  const showPartenaires = getFeatureFlag("showPartenaires" as FeatureFlagKey);
  const showStructures = getFeatureFlag("showStructures");
  const showProduits = getFeatureFlag("showProduits");
  const showAgences = getFeatureFlag("showAgences");
  const showCaisses = getFeatureFlag("showCaisses");
  const showUtilisateurs = getFeatureFlag("showUtilisateurs");
  const showEnsembleAutonome = getFeatureFlag("showEnsembleAutonome");
  const showParametres = getFeatureFlag("showParametres");
  const showTracking = getFeatureFlag("showTracking" as FeatureFlagKey);

  const flags: Record<string, boolean | number> = {
    showDashboard,
    showPartenaires,
    showStructures,
    showProduits,
    showAgences,
    showCaisses,
    showUtilisateurs,
    showEnsembleAutonome,
    showParametres,
    showTracking: showTracking !== false,
  };

  // Filter visible items
  const visibleItems = menuItems
    .filter((item) => {
      // Pour les distributeurs, cacher Agences, Caisses, Utilisateurs et Clients dans le sidebar
      // (ils gèrent directement leurs agences, caisses et utilisateurs dans leur fiche distributeur)
      if (
        isDistributor &&
        (item.feature === "agences" ||
          item.feature === "caisses" ||
          item.feature === "utilisateurs" ||
          item.feature === "clients")
      ) {
        return false;
      }

      // Pour un distributeur, il a toujours accès à sa fiche distributeur
      if (isDistributor && item.feature === "distributeurs" && distributorId) {
        return true;
      }

      // Paramètres : affiché seulement si au moins un onglet est accessible
      if (item.feature === "parametres") {
        return computeParametresAccess(user?.role, user?.entityContext, currentPermissions).hasAny;
      }

      const isEnabledByFeatureFlag = Boolean(
        flags[item.flag as keyof typeof flags],
      );
      if (!isEnabledByFeatureFlag) {
        return false;
      }

      const isAllowedByUserPermissions = hasFrontFeatureAccess(
        item.feature as FrontFeatureKey,
        currentPermissions,
      );
      if (!isAllowedByUserPermissions) {
        return false;
      }

      if (presentationEnabled && presentationHiddenRoutes.has(item.url)) {
        return false;
      }

      return true;
    })
    .map((item) => {
      // Pour un distributeur, le lien Distributeurs pointe directement vers sa propre fiche
      // avec le nom du distributeur comme libellé
      if (isDistributor && item.feature === "distributeurs" && distributorId) {
        return {
          ...item,
          title: distributorName || user?.institutionLabel || "Distributeur",
          url: `/dashboard/distributeurs/${distributorId}`,
        };
      }
      return item;
    });

  const handleLogout = async () => {
    const { refreshToken, token } = useAuthStore.getState();
    const tokenToLogout = refreshToken || token;

    try {
      if (tokenToLogout) {
        await logoutAccessSecurityToken(tokenToLogout);
      }
    } catch {
      // Ignore network or token errors during logout
    } finally {
      logout();
      navigate("/");
    }
  };

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } relative h-full bg-sidebar flex flex-col transition-all duration-300 ease-in-out border-r border-sidebar-border`}
    >
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-white hover:bg-white/10 hover:scale-110 shadow-lg transition-all duration-200 focus:outline-none"
        aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
      >
        <ChevronLeft
          className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
        />
      </button>

      {/* Header: Logo & Entity Info */}
      <div className={`flex items-center py-4 px-4 border-b border-sidebar-border/50 min-h-[4.5rem] ${collapsed ? "justify-center" : "gap-3"}`}>
        {collapsed ? (
          // Collapsed State: Logo Centered
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg p-1 transition-all duration-200 overflow-hidden ${
              showImageLogo ? "bg-white shadow-sm border border-white/20" : "bg-white/10"
            }`}
            title={displayStructureName}
          >
            {showImageLogo ? (
              <img
                src={displayLogoUrl!}
                alt="Logo"
                className="h-full w-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Building2 className="h-5 w-5 text-white/70" />
            )}
          </div>
        ) : (
          // Expanded State: Logo + Details
          <>
            <div
              className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg p-1 overflow-hidden transition-all duration-200 ${
                showImageLogo ? "bg-white shadow-sm border border-white/20" : "bg-white/10"
              }`}
            >
              {showImageLogo ? (
                <img
                  src={displayLogoUrl!}
                  alt="Logo"
                  className="h-full w-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Building2 className="h-5 w-5 text-white/70" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-white font-semibold text-sm leading-tight truncate" title={displayStructureName}>
                {displayStructureName}
              </span>
              <span className="text-white/50 text-[10px] uppercase tracking-wider font-semibold truncate mt-0.5">
                {getProfileRoleDisplayLabel(user)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isDistributeurActive =
            item.feature === "distributeurs" &&
            (location.pathname.startsWith("/dashboard/distributeurs") ||
             location.pathname.startsWith("/dashboard/ensemble-autonome"));
          const isActive = location.pathname === item.url || isDistributeurActive;
          const canNavigate =
            !presentationEnabled || !presentationHiddenRoutes.has(item.url);

          if (!canNavigate) {
            return (
              <button
                key={item.url}
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => {
                  // Navigation intentionally blocked during presentation mode
                }}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </button>
            );
          }

          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/dashboard"}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "text-white bg-white/10"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              activeClassName="text-white bg-white/10"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2">
        <NavLink
          to="/dashboard/profil"
          end
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            location.pathname === "/dashboard/profil"
              ? "text-white bg-white/10"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
          activeClassName="text-white bg-white/10"
        >
          <UserCircle className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Mon profil</span>}
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
