import type { ReactNode } from "react";
import { Link } from "wouter";
import { PageIntro } from "@/components/PageIntro";
import { SiteLayout } from "@/components/SiteLayout";
import { careGuide } from "@/content/careGuide";

type GuideEntry = (typeof careGuide)[number];
type GuideEntryWithSection = Extract<GuideEntry, { subtitulo: string }>;

function renderEntry(entry: GuideEntry) {
  const paragraphs = [...entry.paragrafos] as string[];
  const lists = [...entry.listas] as string[];
  let content: ReactNode[] = [];
  const paragraph = (text: string, key: string) => text ? <p key={key}>{text}</p> : null;
  const list = (items: string[], key: string) => items.length ? <ul key={key}>{items.map((item, index) => <li key={`${key}-${index}`}>{item}</li>)}</ul> : null;

  if (entry.id === "antes-sobre-dor-e-desconforto") {
    content = [paragraph(paragraphs[0] ?? "", "pain-intro"), paragraph(paragraphs[1] ?? "", "pain-lead"), list(lists, "pain-list"), paragraph(paragraphs[2] ?? "", "pain-note")];
  } else if (entry.id === "alimentos-e-tattoo-evitar") {
    const foodItems = lists.slice(0, 9);
    const outcomes = lists[9]?.split("; ") ?? [];
    content = [paragraph(paragraphs[0] ?? "", "food-intro"), paragraph(paragraphs[1] ?? "", "food-avoid"), list(foodItems, "food-list"), paragraph(paragraphs[2] ?? "", "food-note"), paragraph(paragraphs[3] ?? "", "food-outcomes"), list(outcomes, "food-effects")];
  } else if (entry.id === "alimentos-e-tattoo-priorize-e-hidratacao") {
    content = [paragraph(paragraphs[0] ?? "", "nutrition-intro"), list(lists, "nutrition-list"), paragraph(paragraphs[1] ?? "", "water-title"), paragraph(paragraphs[2] ?? "", "water-text")];
  } else if (entry.id === "condicoes-para-retoques") {
    content = [list(lists, "retouch-list"), ...paragraphs.map((text, index) => paragraph(text, `retouch-${index}`))];
  } else {
    content = [...paragraphs.map((text, index) => paragraph(text, `p-${index}`)), list(lists, "list")];
  }

  return <article className="care-card" key={entry.id}><div className="care-number" aria-hidden="true">{entry.titulo.match(/^\d+/)?.[0] || "✳"}</div><div><h3>{entry.titulo.replace(/^\d+\.\s*/, "")}</h3>{content}</div></article>;
}

function entriesFor(section: string): GuideEntryWithSection[] {
  return careGuide.filter((item): item is GuideEntryWithSection => "subtitulo" in item && item.subtitulo === section);
}

const foodEntries = careGuide.filter((item) => item.id.startsWith("alimentos-e-tattoo-"));
const postEntries = entriesFor("Pós Tattoo").filter((item) => !item.id.startsWith("alimentos-e-tattoo-"));
const sections = [
  { id: "antes", title: "Antes da sessão", entries: entriesFor("Antes da Sessão") },
  { id: "durante", title: "Durante a sessão", entries: entriesFor("Durante a Sessão") },
  { id: "pos", title: "Pós tattoo", entries: postEntries },
  { id: "alimentos", title: "Alimentos e Tattoo", entries: foodEntries },
  { id: "retoques", title: "Condições para retoques", entries: careGuide.filter((item) => item.id === "condicoes-para-retoques") },
];

export default function Care() {
  return (
    <SiteLayout pageLabel="Manual de cuidados">
      <PageIntro eyebrow="Leia antes de agendar" title="Manual de" accent="cuidados" description="As orientações abaixo foram reconstruídas a partir do manual enviado pela artista. Leia cada seção antes, durante e após a sessão." note="Este conteúdo reproduz o manual fornecido e não foi ampliado com recomendações externas." />
      <section className="container-wide page-content">
        <p className="care-intro">O manual completo em um só lugar — higiene, descanso, alimentação, hidratação, conforto durante a sessão, cicatrização e retoques.</p>
        <nav className="care-nav" aria-label="Seções do manual">{sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav>
        {sections.map((section, index) => <section className="care-section" id={section.id} key={section.id}><div className="care-section-head"><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2></div>{section.entries.map(renderEntry)}</section>)}
        <div className="care-note">Para combinar um horário, envie a ideia pelo formulário. A solicitação será analisada pela artista e ficará pendente até a aprovação.</div>
        <Link className="button-primary" href="/agendar">Ir para o agendamento</Link>
      </section>
    </SiteLayout>
  );
}
