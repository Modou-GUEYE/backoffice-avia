import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaisseFormDialog } from "./CaisseFormDialog";
import { CaisseDetailDialog } from "./CaisseDetailDialog";
import type { CaisseForm, CaisseRead } from "../../models/types";

describe("CaisseFormDialog", () => {
  const agenceOptions = [
    { id: "ag-1", nom: "Agence Principale", parent_type: "STRUCTURE" as const },
    { id: "ag-2", nom: "Agence Secondaire", parent_type: "DISTRIBUTOR" as const },
  ];

  const defaultForm: CaisseForm = {
    name: "Caisse 01",
    code: "CSS001",
    agency_id: "ag-1",
  };

  it("renders creation dialog with correct fields and without deprecated fields", () => {
    render(
      <CaisseFormDialog
        open={true}
        onOpenChange={vi.fn()}
        editingCaisse={null}
        form={defaultForm}
        setForm={vi.fn()}
        agenceOptions={agenceOptions}
        onSave={vi.fn()}
      />
    );

    // Title and submit label
    expect(screen.getByText("Nouvelle caisse")).toBeDefined();
    expect(screen.getByText("Créer la caisse")).toBeDefined();

    // Field labels
    expect(screen.getByText(/Agence de rattachement/i)).toBeDefined();
    expect(screen.getByText(/Nom de la caisse/i)).toBeDefined();
    expect(screen.getByText(/Code de la caisse/i)).toBeDefined();

    // Verify useless/deprecated fields (including current_balance / solde) are completely absent
    expect(screen.queryByText(/solde/i)).toBeNull();
    expect(screen.queryByText(/description/i)).toBeNull();
    expect(screen.queryByText(/limite journali/i)).toBeNull();
    expect(screen.queryByText(/limite par transaction/i)).toBeNull();
    expect(screen.queryByText(/devise/i)).toBeNull();
    expect(screen.queryByText(/caissier/i)).toBeNull();
    expect(screen.queryByText(/assignation/i)).toBeNull();
  });

  it("renders edit dialog in update mode with correct title and fields", () => {
    const editingCaisse: CaisseRead = {
      id: "caisse-123",
      name: "Caisse Principale",
      code: "CSS001",
      agency_id: "ag-1",
      parent_id: "parent-1",
      parent_type: "STRUCTURE",
      is_active: true,
      activated_at: "2026-01-01T10:00:00Z",
      deactivated_at: null,
      is_deleted: false,
    };

    render(
      <CaisseFormDialog
        open={true}
        onOpenChange={vi.fn()}
        editingCaisse={editingCaisse}
        form={defaultForm}
        setForm={vi.fn()}
        agenceOptions={agenceOptions}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Modifier la caisse")).toBeDefined();
    expect(screen.getByText("Enregistrer")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();

    // Verify useless/deprecated fields are absent
    expect(screen.queryByText(/solde/i)).toBeNull();
    expect(screen.queryByText(/description/i)).toBeNull();
    expect(screen.queryByText(/devise/i)).toBeNull();
    expect(screen.queryByText(/caissier/i)).toBeNull();
  });
});

describe("CaisseDetailDialog", () => {
  it("renders caisse details cleanly without any useless fields", () => {
    const caisse: CaisseRead = {
      id: "caisse-999",
      name: "Caisse Express",
      code: "CXP-01",
      agency_id: "ag-1",
      parent_id: "parent-1",
      parent_type: "DISTRIBUTOR",
      is_active: true,
      activated_at: "2026-02-15T08:30:00Z",
      deactivated_at: null,
      is_deleted: false,
    };

    render(
      <CaisseDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        caisse={caisse}
        agencyName="Agence Centrale"
        parentTypeName="Distributeur"
        canUpdate={true}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getAllByText("Caisse Express").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CXP-01").length).toBeGreaterThan(0);
    expect(screen.getByText("Agence Centrale")).toBeDefined();
    expect(screen.getByText("Modifier la caisse")).toBeDefined();

    // Absolutely no useless/deprecated fields
    expect(screen.queryByText(/solde/i)).toBeNull();
    expect(screen.queryByText(/description/i)).toBeNull();
    expect(screen.queryByText(/devise/i)).toBeNull();
    expect(screen.queryByText(/caissier/i)).toBeNull();
    expect(screen.queryByText(/limite/i)).toBeNull();
  });
});
