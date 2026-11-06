import { Instagram, Link2, Pin, Youtube } from "lucide-react";
import type { ArtistProfile } from "@/lib/siteData";

type SocialLink = { label: string; href: string; icon: typeof Instagram };

function safeHttps(value: string | null | undefined, hosts?: string[]): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (hosts && !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function ArtistSocialLinks({ profile, compact = false }: { profile: ArtistProfile | null | undefined; compact?: boolean }) {
  const links: SocialLink[] = [];
  const instagram = safeHttps(profile?.instagram_url, ["instagram.com"]);
  const youtube = safeHttps(profile?.youtube_url, ["youtube.com", "youtu.be"]);
  const portfolio = safeHttps(profile?.external_portfolio_url);
  const pinterest = safeHttps(profile?.pinterest_board_url, ["pinterest.com", "pinterest.ca"]);

  if (instagram) links.push({ label: "Instagram", href: instagram, icon: Instagram });
  if (youtube) links.push({ label: "YouTube", href: youtube, icon: Youtube });
  if (portfolio) links.push({ label: "Portfólio externo", href: portfolio, icon: Link2 });
  if (pinterest) links.push({ label: "Pinterest", href: pinterest, icon: Pin });
  if (!links.length) return null;

  return (
    <div className={`artist-social-links${compact ? " compact" : ""}`} aria-label="Links da artista">
      {links.map(({ label, href, icon: Icon }) => (
        <a className="artist-social-link" key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label} em nova aba`}>
          <Icon size={compact ? 16 : 19} aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}
