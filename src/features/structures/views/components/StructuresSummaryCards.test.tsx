import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StructuresSummaryCards } from "./StructuresSummaryCards";
import type { Structure } from "../../models/types";

describe("StructuresSummaryCards", () => {
  it("renders KPI counts from summary when provided", () => {
    const summary = { total: 9, actifs: 7, inactifs: 2 };
    render(<StructuresSummaryCards structures={[]} summary={summary} />);

    expect(screen.getByText("9")).toBeDefined();
    expect(screen.getByText("Total Structures")).toBeDefined();

    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("Structures Actives")).toBeDefined();

    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("Structures Inactives")).toBeDefined();
  });

  it("calculates KPI counts from structures list when summary is null", () => {
    const mockStructures: Structure[] = [
      { id: "1", name: "S1", code: "S1", type: "BANK", address: "SN", is_active: true, nombreAgences: 0, utilisateurs: [] },
      { id: "2", name: "S2", code: "S2", type: "IMF", address: "SN", is_active: false, nombreAgences: 0, utilisateurs: [] },
      { id: "3", name: "S3", code: "S3", type: "OTHER", address: "BF", is_active: true, nombreAgences: 0, utilisateurs: [] },
    ];

    render(<StructuresSummaryCards structures={mockStructures} summary={null} />);

    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });
});
