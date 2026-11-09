import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DistributeursSummaryCards } from "./DistributeursSummaryCards";

describe("DistributeursSummaryCards", () => {
  it("renders correct counts from summary prop", () => {
    const summary = {
      total: 10,
      actifs: 7,
      inactifs: 3,
    };

    render(<DistributeursSummaryCards summary={summary} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Total Distributeurs")).toBeInTheDocument();
    expect(screen.getByText("Distributeurs Actifs")).toBeInTheDocument();
    expect(screen.getByText("Distributeurs Inactifs")).toBeInTheDocument();
  });
});
