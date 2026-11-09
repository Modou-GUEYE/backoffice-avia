import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgencesSummaryCards } from "./AgencesSummaryCards";
import type { AgenceRead } from "../../models/types";

describe("AgencesSummaryCards", () => {
  it("renders KPI counts from summary when provided", () => {
    const summary = { total: 12, actifs: 10, inactifs: 2 };
    render(<AgencesSummaryCards agences={[]} summary={summary} />);

    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("Total Agences")).toBeDefined();

    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("Agences Actives")).toBeDefined();

    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("Agences Inactives")).toBeDefined();
  });

  it("calculates KPI counts from agences list when summary is null", () => {
    const mockAgences: AgenceRead[] = [
      { id: "1", name: "A1", code: "A1", parent_id: "p1", parent_type: "STRUCTURE", is_active: true },
      { id: "2", name: "A2", code: "A2", parent_id: "p1", parent_type: "STRUCTURE", is_active: false },
      { id: "3", name: "A3", code: "A3", parent_id: "p1", parent_type: "STRUCTURE", is_active: true },
    ];

    render(<AgencesSummaryCards agences={mockAgences} summary={null} />);

    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });
});
