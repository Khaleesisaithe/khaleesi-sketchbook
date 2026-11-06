import { supabase } from "@/lib/supabase";

export type ArtistProfile = {
  artist_name: string;
  bio: string | null;
  location: string | null;
  public_email: string | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  instagram_embed_url: string | null;
  instagram_post_urls: string[];
  instagram_featured_post_url: string | null;
  pinterest_board_url: string | null;
  pinterest_embed_url: string | null;
  youtube_url: string | null;
  external_portfolio_url: string | null;
  timezone: string;
};

export type CatalogItem = {
  id: string;
  kind: "flash" | "art";
  title: string;
  description: string | null;
  image_path: string | null;
  dimensions: string | null;
  price: number | null;
  status: "available" | "reserved" | "sold" | "unavailable";
  is_published: boolean;
  sort_order: number;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  image_path: string | null;
  image_alt: string | null;
  is_published: boolean;
  sort_order: number;
};

export const fallbackProfile: ArtistProfile = {
  artist_name: "Khaleesi Saithe",
  bio: null,
  location: null,
  public_email: null,
  whatsapp_number: null,
  instagram_url: null,
  instagram_embed_url: null,
  instagram_post_urls: [],
  instagram_featured_post_url: null,
  pinterest_board_url: null,
  pinterest_embed_url: null,
  youtube_url: null,
  external_portfolio_url: null,
  timezone: "",
};

export async function loadArtistProfile(): Promise<ArtistProfile> {
  if (!supabase) return fallbackProfile;
  const { data, error } = await supabase.from("artist_profile").select("*").eq("id", 1).eq("is_public", true).maybeSingle();
  if (error || !data) return fallbackProfile;
  return { ...fallbackProfile, ...data } as ArtistProfile;
}

export async function loadPortfolio(): Promise<PortfolioItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("portfolio_items").select("*").eq("is_published", true).order("sort_order").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PortfolioItem[];
}

export async function loadCatalog(kind: "flash" | "art"): Promise<CatalogItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("catalog_items").select("*").eq("kind", kind).eq("is_published", true).order("sort_order").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CatalogItem[];
}

export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null;
  if (/^https:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from("portfolio-images").getPublicUrl(path);
  return data.publicUrl;
}
