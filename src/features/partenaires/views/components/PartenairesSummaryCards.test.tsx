import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartenairesSummaryCards } from "./PartenairesSummaryCards";
import type { PartenaireRead, PartenaireSummary } from "../../models/types";

describe("PartenairesSummaryCards", () => {
  it("renders KPI counts from summary when provided", () => {
    const summary: PartenaireSummary = {
      total: 25,
      marchands: 15,
      facturiers: 10,
      actifs: 20,
      inactifs: 5,
    };

    render(<PartenairesSummaryCards partenaires={[]} summary={summary} />);

    expect(screen.getByText("25")).toBeDefined();
    expect(screen.getByText("Total Partenaires")).toBeDefined();

    expect(screen.getByText("15")).toBeDefined();
    expect(screen.getByText("Marchands")).toBeDefined();

    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("Facturiers")).toBeDefined();

    expect(screen.getByText("20")).toBeDefined();
    expect(screen.getByText("Partenaires Actifs")).toBeDefined();

    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("Partenaires Inactifs")).toBeDefined();
  });

  it("calculates fallback KPI counts from partenaires list when summary is null", () => {
    const mockPartners: PartenaireRead[] = [
      {
        id: "1",
        type: "particulier",
        categorie: "marchand",
        login: "p1",
        telephone: "770000001",
        email: "p1@test.com",
        profil: "profile.bo.partenaire-admin",
        statut: "actif",
        dateCreation: "2025-01-01",
      },
      {
        id: "2",
        type: "entreprise",
        categorie: "facturier",
        login: "p2",
        telephone: "770000002",
        email: "p2@test.com",
        profil: "profile.bo.partenaire-facturier",
        statut: "inactif",
        dateCreation: "2025-01-02",
      },
    ];

    render(<PartenairesSummaryCards partenaires={mockPartners} summary={null} />);

    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getAllByText("1")).toHaveLength(4);
  });
});
