import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StructureDetailUserDialog, deriveLogin } from "./StructureDetailUserDialog";

describe("StructureDetailUserDialog", () => {
  describe("deriveLogin", () => {
    it("generates first letter of first name plus last name", () => {
      expect(deriveLogin("John", "Doe")).toBe("j.doe");
    });

    it("handles collisions with existing usernames by incrementing suffix", () => {
      const existing = ["j.doe", "j.doe1"];
      expect(deriveLogin("John", "Doe", existing)).toBe("j.doe2");
    });

    it("returns empty string when both names are empty", () => {
      expect(deriveLogin("", "")).toBe("");
    });
  });

  describe("rendering", () => {
    it("renders modal with creation title and inputs when open", () => {
      const setUserForm = vi.fn();
      const onSave = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <StructureDetailUserDialog
          open={true}
          onOpenChange={onOpenChange}
          isEditing={false}
          userForm={{
            firstName: "Jean",
            lastName: "Dupont",
            username: "j.dupont",
            email: "jean.dupont@test.com",
            profile: "profile.bo.structure-admin",
          }}
          setUserForm={setUserForm}
          onSave={onSave}
          savingUser={false}
        />
      );

      expect(screen.getByText("Nouvel utilisateur")).toBeDefined();
      expect(screen.getByText("Créez un compte utilisateur rattaché à cette structure.")).toBeDefined();
      expect(screen.getByDisplayValue("Jean")).toBeDefined();
      expect(screen.getByDisplayValue("Dupont")).toBeDefined();
      expect(screen.getByDisplayValue("j.dupont")).toBeDefined();
    });

    it("shows edit title when isEditing is true", () => {
      const setUserForm = vi.fn();
      const onSave = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <StructureDetailUserDialog
          open={true}
          onOpenChange={onOpenChange}
          isEditing={true}
          userForm={{
            firstName: "Jean",
            lastName: "Dupont",
            username: "j.dupont",
            email: "jean.dupont@test.com",
            profile: "profile.bo.structure-admin",
          }}
          setUserForm={setUserForm}
          onSave={onSave}
          savingUser={false}
        />
      );

      expect(screen.getAllByText("Modifier l'utilisateur").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("L'identifiant de connexion ne peut pas être modifié.")).toBeDefined();
    });

    it("shows field errors under the invalid fields and keeps the save button enabled", () => {
      render(
        <StructureDetailUserDialog
          open={true}
          onOpenChange={vi.fn()}
          isEditing={false}
          userForm={{ firstName: "", lastName: "Dupont", username: "", email: "jean@", profile: "" }}
          setUserForm={vi.fn()}
          onSave={vi.fn()}
          savingUser={false}
          errors={{ firstName: "Le prénom est obligatoire", email: "L'adresse e-mail n'est pas valide" }}
        />
      );

      expect(screen.getByText("Le prénom est obligatoire")).toBeDefined();
      expect(screen.getByText("L'adresse e-mail n'est pas valide")).toBeDefined();
      expect(screen.getByPlaceholderText("Prénom").getAttribute("aria-invalid")).toBe("true");
      expect(screen.getByPlaceholderText("Nom").getAttribute("aria-invalid")).toBeNull();
      expect(screen.getByRole("button", { name: "Ajouter l'utilisateur" }).hasAttribute("disabled")).toBe(false);
    });
  });
});
