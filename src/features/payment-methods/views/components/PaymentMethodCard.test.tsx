import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { PaymentMethodResponse } from "../../models/types";

const mockPaymentMethod: PaymentMethodResponse = {
  id: "pm-1",
  code: "ORANGE_MONEY",
  label: "Orange Money",
  kind: "WALLET",
  description: "Paiement mobile Orange Money",
  status: "active",
  is_active: true,
  currencies: ["XOF"],
  supported_operations: ["PAY"],
};

describe("PaymentMethodCard Habilitations & Action Buttons", () => {
  const defaultProps = {
    paymentMethod: mockPaymentMethod,
    onToggleStatus: vi.fn(),
    onOpenDetail: vi.fn(),
    onOpenEdit: vi.fn(),
    onRemove: vi.fn(),
  };

  it("hides action buttons and hides switch (replaces with status badge) when user has NO mutation habilitations", () => {
    render(
      <PaymentMethodCard
        {...defaultProps}
        canRead={true}
        canUpdate={false}
        canDelete={false}
        canToggleStatus={false}
      />
    );

    // Label and kind (not the code) are rendered
    expect(screen.getByText("Orange Money")).toBeInTheDocument();
    expect(screen.getByText("WALLET")).toBeInTheDocument();
    expect(screen.queryByText("ORANGE_MONEY")).not.toBeInTheDocument();

    // Details is rendered
    expect(screen.getByTitle("Détails")).toBeInTheDocument();

    // Modifier and Supprimer are NOT rendered
    expect(screen.queryByTitle("Modifier")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Supprimer")).not.toBeInTheDocument();

    // Switch is NOT rendered at all
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();

    // Read-only status badge is displayed instead
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("renders all action buttons when user has update, delete and toggle permissions", () => {
    render(
      <PaymentMethodCard
        {...defaultProps}
        canRead={true}
        canUpdate={true}
        canDelete={true}
        canToggleStatus={true}
      />
    );

    expect(screen.getByTitle("Détails")).toBeInTheDocument();
    expect(screen.getByTitle("Modifier")).toBeInTheDocument();
    expect(screen.getByTitle("Supprimer")).toBeInTheDocument();

    const switchEl = screen.getByRole("switch");
    expect(switchEl).not.toBeDisabled();
  });

  it("hides entire footer when user has NO read and NO mutation permissions", () => {
    render(
      <PaymentMethodCard
        {...defaultProps}
        canRead={false}
        canUpdate={false}
        canDelete={false}
        canToggleStatus={false}
      />
    );

    expect(screen.queryByTitle("Détails")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Modifier")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Supprimer")).not.toBeInTheDocument();
  });
});
