import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Instagram } from "lucide-react";
import { PageIntro } from "@/components/PageIntro";
import { SiteLayout } from "@/components/SiteLayout";
import { ArtistSocialLinks } from "@/components/ArtistSocialLinks";
import { InstagramPostEmbed, PinterestBoardEmbed, SocialConsentGate } from "@/components/OptInSocialEmbeds";
import { loadArtistProfile } from "@/lib/siteData";

function safeSocialUrl(value: string | null | undefined, hosts: string[]): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.toString() : null;
  } catch { return null; }
}

function safeExternalHttps(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}

function safeInstagramPost(value: string | null | undefined): string | null {
  const url = safeSocialUrl(value, ["instagram.com"]);
  if (!url) return null;
  try { return /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(new URL(url).pathname) ? url : null; }
  catch { return null; }
}

export default function Inspirations() {
  const { data: profile } = useQuery({ queryKey: ["artist-profile"], queryFn: loadArtistProfile });
  const instagramProfile = safeSocialUrl(profile?.instagram_url, ["instagram.com"]);
  const youtube = safeSocialUrl(profile?.youtube_url, ["youtube.com", "youtu.be"]);
  const portfolio = safeExternalHttps(profile?.external_portfolio_url);
  const pinterestBoard = safeSocialUrl(profile?.pinterest_board_url, ["pinterest.com", "pinterest.ca"]);
  const configuredPosts = Array.isArray(profile?.instagram_post_urls) ? profile.instagram_post_urls : [];
  const candidates = [profile?.instagram_featured_post_url, ...configuredPosts, profile?.instagram_embed_url];
  const posts = [...new Set(candidates.map(safeInstagramPost).filter((value): value is string => Boolean(value)))];
  const featuredPost = safeInstagramPost(profile?.instagram_featured_post_url);
  const orderedPosts = featuredPost && posts.includes(featuredPost)
    ? [featuredPost, ...posts.filter((url) => url !== featuredPost)]
    : posts;

  return (
    <SiteLayout pageLabel="Inspirações">
      <PageIntro eyebrow="Referências da artista" title="Inspirações" accent="visuais" description="Publicações e painéis selecionados pela artista para inspirar conversas sobre tema e composição." note="O desenho final é construído com a artista. Conteúdo de terceiros só é carregado depois da sua autorização." />
      <section className="container-wide page-content">
        <div className="inspiration-grid">
          <article className="inspiration-card">
            <h2><Instagram size={20} aria-hidden="true" /> Instagram</h2>
            <p className="placeholder-note">Posts escolhidos pela artista, com o destaque exibido primeiro.</p>
            {orderedPosts.length ? (
              <SocialConsentGate platform="Instagram">
                <div className="instagram-feed">{orderedPosts.map((url, index) => <InstagramPostEmbed key={url} url={url} featured={Boolean(featuredPost && url === featuredPost && index === 0)} />)}</div>
              </SocialConsentGate>
            ) : <div className="empty-state"><h3>Publicações ainda não cadastradas</h3><p>Os posts aparecerão quando a artista informar os links das publicações públicas.</p></div>}
            {instagramProfile && <p><a className="button-quiet" href={instagramProfile} target="_blank" rel="noreferrer noopener">Ver perfil no Instagram <ArrowUpRight size={14} /></a></p>}
          </article>
          <article className="inspiration-card">
            <h2>Pinterest</h2>
            <p className="placeholder-note">Painel de referências selecionado para este caderno.</p>
            {pinterestBoard ? <SocialConsentGate platform="Pinterest"><PinterestBoardEmbed url={pinterestBoard} /></SocialConsentGate> : <div className="empty-state"><h3>Painel ainda não cadastrado</h3><p>O painel será mostrado quando a artista informar o endereço público.</p></div>}
            {pinterestBoard && <p><a className="button-quiet" href={pinterestBoard} target="_blank" rel="noreferrer noopener">Abrir painel no Pinterest <ArrowUpRight size={14} /></a></p>}
          </article>
        </div>
        <section className="section-wrap inspiration-social-footer">
          <div className="section-heading-row"><div><div className="eyebrow">Outros caminhos</div><h2 className="section-title">Encontre a artista <em>por aqui.</em></h2></div><ArtistSocialLinks profile={profile} /></div>
          {(youtube || portfolio) && <p className="form-help">Os links de YouTube e do portfólio externo aparecem junto aos outros canais sempre que forem cadastrados.</p>}
          <div className="callout-band"><div><h2>Tem referências para mostrar?</h2><p>Links e imagens ajudam a conversar sobre tema, proporção e intenção antes do pedido de horário.</p></div><a className="button-outline" href={instagramProfile || pinterestBoard || "/agendar"} target={instagramProfile || pinterestBoard ? "_blank" : undefined} rel="noreferrer noopener">Conversar sobre uma ideia <Instagram size={14} /></a></div>
        </section>
      </section>
    </SiteLayout>
  );
}
