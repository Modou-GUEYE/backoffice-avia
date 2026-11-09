import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CampaignDialog } from "./CampaignDialog";
import { CampaignOut, CampaignFormState, MediaType, CampaignTarget } from "../../models/types";

// Mock URL.createObjectURL
if (typeof window !== "undefined" && !window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn((file: Blob | MediaSource) => `blob:mock-url-${(file as File)?.name || "file"}`);
}

describe("CampaignDialog - Visualisation Média & Vidéo", () => {
  const defaultForm: CampaignFormState = {
    libelle: "Campagne Test",
    type: "video",
    date_debut: "2026-09-21T10:00",
    date_fin: "2026-09-30T18:00",
    cible: "tous",
    cible_ids: [],
    description: "Description test",
    file: null,
    structure_id: "",
  };

  const mockVideoCampaign: CampaignOut = {
    id: "camp-vid-1",
    libelle: "Spot Vidéo Promo",
    type: "video",
    date_debut: "2026-09-21T10:00:00Z",
    date_fin: "2026-09-30T18:00:00Z",
    cible: "tous",
    status: "en_cours",
    media_url:
      "https://storage.example.test/media/2026/09/21/uuid?response-content-disposition=inline%3B%20filename%2A%3DUTF-8%27%27spot-publicitaire.mp4&response-content-type=video%2Fmp4",
    media_id: "vid-uuid-1",
  };

  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    form: defaultForm,
    setForm: vi.fn(),
    mediaTypes: ["image", "audio", "video"] as MediaType[],
    targets: ["tous", "agences", "localite", "type_client", "tranche_age"] as CampaignTarget[],
    agencesList: [],
    structuresList: [],
    isSaving: false,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un lecteur vidéo avec controls et le nom du fichier pour une vidéo existante", () => {
    render(
      <CampaignDialog {...mockProps} editingCampaign={mockVideoCampaign} form={{ ...defaultForm, type: "video" }} />,
    );

    // Le libellé et le nom du fichier extrait de l'URL
    expect(screen.getByText("Vidéo actuelle")).toBeInTheDocument();
    expect(screen.getByText("spot-publicitaire.mp4")).toBeInTheDocument();

    // Présence du player vidéo avec controls
    const videoEl = document.querySelector("video");
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute("controls");
    expect(videoEl).toHaveAttribute("src", mockVideoCampaign.media_url);

    // Bouton de remplacement présent
    expect(screen.getByText(/Remplacer par un nouveau fichier/i)).toBeInTheDocument();
  });

  it("affiche un lecteur vidéo avec controls pour un nouveau fichier vidéo sélectionné", () => {
    const newFile = new File(["dummy content"], "nouvelle-video.mp4", { type: "video/mp4" });
    const formWithFile: CampaignFormState = {
      ...defaultForm,
      type: "video",
      file: newFile,
    };

    render(
      <CampaignDialog {...mockProps} editingCampaign={mockVideoCampaign} form={formWithFile} />,
    );

    expect(screen.getByText("Nouveau fichier sélectionné")).toBeInTheDocument();
    expect(screen.getByText("nouvelle-video.mp4")).toBeInTheDocument();

    const videoEl = document.querySelector("video");
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute("controls");

    // Bouton retirer présent
    expect(screen.getByRole("button", { name: /Retirer/i })).toBeInTheDocument();
  });

  it("affiche un lecteur audio avec controls pour un fichier audio", () => {
    const mockAudioCampaign: CampaignOut = {
      ...mockVideoCampaign,
      type: "audio",
      media_url:
        "https://storage.example.test/media/2026/09/21/uuid?response-content-disposition=inline%3B%20filename%2A%3DUTF-8%27%27spot-audio.mp3&response-content-type=audio%2Fmpeg",
    };

    render(
      <CampaignDialog
        {...mockProps}
        editingCampaign={mockAudioCampaign}
        form={{ ...defaultForm, type: "audio" }}
      />,
    );

    expect(screen.getByText("Audio actuel")).toBeInTheDocument();
    expect(screen.getByText("spot-audio.mp3")).toBeInTheDocument();

    const audioEl = document.querySelector("audio");
    expect(audioEl).toBeInTheDocument();
    expect(audioEl).toHaveAttribute("controls");
  });

  it("affiche un lecteur vidéo avec controls en création même si le type initial était image", () => {
    const videoFile = new File(["dummy video"], "publicite-video.mp4", { type: "video/mp4" });
    const creationForm: CampaignFormState = {
      ...defaultForm,
      type: "image", // initialement sur image
      file: videoFile,
    };

    render(
      <CampaignDialog {...mockProps} editingCampaign={null} form={creationForm} />,
    );

    expect(screen.getByText("Nouveau fichier sélectionné")).toBeInTheDocument();
    expect(screen.getByText("publicite-video.mp4")).toBeInTheDocument();

    const videoEl = document.querySelector("video");
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute("controls");
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });

  it("affiche un lecteur audio avec controls en création même si le type initial était image", () => {
    const audioFile = new File(["dummy audio"], "publicite-audio.mp3", { type: "audio/mpeg" });
    const creationForm: CampaignFormState = {
      ...defaultForm,
      type: "image", // initialement sur image
      file: audioFile,
    };

    render(
      <CampaignDialog {...mockProps} editingCampaign={null} form={creationForm} />,
    );

    expect(screen.getByText("Nouveau fichier sélectionné")).toBeInTheDocument();
    expect(screen.getByText("publicite-audio.mp3")).toBeInTheDocument();

    const audioEl = document.querySelector("audio");
    expect(audioEl).toBeInTheDocument();
    expect(audioEl).toHaveAttribute("controls");
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });

  it("affiche le message d'erreur de retour directement dans le formulaire", () => {
    const errorMsg = "Le type de média sélectionné ne correspond pas au fichier envoyé.";
    render(
      <CampaignDialog {...mockProps} editingCampaign={null} errorMessage={errorMsg} />,
    );

    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it("affiche les erreurs de saisie sous les champs concernés et bloque la confirmation", () => {
    render(
      <CampaignDialog
        {...mockProps}
        editingCampaign={mockVideoCampaign}
        errors={{ libelle: "Le libellé de la publicité est obligatoire", date_fin: "La date de fin est obligatoire" }}
        onValidate={() => false}
      />,
    );

    expect(screen.getByText("Le libellé de la publicité est obligatoire")).toBeInTheDocument();
    expect(screen.getByText("La date de fin est obligatoire")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex. Lancement Service Crédit Express")).toHaveAttribute("aria-invalid", "true");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.queryByText("Confirmer la modification")).not.toBeInTheDocument();
    expect(mockProps.onOpenChange).not.toHaveBeenCalled();
  });
});
