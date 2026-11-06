import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { EmptyState, PageIntro } from "@/components/PageIntro";
import { SiteLayout } from "@/components/SiteLayout";
import { loadPortfolio, publicImageUrl, type PortfolioItem } from "@/lib/siteData";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function Portfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("Tudo");
  const [selected, setSelected] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    let active = true;
    loadPortfolio().then((data) => { if (active) setItems(data); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const categories = useMemo(() => ["Tudo", ...Array.from(new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value))))], [items]);
  const visibleItems = category === "Tudo" ? items : items.filter((item) => item.category === category);

  return (
    <SiteLayout pageLabel="Portfólio">
      <PageIntro eyebrow="Trabalhos publicados" title="Portfólio" accent="autoral" description="Veja os trabalhos publicados pela artista e filtre a galeria por categoria." note="As fotos ainda não foram cadastradas. Quando a artista adicionar os trabalhos reais, eles aparecerão aqui." />
      <section className="container-wide page-content">
        {error && <p className="data-error" role="alert">A galeria não carregou. Tente novamente daqui a pouco.</p>}
        {loading ? <p className="loading-mark">Carregando os trabalhos…</p> : items.length === 0 ? (
          <EmptyState title={isSupabaseConfigured ? "Ainda não há trabalhos publicados." : "A galeria está sendo preparada."}>
            {isSupabaseConfigured ? "As fotos e informações aparecerão aqui quando a artista publicar os trabalhos." : "A artista cadastrará aqui as fotos reais e as informações de cada trabalho."}
          </EmptyState>
        ) : (
          <>
            <div className="portfolio-filters" aria-label="Filtrar por categoria">
              {categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "active" : ""}`} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}
            </div>
            <div className="portfolio-grid">
              {visibleItems.map((item) => {
                const image = publicImageUrl(item.image_path);
                return <article className="portfolio-card" key={item.id}><button onClick={() => setSelected(item)} aria-label={`Ampliar ${item.title}`}><div className="portfolio-image">{image ? <img src={image} alt={item.image_alt || item.title} loading="lazy" /> : <span className="portfolio-image-fallback" aria-hidden="true" />}</div><div className="portfolio-meta"><small>{item.category || "Trabalho"}</small><h3>{item.title}</h3></div></button></article>;
              })}
            </div>
          </>
        )}
      </section>
      {selected && <div className="lightbox-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title"><button className="lightbox-close" onClick={() => setSelected(null)} aria-label="Fechar visualização"><X size={20} /></button>{publicImageUrl(selected.image_path) && <img src={publicImageUrl(selected.image_path)!} alt={selected.image_alt || selected.title} />}<div className="lightbox-content"><div className="eyebrow">{selected.category || "Trabalho"}</div><h2 id="lightbox-title" className="section-title">{selected.title}</h2>{selected.description && <p>{selected.description}</p>}</div></section></div>}
    </SiteLayout>
  );
}
