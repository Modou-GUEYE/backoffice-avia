import { describe, expect, it } from "vitest";
import {
  mapNotificationOutToRead,
  mapNotificationReadToCreate,
} from "./notificationsService";
import { resolveCampaignMediaUrl, extractFilenameFromMediaUrl } from "../models/types";

describe("Diffusion Service Helpers", () => {
  describe("mapNotificationOutToRead", () => {
    it("maps email channel to mail canal", () => {
      const out = {
        id: "notif-1",
        libelle: "Confirmation de virement",
        transaction_type: "virement",
        channel: ["email"],
        content_sender: "Votre virement a été envoyé",
        content_receiver: "Vous avez reçu un virement",
        status: "active",
      };

      const result = mapNotificationOutToRead(out);
      expect(result.id).toBe("notif-1");
      expect(result.canal).toBe("mail");
      expect(result.is_active).toBe(true);
    });

    it("defaults to sms if no channel is provided", () => {
      const out = {
        id: "notif-2",
        libelle: "Test",
        status: "inactive",
      };

      const result = mapNotificationOutToRead(out);
      expect(result.canal).toBe("sms");
      expect(result.is_active).toBe(false);
    });
  });

  describe("mapNotificationReadToCreate", () => {
    it("converts mail canal to email channel in payload", () => {
      const form = {
        libelle: "Alerte Sécurité",
        type_transaction: "paiement",
        canal: "mail" as const,
        contenu_envoyeur: "Alerte envoyée",
        contenu_destinataire: "Alerte reçue",
      };

      const result = mapNotificationReadToCreate(form);
      expect(result.libelle).toBe("Alerte Sécurité");
      expect(result.transaction_type).toBe("paiement");
      expect(result.channel).toEqual(["email"]);
    });
  });

  describe("resolveCampaignMediaUrl", () => {
    it("resolves media_url, url or logo_url if present, prioritizing media_url", () => {
      expect(resolveCampaignMediaUrl({ media_url: "https://example.com/banner.png", logo_url: "https://example.com/logo.png" })).toBe(
        "https://example.com/banner.png",
      );
      expect(resolveCampaignMediaUrl({ media_url: "https://example.com/banner.png" })).toBe(
        "https://example.com/banner.png",
      );
      expect(resolveCampaignMediaUrl({ url: "https://example.com/audio.mp3" })).toBe(
        "https://example.com/audio.mp3",
      );
      expect(resolveCampaignMediaUrl({ logo_url: "https://example.com/logo.png" })).toBe(
        "https://example.com/logo.png",
      );
    });

    it("returns null if no direct media url is provided", () => {
      expect(resolveCampaignMediaUrl(null)).toBeNull();
      expect(resolveCampaignMediaUrl({ media_id: "media-uuid-only" })).toBeNull();
      expect(resolveCampaignMediaUrl({ logo_media_id: "media-uuid-only" })).toBeNull();
    });
  });

  describe("extractFilenameFromMediaUrl", () => {
    it("extracts filename from presigned S3/MinIO response-content-disposition", () => {
      const urlWithUtf8 =
        "https://storage.example.test/media/2026/09/16/uuid?response-content-disposition=inline%3B%20filename%2A%3DUTF-8%27%27publicite-video.mp4&response-content-type=video%2Fmp4";
      expect(extractFilenameFromMediaUrl(urlWithUtf8)).toBe("publicite-video.mp4");

      const urlWithSpaces =
        "https://storage.example.test/media/2026/09/16/uuid?response-content-disposition=inline%3B%20filename%2A%3DUTF-8%27%27image%25201.png";
      expect(extractFilenameFromMediaUrl(urlWithSpaces)).toBe("image 1.png");
    });

    it("falls back to URL pathname when disposition is absent", () => {
      const simpleUrl = "https://example.com/media/banner-promo.jpg";
      expect(extractFilenameFromMediaUrl(simpleUrl)).toBe("banner-promo.jpg");
    });

    it("returns null when url is null or undefined", () => {
      expect(extractFilenameFromMediaUrl(null)).toBeNull();
      expect(extractFilenameFromMediaUrl(undefined)).toBeNull();
    });
  });
});
