import DashboardLayout from "@/core/layout/DashboardLayout";
import { getFeatureFlag, updateFeatureFlags, resetFeatureFlags, FeatureFlagKey } from "@/core/partner-config/config";
import { FrontFeatureKey, hasFrontFeatureAccess } from "@/core/permissions/permissions";
import {
  getCurrentDistributorId,
  getCurrentInstitutionId,
  hasBackofficeAccess,
  useAuthStore,
} from "@/core/security/authStore";
import { useTheme, EntityBranding, DEFAULT_BRANDING } from "@/core/theme/ThemeContext";
import { fetchStructureById } from "@/features/structures/services/structuresService";
import { fetchPartenaireById } from "@/features/partenaires/services/partenairesService";
import AgenceDetailPage from "@/features/agences/views/AgenceDetailPage";
import AgencesPage from "@/features/agences/views/AgencesPage";
import ForgotPasswordPage from "@/features/auth/views/ForgotPasswordPage";
import LoginPage from "@/features/auth/views/LoginPage";
import ProfilePage from "@/features/auth/views/ProfilePage";
import SetPasswordPage from "@/features/auth/views/SetPasswordPage";
import CaissesPage from "@/features/caisses/views/CaissesPage";
import CaisseDetailPage from "@/features/caisses/views/CaisseDetailPage";
import ClientsPage from "@/features/clients/views/ClientsPage";
import ClientEnrollmentActionPage from "@/features/clients/views/ClientEnrollmentActionPage";
import ClientEnrollmentDetailsPage from "@/features/clients/views/ClientEnrollmentDetailsPage";
import DashboardPage from "@/features/dashboard/views/DashboardPage";
import DistributeurDetailPage from "@/features/distributeurs/views/DistributeurDetailPage";
import DistributeursPage from "@/features/distributeurs/views/DistributeursPage";
import ParametresPage from "@/features/parametres/views/ParametresPage";
import { computeParametresAccess } from "@/features/parametres/models/parametresAccess";
import CommissionDetailPage from "@/features/tarification/views/CommissionDetailPage";
import FeeDetailPage from "@/features/tarification/views/FeeDetailPage";
import PromoDetailPage from "@/features/tarification/views/PromoDetailPage";
import ServiceDetailPage from "@/features/packages/views/ServiceDetailPage";
import PartenairesPage from "@/features/partenaires/views/PartenairesPage";
import PartenaireDetailPage from "@/features/partenaires/views/PartenaireDetailPage";
import ProduitsPage from "@/features/produits/views/ProduitsPage";
import ProduitDetailPage from "@/features/produits/views/ProduitDetailPage";
import StructuresPage from "@/features/structures/views/StructuresPage";
import StructureDetailPage from "@/features/structures/views/StructureDetailPage";
import TrackingPage from "@/features/tracking/views/TrackingPage";
import RelevesPage from "@/features/releves/views/RelevesPage";
import ReleveDetailPage from "@/features/releves/views/ReleveDetailPage";
import TrackingEventDetailPage from "@/features/tracking/views/TrackingEventDetailPage";
import TransactionsPage from "@/features/transactions/views/TransactionsPage";
import UtilisateursPage from "@/features/utilisateurs/views/UtilisateursPage";
import { toast } from "@/hooks/use-toast";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const LoginEntry = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const targetPath = (location.state as { from?: string } | null)?.from;

  if (isAuthenticated && hasBackofficeAccess(token)) {
    return <Navigate to={targetPath || "/dashboard"} replace />;
  }

  return <LoginPage />;
};

const FeatureRoute = ({
  flag,
  feature,
  element,
}: {
  flag: FeatureFlagKey;
  feature: FrontFeatureKey;
  element: JSX.Element;
}) => {
  useTheme(); // Triggers re-render when branding/config changes
  const isEnabled = Boolean(getFeatureFlag(flag));
  const user = useAuthStore((state) => state.user);
  const currentPermissions = user?.permissions;
  const isAllowedByPermissions = hasFrontFeatureAccess(feature, currentPermissions);

  const distributorId = getCurrentDistributorId();
  // Paramètres : même règle que le menu (au moins un onglet accessible)
  if (flag === "showParametres") {
    const hasAnyTab = computeParametresAccess(user?.role, user?.entityContext, currentPermissions).hasAny;
    return hasAnyTab ? element : <Navigate to="/dashboard" replace />;
  }
  if (flag === "showEnsembleAutonome" && Boolean(distributorId)) {
    return element;
  }

  if (!isEnabled || !isAllowedByPermissions) {
    return <Navigate to="/dashboard" replace />;
  }

  return element;
};

const DISTRIBUTEURS_SUBROUTES = [
  { path: "", element: <DistributeursPage /> },
  { path: ":id", element: <DistributeurDetailPage /> },
  { path: ":distributorId/agences/:id", element: <AgenceDetailPage /> },
  { path: ":distributorId/caisses/:id", element: <CaisseDetailPage /> },
];

const PARAMETRES_SUBROUTES = [
  { path: "parametres", element: <ParametresPage /> },
  { path: "parametres/commissions/:id", element: <CommissionDetailPage /> },
  { path: "parametres/frais/:id", element: <FeeDetailPage /> },
  { path: "parametres/promos/:id", element: <PromoDetailPage /> },
  { path: "parametres/services/:id", element: <ServiceDetailPage /> },
  { path: "packages/services/:id", element: <ServiceDetailPage /> },
];

