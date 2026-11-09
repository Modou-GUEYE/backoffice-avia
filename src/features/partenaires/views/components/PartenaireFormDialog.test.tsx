import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PartenaireFormDialog } from "./PartenaireFormDialog";
import { emptyPartenaireForm } from "../../models/data";

describe("PartenaireFormDialog - Services Multi-Selector", () => {
  const defaultProps = {
    dialogOpen: true,
    setDialogOpen: vi.fn(),
    editing: null,
    save: vi.fn(),
    updatePartnerUser: vi.fn(),
    savingPartner: false,
    savingPartnerUser: false,
    activeTab: "entreprise" as const,
    setActiveTab: vi.fn(),
    setFormType: vi.fn(),
    form: {
      ...emptyPartenaireForm,
      type: "entreprise" as const,
      serviceIds: ["srv-1"],
    },
    setForm: vi.fn(),
    userForm: {
      prenom: "",
      nom: "",
      username: "",
      email: "",
      profil: "",
    },
    setUserForm: vi.fn(),
    selectPartnerUser: vi.fn(),
    deriveLogin: vi.fn(),
    partnerUsers: [],
    selectedPartnerUserId: null,
    profilsForCategorie: vi.fn().mockReturnValue([]),
    showUserForm: false,
    setShowUserForm: vi.fn(),
    openAddUserForm: vi.fn(),
    addUser: vi.fn(),
    removeUser: vi.fn(),
    catalogServices: [
      { id: "srv-1", code: "SRV_1", label: "Service Un", status: "active" },
      { id: "srv-2", code: "SRV_2", label: "Service Deux", status: "active" },
    ],
    toggleService: vi.fn(),
    clearServices: vi.fn(),
  };

  it("renders services section with selected count and badge in entreprise tab", () => {
    render(<PartenaireFormDialog {...defaultProps} />);

    expect(screen.getByText("Services associés")).toBeInTheDocument();
    expect(screen.getByText("Sélectionner des services...")).toBeInTheDocument();
    expect(screen.getByText("Service Un")).toBeInTheDocument();
  });

  it("toggles dropdown and shows the services list without 'Tout cocher' / 'Effacer'", () => {
    render(<PartenaireFormDialog {...defaultProps} />);

    const toggleButton = screen.getByText("Sélectionner des services...").closest("button");
    expect(toggleButton).not.toBeNull();
    fireEvent.click(toggleButton!);

    expect(screen.getByText("2 service(s) disponible(s)")).toBeInTheDocument();
    expect(screen.queryByText("Tout cocher")).not.toBeInTheDocument();
    expect(screen.queryByText("Effacer")).not.toBeInTheDocument();
    expect(screen.getByText("Service Deux")).toBeInTheDocument();
  });

  it("calls toggleService when clicking on an unselected service in dropdown", () => {
    const toggleServiceMock = vi.fn();
    render(<PartenaireFormDialog {...defaultProps} toggleService={toggleServiceMock} />);

    const toggleButton = screen.getByText("Sélectionner des services...").closest("button");
    fireEvent.click(toggleButton!);

    const service2Row = screen.getByText("Service Deux").closest("div");
    fireEvent.click(service2Row!);

    expect(toggleServiceMock).toHaveBeenCalledWith("srv-2");
  });

  it("renders services section and supports selection in particulier tab as well", () => {
    const particulierProps = {
      ...defaultProps,
      activeTab: "particulier" as const,
      form: {
        ...emptyPartenaireForm,
        type: "particulier" as const,
        serviceIds: ["srv-1"],
      },
    };

    render(<PartenaireFormDialog {...particulierProps} />);

    expect(screen.getByText("Services associés")).toBeInTheDocument();
    expect(screen.getByText("Sélectionner des services...")).toBeInTheDocument();
    expect(screen.getByText("Service Un")).toBeInTheDocument();
  });

  it("affiche les erreurs sous les champs de l'entreprise et les efface à la saisie", () => {
    const clearFormError = vi.fn();
    render(
      <PartenaireFormDialog
        {...defaultProps}
        formErrors={{
          libelle: "Le libellé de l'entreprise est obligatoire",
          ninea: "Le NINEA est obligatoire",
          email: "L'adresse e-mail n'est pas valide",
        }}
        clearFormError={clearFormError}
      />,
    );

    expect(screen.getByText("Le libellé de l'entreprise est obligatoire")).toBeInTheDocument();
    expect(screen.getByText("Le NINEA est obligatoire")).toBeInTheDocument();
    expect(screen.getByText("L'adresse e-mail n'est pas valide")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nom de l'entreprise")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByPlaceholderText("Numéro")[0]).not.toHaveAttribute("aria-invalid");

    fireEvent.change(screen.getByPlaceholderText("NINEA"), { target: { value: "123" } });
    expect(clearFormError).toHaveBeenCalledWith("ninea");
  });

  it("affiche les erreurs sous les champs de l'utilisateur", () => {
    const clearUserFormError = vi.fn();
    render(
      <PartenaireFormDialog
        {...defaultProps}
        activeTab="utilisateur"
        userFormErrors={{ prenom: "Le prénom est obligatoire", profil: "Le profil est obligatoire" }}
        clearUserFormError={clearUserFormError}
      />,
    );

    expect(screen.getByText("Le prénom est obligatoire")).toBeInTheDocument();
    expect(screen.getByText("Le profil est obligatoire")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Prénom"), { target: { value: "Awa" } });
    expect(clearUserFormError).toHaveBeenCalledWith("prenom");
  });
});
