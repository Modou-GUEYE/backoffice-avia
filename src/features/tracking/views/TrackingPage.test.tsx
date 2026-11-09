import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TrackingPage } from "./TrackingPage";
import { useAuthStore } from "@/core/security/authStore";

const noop = () => {};
const label = (value?: string | null) => value || "-";

vi.mock("../viewmodels/useTrackingEvents", () => ({
  useTrackingEvents: () => ({
    total: 0,
    loading: false,
    exporting: false,
    error: null,
    filters: {},
    perimeter: {},
    updateFilters: noop,
    resetFilters: noop,
    refetch: noop,
    safeEvents: [],
    summary: { total_events: 0, distinct_users: 0, active_sources: 0, success_operations: 0, failed_operations: 0 },
    sourceOptions: [],
    produitOptions: [],
    entiteOptions: [],
    structureOptions: [],
    agenceOptions: [],
    caisseOptions: [],
    distributeurOptions: [],
    limit: 50,
    skip: 0,
    currentPage: 1,
    totalPages: 1,
    formatDate: label,
    formatUserAgent: label,
    getMethodBadgeClass: () => "",
    getStructureName: label,
    getAgenceName: label,
    getCaisseName: label,
    getDistributeurName: label,
    getProduitName: label,
    handleExport: noop,
  }),
}));

const renderWithPermissions = (permissions: string[]) => {
  useAuthStore.setState({
    user: { email: "user@example.com", role: "Administrateur", entityContext: "Structure", permissions },
  });
  render(
    <MemoryRouter>
      <TrackingPage />
    </MemoryRouter>,
  );
};

describe("TrackingPage - export", () => {
  it("affiche l'export avec perm.bo.tracking.export", () => {
    renderWithPermissions(["perm.bo.tracking.list", "perm.bo.tracking.export"]);
    expect(screen.getByText("Exporter")).toBeInTheDocument();
  });

  it("masque l'export avec la seule permission de consultation", () => {
    renderWithPermissions(["perm.bo.tracking.list"]);
    expect(screen.queryByText("Exporter")).not.toBeInTheDocument();
  });
});
