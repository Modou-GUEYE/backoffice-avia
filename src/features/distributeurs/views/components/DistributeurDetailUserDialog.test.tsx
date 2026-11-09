import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DistributeurDetailUserDialog } from "./DistributeurDetailUserDialog";

describe("DistributeurDetailUserDialog", () => {
  it("renders modal without tabs, matching the UtilisateurFormDialog design", () => {
    const setUserForm = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <DistributeurDetailUserDialog
        open={true}
        onOpenChange={onOpenChange}
        isEditing={false}
        userForm={{
          prenom: "Mamadou",
          nom: "Diallo",
          username: "m.diallo",
          email: "mamadou.diallo@distributeur.sn",
          profil: "profile.bo.autonome-set-admin",
          matricule: "MAT-001",
        }}
        setUserForm={setUserForm}
        onSubmit={onSubmit}
        loading={false}
        availableRoles={["profile.bo.autonome-set-admin", "profile.bo.autonome-set-agent"]}
      />
    );

    // Title and description
    expect(screen.getByText("Ajouter un utilisateur")).toBeDefined();
    expect(
      screen.getByText("Renseignez les informations pour créer un nouvel utilisateur.")
    ).toBeDefined();

    // Fields
    expect(screen.getByDisplayValue("Mamadou")).toBeDefined();
    expect(screen.getByDisplayValue("Diallo")).toBeDefined();
    expect(screen.getByDisplayValue("m.diallo")).toBeDefined();
    expect(screen.getByDisplayValue("mamadou.diallo@distributeur.sn")).toBeDefined();
    expect(screen.getByDisplayValue("MAT-001")).toBeDefined();

    // Verify there are NO tabs rendered ("Informations générales" / "Utilisateurs")
    expect(screen.queryByText("Informations générales")).toBeNull();
  });

  it("shows edit title and description when isEditing is true", () => {
    const setUserForm = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <DistributeurDetailUserDialog
        open={true}
        onOpenChange={onOpenChange}
        isEditing={true}
        userForm={{
          prenom: "Fatou",
          nom: "Sow",
          username: "f.sow",
          email: "fatou.sow@distributeur.sn",
          profil: "profile.bo.autonome-set-agent",
        }}
        setUserForm={setUserForm}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    expect(screen.getByText("Modifier l'utilisateur")).toBeDefined();
    expect(
      screen.getByText("Mettez à jour les informations du compte utilisateur.")
    ).toBeDefined();
  });

  it("laisse le bouton actif avec des champs vides pour afficher les erreurs", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DistributeurDetailUserDialog
        open={true}
        onOpenChange={vi.fn()}
        isEditing={false}
        userForm={{ prenom: "", nom: "", username: "", email: "", profil: "" }}
        setUserForm={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    const submit = screen.getByRole("button", { name: "Ajouter" });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("affiche les erreurs sous les champs et les efface à la saisie", () => {
    const clearError = vi.fn();

    render(
      <DistributeurDetailUserDialog
        open={true}
        onOpenChange={vi.fn()}
        isEditing={false}
        userForm={{ prenom: "", nom: "", username: "", email: "", profil: "" }}
        setUserForm={vi.fn()}
        errors={{
          prenom: "Le prénom est obligatoire",
          nom: "Le nom est obligatoire",
          username: "Le login est obligatoire",
          email: "L'e-mail est obligatoire",
          profil: "Le profil est obligatoire",
        }}
        clearError={clearError}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        loading={false}
      />
    );

    expect(screen.getAllByRole("alert").map((el) => el.textContent)).toEqual([
      "Le prénom est obligatoire",
      "Le nom est obligatoire",
      "Le login est obligatoire",
      "L'e-mail est obligatoire",
      "Le profil est obligatoire",
    ]);
    expect(screen.getByPlaceholderText("Prénom")).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByPlaceholderText("Prénom"), { target: { value: "Awa" } });
    expect(clearError).toHaveBeenCalledWith("prenom");
  });
});
