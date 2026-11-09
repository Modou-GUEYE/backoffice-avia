import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PartenaireDetailUserDialog } from "./PartenaireDetailUserDialog";

const emptyUser = { firstName: "", lastName: "", username: "", email: "", profile: "" };

describe("PartenaireDetailUserDialog", () => {
  it("laisse le bouton actif avec des champs vides pour afficher les erreurs", () => {
    const onSave = vi.fn();
    render(
      <PartenaireDetailUserDialog
        open={true}
        onOpenChange={vi.fn()}
        isEditing={false}
        userForm={emptyUser}
        setUserForm={vi.fn()}
        onSave={onSave}
        savingUser={false}
      />,
    );

    const submit = screen.getByRole("button", { name: "Ajouter l'utilisateur" });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSave).toHaveBeenCalled();
  });

  it("affiche les erreurs sous les champs et les efface à la saisie", () => {
    const clearError = vi.fn();
    render(
      <PartenaireDetailUserDialog
        open={true}
        onOpenChange={vi.fn()}
        isEditing={false}
        userForm={emptyUser}
        setUserForm={vi.fn()}
        errors={{
          firstName: "Le prénom est obligatoire",
          lastName: "Le nom est obligatoire",
          username: "Le nom d'utilisateur est obligatoire",
          email: "L'e-mail est obligatoire",
          profile: "Le profil est obligatoire",
        }}
        clearError={clearError}
        onSave={vi.fn()}
        savingUser={false}
      />,
    );

    expect(screen.getAllByRole("alert").map((el) => el.textContent)).toEqual([
      "Le prénom est obligatoire",
      "Le nom est obligatoire",
      "Le nom d'utilisateur est obligatoire",
      "L'e-mail est obligatoire",
      "Le profil est obligatoire",
    ]);
    expect(screen.getByPlaceholderText("Nom")).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByPlaceholderText("utilisateur@domaine.com"), { target: { value: "a@b.sn" } });
    expect(clearError).toHaveBeenCalledWith("email");
  });
});
