import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StructureSelectCombobox } from "./StructureSelectCombobox";
import * as structuresService from "@/features/structures/services/structuresService";

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructureById: vi.fn(),
  fetchStructures: vi.fn(),
}));

describe("StructureSelectCombobox", () => {
  const mockFetchStructureById = vi.mocked(structuresService.fetchStructureById);
  const mockFetchStructures = vi.mocked(structuresService.fetchStructures);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchStructures.mockResolvedValue({
      items: [
        { id: "struct-1", name: "Banque Atlantique", code: "BA-01", is_active: true, is_deleted: false },
        { id: "struct-2", name: "Coris Bank", code: "CBI-01", is_active: true, is_deleted: false },
      ],
      total: 2,
    } as Awaited<ReturnType<typeof structuresService.fetchStructures>>);
    mockFetchStructureById.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        name: "Banque Atlantique",
        code: "BA-01",
        is_active: true,
        is_deleted: false,
      })
    );
  });

  it("renders with placeholder when no value is provided", () => {
    render(<StructureSelectCombobox value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Sélectionner une structure");
  });

  it("resolves and displays structure name when initial value is provided", async () => {
    render(<StructureSelectCombobox value="struct-1" onChange={vi.fn()} />);

    expect(await screen.findByText(/Banque Atlantique/i)).toBeInTheDocument();
  });

  it("opens popover on click, shows items and selects a structure", async () => {
    const onChangeMock = vi.fn();
    render(<StructureSelectCombobox value={null} onChange={onChangeMock} />);

    // Click trigger
    fireEvent.click(screen.getByRole("combobox"));

    // Options should be displayed
    const option = await screen.findByText("Coris Bank");
    fireEvent.click(option);

    expect(onChangeMock).toHaveBeenCalledWith("struct-2");
  });

  it("allows clearing selection by clicking clear option", async () => {
    const onChangeMock = vi.fn();
    render(<StructureSelectCombobox value="struct-1" onChange={onChangeMock} />);

    // Click trigger
    fireEvent.click(screen.getByRole("combobox"));

    // Click clear option (Sélectionner une structure)
    const clearOption = await screen.findByText("Sélectionner une structure");
    fireEvent.click(clearOption);

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });
});
