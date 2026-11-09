import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistributeurFormDialog } from "./DistributeurFormDialog";
import { emptyDistributeurForm } from "../../models/data";

describe("DistributeurFormDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    editingDistributeur: null,
    form: { ...emptyDistributeurForm, nom: "Distributeur Test", structureId: "s1" },
    setForm: vi.fn(),
    structureOptions: [{ id: "s1", nom: "Banque Centrale" }],
    onSubmit: vi.fn().mockResolvedValue(undefined),
    loading: false,
    users: [],
    userForm: { nom: "", prenom: "", username: "", email: "", profil: "profile.bo.autonome-set-admin" },
    setUserForm: vi.fn(),
    availableUserRoles: ["profile.bo.autonome-set-admin", "profile.bo.autonome-set-agent"],
    showUserForm: false,
    selectedUserId: null,
    isUpdatingUser: false,
    deriveLogin: vi.fn().mockReturnValue("jdupont"),
    openAddUserForm: vi.fn(),
    cancelUserForm: vi.fn(),
    addUser: vi.fn(),
    editUser: vi.fn(),
    removeUser: vi.fn(),
    updateUser: vi.fn(),
  };

  it("renders tabs 'Général' and 'Utilisateur'", () => {
    render(<DistributeurFormDialog {...defaultProps} />);

    expect(screen.getByRole("tab", { name: "Général" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Utilisateur" })).toBeInTheDocument();
  });

  it("switches to 'Utilisateur' tab and displays user creation prompt", () => {
    render(<DistributeurFormDialog {...defaultProps} />);

    const userTab = screen.getByRole("tab", { name: "Utilisateur" });
    fireEvent.keyDown(userTab, { key: "Enter" });

    expect(screen.getByText("Premier utilisateur du distributeur")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Prénom")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nom")).toBeInTheDocument();
  });

  it("calls addUser when clicking Ajouter button in Utilisateur tab", () => {
    render(<DistributeurFormDialog {...defaultProps} />);

    const userTab = screen.getByRole("tab", { name: "Utilisateur" });
    fireEvent.keyDown(userTab, { key: "Enter" });

    const addBtn = screen.getByRole("button", { name: "Ajouter" });
    fireEvent.click(addBtn);

    expect(defaultProps.addUser).toHaveBeenCalled();
  });

  it("displays attached users list when users are provided", () => {
    const propsWithUsers = {
      ...defaultProps,
      users: [
        {
          id: "u1",
          nom: "Sow",
          prenom: "Mamadou",
          username: "msow",
          email: "msow@example.com",
          profil: "profile.bo.autonome-set-admin",
        },
      ],
    };

    render(<DistributeurFormDialog {...propsWithUsers} />);

    const userTab = screen.getByRole("tab", { name: "Utilisateur" });
    fireEvent.keyDown(userTab, { key: "Enter" });

    expect(screen.getByText("Utilisateurs rattachés au distributeur (1)")).toBeInTheDocument();
    expect(screen.getByText("Sow Mamadou")).toBeInTheDocument();
    expect(screen.getByText(/msow@example\.com/)).toBeInTheDocument();
  });

  it("renders logo upload section in 'Général' tab", () => {
    render(<DistributeurFormDialog {...defaultProps} />);

    expect(screen.getByText("Logo du distributeur")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Choisir/i })).toBeInTheDocument();
    expect(screen.getByText("Aucun logo sélectionné")).toBeInTheDocument();
  });

  it("renders preview and remove button when previewUrl is configured", () => {
    const onFileSelected = vi.fn();
    const propsWithLogo = {
      ...defaultProps,
      form: {
        ...defaultProps.form,
        previewUrl: "https://storage.example.test/logos/dist-logo.png",
      },
      onFileSelected,
    };

    render(<DistributeurFormDialog {...propsWithLogo} />);

    expect(screen.getByAltText("Aperçu logo")).toHaveAttribute(
      "src",
      "https://storage.example.test/logos/dist-logo.png",
    );
    expect(screen.getByRole("button", { name: /Changer/i })).toBeInTheDocument();
    const removeBtn = screen.getByRole("button", { name: "Retirer le logo du distributeur" });
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(onFileSelected).toHaveBeenCalledWith(null);
  });

  it("affiche les erreurs sous les champs du distributeur et les efface à la saisie", () => {
    const clearFormError = vi.fn();
    render(
      <DistributeurFormDialog
        {...defaultProps}
        form={{ ...emptyDistributeurForm }}
        formErrors={{
          nom: "Le nom du distributeur est obligatoire",
          structureId: "La structure de rattachement est obligatoire",
        }}
        clearFormError={clearFormError}
      />,
    );

    expect(screen.getByText("Le nom du distributeur est obligatoire")).toBeInTheDocument();
    expect(screen.getByText("La structure de rattachement est obligatoire")).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Nom du distributeur/);
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput.className).toContain("border-destructive");

    fireEvent.change(nameInput, { target: { value: "Dist" } });
    expect(clearFormError).toHaveBeenCalledWith("nom");
  });

  it("affiche les erreurs sous les champs de l'utilisateur", () => {
    const clearUserFormError = vi.fn();
    render(
      <DistributeurFormDialog
        {...defaultProps}
        userFormErrors={{
          prenom: "Le prénom est obligatoire",
          email: "L'adresse e-mail n'est pas valide",
        }}
        clearUserFormError={clearUserFormError}
      />,
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Utilisateur" }), { key: "Enter" });

    expect(screen.getByText("Le prénom est obligatoire")).toBeInTheDocument();
    expect(screen.getByText("L'adresse e-mail n'est pas valide")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Prénom")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByPlaceholderText("Nom")).not.toHaveAttribute("aria-invalid");

    fireEvent.change(screen.getByPlaceholderText("utilisateur@domaine.com"), { target: { value: "a@b.sn" } });
    expect(clearUserFormError).toHaveBeenCalledWith("email");
  });
});
