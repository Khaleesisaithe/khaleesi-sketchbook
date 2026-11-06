import { useEffect, useState } from "react";
import { EmptyState, PageIntro } from "@/components/PageIntro";
import { SiteLayout } from "@/components/SiteLayout";
import { loadCatalog, publicImageUrl, type CatalogItem } from "@/lib/siteData";
import { isSupabaseConfigured } from "@/lib/supabase";

function money(value: number | null) {
  return value === null ? "Preço não informado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const statusText: Record<CatalogItem["status"], string> = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Indisponível",
  unavailable: "Indisponível",
};

export default function Catalog({ kind }: { kind: "flash" | "art" }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isFlash = kind === "flash";
  useEffect(() => {
    let active = true;
    loadCatalog(kind).then((data) => { if (active) setItems(data); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind]);

  return (
    <SiteLayout pageLabel={isFlash ? "Flashes" : "Artes disponíveis"}>
      <PageIntro eyebrow={isFlash ? "Flashes disponíveis" : "Desenhos autorais"} title={isFlash ? "Flashes" : "Artes"} accent="disponíveis" description={isFlash ? "Veja os flashes publicados e confira o tamanho, o valor e a disponibilidade de cada desenho." : "Consulte as artes autorais, com valores e dimensões informados pela artista."} note="A página mostra apenas preços, tamanhos e status cadastrados pela artista." />
      <section className="container-wide page-content">
        {error && <p className="data-error" role="alert">O catálogo não carregou. Tente novamente daqui a pouco.</p>}
        {loading ? <p className="loading-mark">Carregando desenhos…</p> : items.length === 0 ? <EmptyState title={isSupabaseConfigured ? (isFlash ? "Ainda não há flashes publicados." : "Ainda não há artes publicadas.") : "O catálogo está sendo preparado."}>{isFlash ? "Quando a artista publicar um flash, você verá o desenho, as dimensões, o valor e a disponibilidade." : "A artista adicionará aqui as artes, com valores e dimensões."}</EmptyState> : <div className="catalog-grid">{items.map((item) => { const image = publicImageUrl(item.image_path); return <article className="catalog-card" key={item.id}><div className="portfolio-image">{image ? <img src={image} alt={item.title} loading="lazy" /> : <span className="portfolio-image-fallback" aria-hidden="true" />}</div><div className="catalog-card-body"><span className="eyebrow">{isFlash ? "Flash" : "Arte autoral"}</span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}<div className="catalog-card-footer"><span>{money(item.price)}<br /><small>{item.dimensions || "Dimensões não informadas"}</small></span><span className="status-label">{statusText[item.status]}</span></div></div></article>; })}</div>}
      </section>
    </SiteLayout>
  );
}