const SessionBrandingHandler = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const institutionId = getCurrentInstitutionId();
  const distributorId = getCurrentDistributorId();
  const { setBranding, resetBranding } = useTheme();

  useEffect(() => {
    let isMounted = true;

    const resetSessionState = () => {
      resetBranding();
      resetFeatureFlags();
      useAuthStore.getState().updateUserMediaUrl(null);
    };

    // Pour les utilisateurs distributeur (pas de STRUCTURE dans le token),
    // on active directement showEnsembleAutonome sans charger la structure
    if (isAuthenticated && !institutionId && distributorId) {
      updateFeatureFlags({ showEnsembleAutonome: true });
      return () => {
        isMounted = false;
      };
    }

    if (!isAuthenticated || !institutionId || user?.entityContext === "Administration") {
      resetSessionState();
      return () => {
        isMounted = false;
      };
    }

    // Partenaire : l'identifiant du jeton (groupe PARTNER) est celui du partenaire, pas d'une structure
    if (user?.entityContext === "Partenaire") {
      resetSessionState();
      fetchPartenaireById(institutionId)
        .then((partner) => {
          if (isMounted && partner?.name) {
            useAuthStore.getState().updateResolvedEntities({ institutionId, institutionLabel: partner.name });
          }
        })
        .catch((err) => {
          console.warn("[SessionBrandingHandler] Failed to load partner:", err);
        });
      return () => {
        isMounted = false;
      };
    }

    fetchStructureById(institutionId)
      .then((structure) => {
        if (!isMounted) return;

        if (structure?.is_active === false) {
          useAuthStore.getState().logout();
          toast({
            title: "Accès refusé",
            description: "Votre structure/institution est désactivée. Veuillez contacter un administrateur.",
            variant: "destructive",
          });
          return;
        }

        if (structure?.name) {
          useAuthStore.getState().updateResolvedEntities({
            institutionId: structure.id,
            institutionLabel: structure.name,
          });
        }

        if (!distributorId) {
          useAuthStore.getState().updateUserMediaUrl(structure.media_url ?? null);
        }

        if (structure?.branding_config) {
          const config = structure.branding_config as Partial<EntityBranding>;
          setBranding({
            ...DEFAULT_BRANDING,
            ...config,
            id: structure.id,
            entityName: config.entityName || structure.name,
          });
        } else {
          resetBranding();
        }

        resetFeatureFlags();
      })
      .catch((err) => {
        console.warn("[SessionBrandingHandler] Failed to load structure config:", err);
        resetSessionState();
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, institutionId, distributorId, user?.entityContext, resetBranding, setBranding]);

  return null;
};

const AppRouter = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionBrandingHandler />
      <Routes>
        <Route path="/" element={<LoginEntry />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<FeatureRoute flag="showDashboard" feature="dashboard" element={<TransactionsPage />} />} />
          <Route path="releves" element={<FeatureRoute flag="showDashboard" feature="releves" element={<RelevesPage />} />} />
          <Route
            path="releves/:releveId"
            element={<FeatureRoute flag="showDashboard" feature="releves" element={<ReleveDetailPage />} />}
          />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="structures" element={<FeatureRoute flag="showStructures" feature="structures" element={<StructuresPage />} />} />
          <Route path="structures/:id" element={<FeatureRoute flag="showStructures" feature="structures" element={<StructureDetailPage />} />} />
          <Route path="produits" element={<FeatureRoute flag="showProduits" feature="produits" element={<ProduitsPage />} />} />
          <Route path="produits/:id" element={<FeatureRoute flag="showProduits" feature="produits" element={<ProduitDetailPage />} />} />
          <Route path="agences" element={<FeatureRoute flag="showAgences" feature="agences" element={<AgencesPage />} />} />
          <Route path="agences/:id" element={<FeatureRoute flag="showAgences" feature="agences" element={<AgenceDetailPage />} />} />
          <Route path="caisses" element={<FeatureRoute flag="showCaisses" feature="caisses" element={<CaissesPage />} />} />
          <Route path="caisses/:id" element={<FeatureRoute flag="showCaisses" feature="caisses" element={<CaisseDetailPage />} />} />
          <Route path="utilisateurs" element={<FeatureRoute flag="showUtilisateurs" feature="utilisateurs" element={<UtilisateursPage />} />} />
          <Route path="clients" element={<FeatureRoute flag="showUtilisateurs" feature="clients" element={<ClientsPage />} />} />
          <Route path="clients/:enrollmentId/details" element={<FeatureRoute flag="showUtilisateurs" feature="clients" element={<ClientEnrollmentDetailsPage />} />} />
          <Route path="clients/:enrollmentId/action/:action" element={<FeatureRoute flag="showUtilisateurs" feature="clients" element={<ClientEnrollmentActionPage />} />} />
          {["distributeurs", "ensemble-autonome"].flatMap((prefix) =>
            DISTRIBUTEURS_SUBROUTES.map(({ path, element }) => (
              <Route
                key={`${prefix}-${path}`}
                path={path ? `${prefix}/${path}` : prefix}
                element={<FeatureRoute flag="showEnsembleAutonome" feature="distributeurs" element={element} />}
              />
            ))
          )}
          {PARAMETRES_SUBROUTES.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<FeatureRoute flag="showParametres" feature="parametres" element={element} />}
            />
          ))}
          <Route path="tracking" element={<FeatureRoute flag="showTracking" feature="tracking" element={<TrackingPage />} />} />
          <Route
            path="tracking/:eventId/details"
            element={<FeatureRoute flag="showTracking" feature="tracking" element={<TrackingEventDetailPage />} />}
          />
          <Route
            path="partenaires"
            element={<FeatureRoute flag="showPartenaires" feature="partenaires" element={<PartenairesPage />} />}
          />
          <Route
            path="partenaires/:id"
            element={<FeatureRoute flag="showPartenaires" feature="partenaires" element={<PartenaireDetailPage />} />}
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
