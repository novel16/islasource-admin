import { API_BASE_URL, apiEndpoints, type createApiClient } from "./api.ts";

export type TermsSection = {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
};

export type HomepageSettings = {
  advisory_enabled: boolean;
  advisory_text: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subtext: string;
  hero_image: string;
  hero_image_alt: string;
  hero_caption: string;
  story_heading: string;
  story_paragraphs: string[];
  story_image: string;
  story_image_alt: string;
};

export type AdminSiteSettings = {
  business_name: string;
  contact_email: string;
  contact_phone: string;
  business_address: string;
  island_min_kg: number;
  cebu_min_kg: number;
  default_markup_percent: string;
  default_handling_centavos: number;
  default_cebu_delivery_centavos: number;
  default_validity_hours: number;
  default_quotation_terms: string;
  homepage: HomepageSettings;
  terms_sections: TermsSection[];
};

export const builtInSiteImages = [
  { src: "/images/hero-seafood.jpg", label: "Fresh fish on ice (Default hero)" },
  { src: "/images/island.jpg", label: "Bantayan boardwalk (Default story)" },
  { src: "/images/squid.jpg", label: "Island squid" },
  { src: "/images/crab.jpg", label: "Blue swimmer crabs" },
  { src: "/images/scallops.jpg", label: "Island scallops" },
  { src: "/images/dried-fish.jpg", label: "Sun-dried buwad" },
] as const;

export function siteAssetSrc(
  path: string,
  apiUrl: string = API_BASE_URL,
): string {
  if (builtInSiteImages.some((item) => item.src === path)) return path;
  if (/^\/storage\/products\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(path)) {
    return new URL(path, new URL(apiUrl).origin).toString();
  }
  return "/images/hero-seafood.jpg";
}

type Request = ReturnType<typeof createApiClient>["request"];

export function createSettingsClient(request: Request) {
  return {
    async get(signal?: AbortSignal): Promise<AdminSiteSettings> {
      const result = await request<{ data: AdminSiteSettings }>(
        apiEndpoints.settings,
        { signal },
      );
      return result.data;
    },
    async update(payload: Partial<AdminSiteSettings>): Promise<AdminSiteSettings> {
      const result = await request<{ data: AdminSiteSettings }>(
        apiEndpoints.settings,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      return result.data;
    },
    async reset(): Promise<AdminSiteSettings> {
      const result = await request<{ data: AdminSiteSettings }>(
        apiEndpoints.settingsReset,
        { method: "POST" },
      );
      return result.data;
    },
  };
}
