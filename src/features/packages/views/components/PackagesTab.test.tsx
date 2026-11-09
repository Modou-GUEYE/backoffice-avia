import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackagesTab } from "./PackagesTab";
import { PackageResponse } from "../../models/types";

const mockPackage: PackageResponse = {
  id: "pkg-1",
  code: "PKG_BASIC",
  label: "Package Basique",
  description: "Description package basique",
  status: "active",
  client_types: ["PARTICULIER"],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("PackagesTab Habilitations & Action Buttons", () => {
  const defaultProps = {
    packages: [mockPackage],
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDetail: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onToggleStatus: vi.fn(),
    onArchive: vi.fn(),
  };

  it("hides all action buttons and the Actions column when the user has NO habilitations", () => {
    // hasPerm returns false for everything
    const hasPerm = () => false;

    render(<PackagesTab {...defaultProps} hasPerm={hasPerm} />);

    // Code & Label are rendered
    expect(screen.getByText("PKG_BASIC")).toBeInTheDocument();
    expect(screen.getByText("Package Basique")).toBeInTheDocument();

    // Nouveau Package button is NOT rendered
    expect(screen.queryByText(/Nouveau Package/i)).not.toBeInTheDocument();

    // Column header Actions is NOT rendered
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();

    // None of the action buttons are rendered
    expect(screen.queryByTitle(/Détails/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Modifier/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Dupliquer/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Désactiver/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Archiver/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Supprimer/i)).not.toBeInTheDocument();
  });

  it("shows only Détails when the user has only read permission, but NO mutation action buttons", () => {
    const hasPerm = (perm: string) =>
      perm === "perm.bo.package.list" || perm === "perm.bo.package.read";

    render(<PackagesTab {...defaultProps} hasPerm={hasPerm} />);

    // Nouveau Package is NOT rendered
    expect(screen.queryByText(/Nouveau Package/i)).not.toBeInTheDocument();

    // Actions column header is rendered (for Details)
    expect(screen.getByText("Actions")).toBeInTheDocument();

    // Détails (Eye) is rendered
    expect(screen.getByTitle(/Détails/i)).toBeInTheDocument();

    // Mutation buttons are NOT rendered
    expect(screen.queryByTitle(/Modifier/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Dupliquer/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Désactiver/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Archiver/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Supprimer/i)).not.toBeInTheDocument();
  });

  it("shows action buttons when the user has the corresponding habilitations", () => {
    const hasPerm = (perm: string) => {
      const allowed = [
        "perm.bo.package.list",
        "perm.bo.package.create",
        "perm.bo.package.update",
        "perm.bo.package.delete",
        "perm.bo.package.deactivate",
      ];
      return allowed.includes(perm);
    };

    render(<PackagesTab {...defaultProps} hasPerm={hasPerm} />);

    // Nouveau Package is rendered
    expect(screen.getByText(/Nouveau Package/i)).toBeInTheDocument();

    // Actions column is rendered
    expect(screen.getByText("Actions")).toBeInTheDocument();

    // Details, Modifier, Dupliquer (via create), Desactiver, Supprimer are rendered
    expect(screen.getByTitle(/Détails/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Modifier/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Dupliquer/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Désactiver/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Supprimer/i)).toBeInTheDocument();
  });

  it("gère correctement les statuts actif, inactif et archivé pour l'archivage", () => {
    const hasPerm = () => true;

    const activePkg: PackageResponse = { ...mockPackage, id: "p-act", status: "active", label: "Pkg Actif" };
    const inactivePkg: PackageResponse = { ...mockPackage, id: "p-inact", status: "inactive", label: "Pkg Inactif" };
    const archivedPkg: PackageResponse = { ...mockPackage, id: "p-arch", status: "archived", label: "Pkg Archivé" };

    const { rerender } = render(<PackagesTab {...defaultProps} packages={[activePkg]} hasPerm={hasPerm} />);

    // Package actif : bouton Archiver désactivé
    const activeArchiveBtn = screen.getByTitle(/Veuillez désactiver le package avant de l'archiver/i);
    expect(activeArchiveBtn).toBeDisabled();

    // Package inactif : bouton Archiver activé
    rerender(<PackagesTab {...defaultProps} packages={[inactivePkg]} hasPerm={hasPerm} />);
    const inactiveArchiveBtn = screen.getByTitle(/^Archiver$/i);
    expect(inactiveArchiveBtn).not.toBeDisabled();

    // Package archivé : badge 'Archivé', bouton Archiver désactivé avec mention déjà archivé
    rerender(<PackagesTab {...defaultProps} packages={[archivedPkg]} hasPerm={hasPerm} />);
    expect(screen.getByText("Archivé")).toBeInTheDocument();
    const archivedArchiveBtn = screen.getByTitle(/Ce package est déjà archivé/i);
    expect(archivedArchiveBtn).toBeDisabled();
  });
});
