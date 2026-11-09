import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaissesSummaryCards } from "./CaissesSummaryCards";

describe("CaissesSummaryCards", () => {
  it("renders KPI counts strictly from backend summary", () => {
    const summary = { total: 15, actifs: 12, inactifs: 3 };
    render(<CaissesSummaryCards summary={summary} />);

    expect(screen.getByText("15")).toBeDefined();
    expect(screen.getByText("Total Caisses")).toBeDefined();

    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("Caisses Actives")).toBeDefined();

    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("Caisses Inactives")).toBeDefined();

    expect(screen.queryByText("Caisses Assignées")).toBeNull();
  });

  it("renders 0 for all KPIs when summary is null without local fallback", () => {
    render(<CaissesSummaryCards summary={null} />);

    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.getByText("Total Caisses")).toBeDefined();
    expect(screen.getByText("Caisses Actives")).toBeDefined();
    expect(screen.getByText("Caisses Inactives")).toBeDefined();
    expect(screen.queryByText("Caisses Assignées")).toBeNull();
  });
});
