import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationDialog } from "./NotificationDialog";
import { NotificationRead, NotificationFormState } from "../../models/types";

describe("NotificationDialog - Confirmation de modification", () => {
  const defaultForm: NotificationFormState = {
    libelle: "Notification Virement",
    type_transaction: "virement",
    canal: "sms",
    contenu_envoyeur: "Votre virement a bien été émis.",
    contenu_destinataire: "Vous avez reçu un virement.",
  };

  const mockNotification: NotificationRead = {
    id: "notif-1",
    libelle: "Notification Virement",
    type_transaction: "virement",
    canal: "sms",
    is_active: true,
    contenu_envoyeur: "Votre virement a bien été émis.",
    contenu_destinataire: "Vous avez reçu un virement.",
  };

  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    form: defaultForm,
    setForm: vi.fn(),
    transactionTypes: ["virement", "versement", "retrait"],
    channels: ["sms", "email", "app"],
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche la pop-up 'Voulez-vous vraiment effectuer cette action ?' lors du clic sur 'Mettre à jour'", () => {
    render(
      <NotificationDialog
        {...mockProps}
        editingNotification={mockNotification}
      />,
    );

    // Initialement, le dialogue de confirmation n'est pas affiché
    expect(screen.queryByText("Voulez-vous vraiment effectuer cette action ?")).not.toBeInTheDocument();

    // Clic sur "Mettre à jour"
    const updateButton = screen.getByRole("button", { name: "Mettre à jour" });
    fireEvent.click(updateButton);

    // La pop-up de confirmation s'affiche
    expect(screen.getByText("Confirmer la modification")).toBeInTheDocument();
    expect(screen.getByText("Voulez-vous vraiment effectuer cette action ?")).toBeInTheDocument();

    // onSave n'est pas encore appelé
    expect(mockProps.onSave).not.toHaveBeenCalled();
  });

  it("appelle onSave lors du clic sur 'Oui' dans la pop-up de confirmation", () => {
    render(
      <NotificationDialog
        {...mockProps}
        editingNotification={mockNotification}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" }));

    // Clic sur "Oui"
    const confirmButton = screen.getByRole("button", { name: "Oui" });
    fireEvent.click(confirmButton);

    // onSave est appelé
    expect(mockProps.onSave).toHaveBeenCalledTimes(1);
  });

  it("annule la modification lors du clic sur 'Non' sans appeler onSave", () => {
    render(
      <NotificationDialog
        {...mockProps}
        editingNotification={mockNotification}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" }));

    // Clic sur "Non"
    const cancelButton = screen.getByRole("button", { name: "Non" });
    fireEvent.click(cancelButton);

    // onSave n'est pas appelé
    expect(mockProps.onSave).not.toHaveBeenCalled();
  });

  it("appelle directement onSave en mode création (Nouvelle notification)", () => {
    render(
      <NotificationDialog
        {...mockProps}
        editingNotification={null}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });
    fireEvent.click(saveButton);

    // Pas de popup de confirmation en création, appel direct
    expect(screen.queryByText("Voulez-vous vraiment effectuer cette action ?")).not.toBeInTheDocument();
    expect(mockProps.onSave).toHaveBeenCalledTimes(1);
  });

  it("affiche les erreurs sous les champs et n'ouvre pas la confirmation si la validation échoue", () => {
    render(
      <NotificationDialog
        {...mockProps}
        editingNotification={mockNotification}
        errors={{ libelle: "Le libellé est obligatoire" }}
        onValidate={() => false}
      />,
    );

    expect(screen.getByText("Le libellé est obligatoire")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" }));
    expect(screen.queryByText("Confirmer la modification")).not.toBeInTheDocument();
    expect(mockProps.onOpenChange).not.toHaveBeenCalled();
  });
});
