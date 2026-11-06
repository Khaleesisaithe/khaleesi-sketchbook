import { useEffect, useState } from "react";

const INSTAGRAM_SCRIPT = "khaleesi-instagram-embed-script";
const PINTEREST_SCRIPT = "khaleesi-pinterest-embed-script";

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
    PinUtils?: { build: () => void };
  }
}

function loadThirdPartyScript(id: string, src: string, onReady: () => void) {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === "true") onReady();
    else existing.addEventListener("load", onReady, { once: true });
    return;
  }
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  script.dataset.loaded = "false";
  script.addEventListener("load", () => {
    script.dataset.loaded = "true";
    onReady();
  }, { once: true });
  document.body.appendChild(script);
}

export function SocialConsentGate({ platform, children }: { platform: "Instagram" | "Pinterest"; children: React.ReactNode }) {
  const key = `khaleesi-social-consent-${platform.toLowerCase()}-v1`;
  const [consented, setConsented] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setConsented(window.localStorage.getItem(key) === "allow"); }
    catch { setConsented(false); }
    setReady(true);
  }, [key]);

  function allow() {
    try { window.localStorage.setItem(key, "allow"); } catch { /* Consent remains valid for this visit after an explicit click. */ }
    setConsented(true);
  }

  function revoke() {
    try { window.localStorage.removeItem(key); } catch { /* The current view is still disabled below. */ }
    setConsented(false);
  }

  if (!ready) return <div className="social-consent-card" aria-live="polite">Verificando preferência de privacidade…</div>;
  if (!consented) {
    return (
      <div className="social-consent-card">
        <p>Este conteúdo vem de {platform}. Ao carregar, seu navegador poderá enviar dados técnicos ao serviço escolhido.</p>
        <button type="button" className="button-outline" onClick={allow}>Carregar conteúdo do {platform}</button>
        <small>Nada é solicitado ao serviço antes de você escolher carregar.</small>
      </div>
    );
  }

  return (
    <div className="social-embed-authorized">
      <div className="social-embed-toolbar"><span>Conteúdo externo autorizado neste navegador.</span><button type="button" className="button-quiet" onClick={revoke}>Remover autorização</button></div>
      {children}
      <small className="social-privacy-note">Remover a autorização impede novos carregamentos. Isso não apaga cookies que o fornecedor já tenha criado.</small>
    </div>
  );
}

export function InstagramPostEmbed({ url, featured = false }: { url: string; featured?: boolean }) {
  useEffect(() => {
    loadThirdPartyScript(INSTAGRAM_SCRIPT, "https://www.instagram.com/embed.js", () => window.instgrm?.Embeds?.process?.());
    return () => undefined;
  }, [url]);

  return (
    <article className={`instagram-post${featured ? " is-featured" : ""}`}>
      {featured && <span className="featured-post-label">Post em destaque</span>}
      <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14">
        <a href={url} target="_blank" rel="noopener noreferrer">Ver publicação no Instagram</a>
      </blockquote>
    </article>
  );
}

export function PinterestBoardEmbed({ url }: { url: string }) {
  useEffect(() => {
    loadThirdPartyScript(PINTEREST_SCRIPT, "https://assets.pinterest.com/js/pinit.js", () => window.PinUtils?.build?.());
    return () => undefined;
  }, [url]);

  return (
    <div className="pinterest-board-embed">
      <a data-pin-do="embedBoard" data-pin-board-width="750" data-pin-scale-height="420" data-pin-scale-width="80" href={url}>
        Abrir painel de referências no Pinterest
      </a>
    </div>
  );
}
