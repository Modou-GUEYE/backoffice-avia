import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReleveDetailPage } from "./ReleveDetailPage";
import type { Releve } from "../models/types";

const { mockVm } = vi.hoisted(() => ({ mockVm: { current: null as unknown } }));
vi.mock("../viewmodels/useReleveDetail", () => ({ useReleveDetail: () => mockVm.current }));

// Exemple de réponse fourni par l'équipe backend (INTEGRATION_RELEVES_BACKOFFICE.md)
const releve: Releve = {
  id: "rel-1",
  structure: "ALPHA",
  annee: 2026,
  mois: 9,
  periode_debut: "2026-09-01",
  periode_fin: "2026-09-30",
  nombre_transactions: 1,
  volume_total: 12000,
  total_frais: 250,
  total_quoteparts: { produit: 0, structure: 200, partenaire_technique: 50, distributeur: 0 },
  detail_par_produit: { "Non spécifié": { nombre: 1, volume: 12000, frais: 250, quoteparts: 250 } },
  detail_par_distributeur: { "Direct (sans distributeur)": { nombre: 1, volume: 12000, frais: 250, quoteparts: 250 } },
  statut: "brouillon",
  fige_le: null,
  fige_par: null,
  ajustements_anterieurs: [
    {
      correction_id: "c-1",
      releve_source_id: "rel-0",
      motif: "Régularisation surtaxe transaction TX-FO-1",
      montant: -30,
      beneficiaire_type: "structure",
      beneficiaire_id: "ALPHA",
      statut: "en_attente",
      cree_par: "omar.thiam",
      created_at: "2026-09-02T10:00:00+00:00",
    },
  ],
  ajustements_par_beneficiaire: { produit: 0, structure: -30, partenaire_technique: 0, distributeur: 0 },
  montants_nets_par_beneficiaire: { produit: 0, structure: 170, partenaire_technique: 50, distributeur: 0 },
  total_ajustements: -30,
  montant_net_a_reverser: 170,
  created_at: "2026-10-01T09:00:00+00:00",
  updated_at: "2026-10-01T09:00:00+00:00",
};

const vm = (overrides: Record<string, unknown> = {}) => ({
  releve,
  structureLabel: "ALPHA",
  loading: false,
  error: null,
  isFige: false,
  actionLoading: false,
  exporting: null,
  canRead: true,
  canGenerate: true,
  canFreeze: true,
  canCorrect: true,
  canExport: true,
  canNotify: true,
  notification: null,
  notifying: false,
  prepareNotification: vi.fn(),
  closeNotification: vi.fn(),
  recalculate: vi.fn(),
  freezeConfirmOpen: false,
  setFreezeConfirmOpen: vi.fn(),
  freeze: vi.fn(),
  exportReleve: vi.fn(),
  correctionOpen: false,
  setCorrectionOpen: vi.fn(),
  correctionForm: { motif: "", montant: "", beneficiaireType: "structure", beneficiaireId: "" },
  correctionErrors: {},
  updateCorrectionField: vi.fn(),
  submitCorrection: vi.fn(),
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/releves/rel-1"]}>
      <Routes>
        <Route path="/dashboard/releves/:releveId" element={<ReleveDetailPage />} />
        <Route path="/dashboard/releves" element={<p>Liste des relevés</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("ReleveDetailPage", () => {
  beforeEach(() => {
    mockVm.current = vm();
  });

  it("affiche le relevé brouillon avec ses sections et les actions de brouillon", () => {
    renderPage();
    expect(screen.getByText("Relevé Septembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Quotes-parts par bénéficiaire")).toBeInTheDocument();
    expect(screen.getByText("Non spécifié")).toBeInTheDocument();
    expect(screen.getByText("Direct (sans distributeur)")).toBeInTheDocument();
    expect(screen.getByText("Régularisation surtaxe transaction TX-FO-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recalculer/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Figer le relevé/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notifier/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ajouter une correction/ })).not.toBeInTheDocument();
  });

  it("relevé figé : plus de recalcul ni de figement, correction possible", () => {
    mockVm.current = vm({ isFige: true, releve: { ...releve, statut: "fige", fige_par: "omar.thiam", fige_le: "2026-10-02T08:00:00Z" } });
    renderPage();
    expect(screen.queryByRole("button", { name: /Recalculer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Figer le relevé/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajouter une correction/ })).toBeInTheDocument();
    expect(screen.getByText(/par omar\.thiam/)).toBeInTheDocument();
  });

  it("affiche la notification préparée : objet, message et lien", () => {
    mockVm.current = vm({
      notification: {
        releve_id: "rel-1",
        structure: "ALPHA",
        periode: "Septembre 2026",
        objet: "Votre relevé de septembre",
        message: "Bonjour, votre relevé est disponible.",
        lien_telechargement: "https://gateway/api/v1/reporting/releves/rel-1/export?format=pdf",
      },
    });
    renderPage();
    expect(screen.getByText("Votre relevé de septembre")).toBeInTheDocument();
    expect(screen.getByText("Bonjour, votre relevé est disponible.")).toBeInTheDocument();
    expect(screen.getByText("https://gateway/api/v1/reporting/releves/rel-1/export?format=pdf")).toBeInTheDocument();
  });

  it("renvoie à la liste sans permission de lecture", () => {
    mockVm.current = vm({ canRead: false });
    renderPage();
    expect(screen.getByText("Liste des relevés")).toBeInTheDocument();
  });
});
