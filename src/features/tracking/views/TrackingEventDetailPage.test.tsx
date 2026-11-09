import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TrackingEventDetailPage } from "./TrackingEventDetailPage";
import type { TrackingEventDetail } from "../models/types";

const { mockDetail } = vi.hoisted(() => ({
  mockDetail: { current: null as unknown },
}));

vi.mock("../viewmodels/useTrackingEventDetail", () => ({
  useTrackingEventDetail: () => mockDetail.current,
}));

const event: TrackingEventDetail = {
  id: "evt-1",
  source: "access-security",
  action: "Création utilisateur",
  event_timestamp: "2026-10-12T10:00:00Z",
  entite: "STRUCTURE",
  profil: "Admin structure",
  utilisateur: "a.diop",
  method: "POST",
  endpoint: "/api/v1/security/users",
  resultat_action: "SUCCESS",
  adresse_ip: "10.0.0.1",
  navigateur: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0",
  structure_id: "struct-1",
};

const vm = (overrides: Record<string, unknown> = {}) => ({
  event,
  loading: false,
  error: null,
  getProduitName: (id?: string | null) => id || "-",
  getStructureName: (id?: string | null) => (id === "struct-1" ? "BCI" : id || "-"),
  getAgenceName: (id?: string | null) => id || "-",
  getCaisseName: (id?: string | null) => id || "-",
  getDistributeurName: (id?: string | null) => id || "-",
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/tracking/evt-1/details"]}>
      <Routes>
        <Route path="/dashboard/tracking/:eventId/details" element={<TrackingEventDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("TrackingEventDetailPage", () => {
  beforeEach(() => {
    mockDetail.current = vm();
  });

  it("affiche l'événement en sections avec les noms du périmètre", () => {
    renderPage();
    expect(screen.getAllByText("Création utilisateur").length).toBeGreaterThan(0);
    expect(screen.getByText("Informations de l'événement")).toBeInTheDocument();
    expect(screen.getByText("Auteur de l'action")).toBeInTheDocument();
    expect(screen.getByText("a.diop")).toBeInTheDocument();
    expect(screen.getByText("Structure", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("BCI")).toBeInTheDocument();
    expect(screen.getByText("Chrome / macOS")).toBeInTheDocument();
    expect(screen.getByText("/api/v1/security/users")).toBeInTheDocument();
    expect(screen.getByText("Réussie")).toHaveAttribute("title", "SUCCESS");
  });

  it("affiche « Échec » pour un résultat autre qu'un succès", () => {
    mockDetail.current = vm({ event: { ...event, resultat_action: "FAILURE" } });
    renderPage();
    expect(screen.getByText("Échec")).toHaveAttribute("title", "FAILURE");
  });

  it("masque le périmètre quand aucune entité n'est rattachée", () => {
    mockDetail.current = vm({ event: { ...event, structure_id: null } });
    renderPage();
    expect(screen.queryByText("Périmètre")).not.toBeInTheDocument();
  });

  it("affiche l'erreur de chargement", () => {
    mockDetail.current = vm({ event: null, error: "Événement introuvable" });
    renderPage();
    expect(screen.getByText("Événement introuvable")).toBeInTheDocument();
  });
});
