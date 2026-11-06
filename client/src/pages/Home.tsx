import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, BookOpen, Feather, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { SiteLayout } from "@/components/SiteLayout";
import { ArtistSocialLinks } from "@/components/ArtistSocialLinks";
import { loadArtistProfile } from "@/lib/siteData";

const shortcuts = [
  { number: "01", title: "Portfólio", copy: "Veja os trabalhos que a artista escolheu publicar.", href: "/portfolio", icon: Feather },
  { number: "02", title: "Flashes", copy: "Confira os desenhos disponíveis, seus tamanhos e valores.", href: "/flashes", icon: Sparkles },
  { number: "03", title: "Cuidados", copy: "Leia as orientações do manual para cada etapa da sessão.", href: "/cuidados", icon: BookOpen },
];

export default function Home() {
  const heroRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const sheetY = useTransform(scrollYProgress, [0, 1], [0, 18]);
  const stampY = useTransform(scrollYProgress, [0, 1], [0, -12]);
  const { data: profile } = useQuery({ queryKey: ["artist-profile"], queryFn: loadArtistProfile });
  const artistName = profile?.artist_name || "Khaleesi Saithe";
  const bio = profile?.bio?.trim();

  return (
    <SiteLayout>
      <section ref={heroRef} className="home-hero">
        <div className="home-hero-copy reveal">
          <div className="eyebrow">Caderno aberto · tattoo autoral</div>
          <h1 className="hero-title"><span>Desenhos</span><span>que vivem</span><span><em>na pele.</em></span></h1>
          <p className="hero-copy">Conheça os trabalhos de {artistName}, veja os desenhos disponíveis e conte sua ideia. A solicitação de horário fica pendente até a artista analisar e aprovar.</p>
          <div className="hero-actions">
            <Link className="button-primary" href="/portfolio">Ver o portfólio <ArrowUpRight size={15} /></Link>
            <Link className="button-outline" href="/agendar">Contar minha ideia</Link>
          </div>
          <div className="hero-meta">Desenho autoral · horário confirmado após aprovação</div>
        </div>
        <motion.div className="hero-sheet-wrap" style={reduceMotion ? undefined : { y: sheetY }} aria-label="Composição tipográfica decorativa inspirada em um caderno de desenho">
          <span className="hero-side-note">anotações à margem</span>
          <div className="hero-sheet">
            <div className="sheet-label"><span>Sketchbook / caderno aberto</span><span className="sheet-number">Nº 01</span></div>
            <div className="sheet-sketch reveal">
              <div className="sketch-orbit"><span className="sketch-mark" aria-hidden="true">✳</span></div>
              <span className="pencil-scribble" aria-hidden="true" />
            </div>
            <div className="sheet-label"><span>Khaleesi Saithe</span><span>{profile?.location?.trim() || "Local não informado"}</span></div>
            <span className="sheet-note">{bio || "A apresentação da artista será adicionada quando ela fornecer as informações."}</span>
          </div>
          <motion.div className="hero-stamp" style={reduceMotion ? undefined : { y: stampY, rotate: 11 }}>traço<br />autoral<br />✦</motion.div>
        </motion.div>
        <a className="scroll-cue" href="#caderno" aria-label="Rolar até o conteúdo"><ArrowDown size={16} /><span>Continue folheando</span></a>
      </section>

      <section id="caderno" className="section-wrap paper-deep">
        <div className="container-wide">
          <div className="section-heading-row">
            <div><div className="eyebrow">Conheça o caderno</div><h2 className="section-title">Escolha por <em>onde começar.</em></h2></div>
            <p className="body-large">Veja os trabalhos, consulte os desenhos disponíveis e leia o manual de cuidados antes de pedir um horário.</p>
          </div>
          <div className="feature-strip">
            {shortcuts.map(({ number, title, copy, href, icon: Icon }) => (
              <Link className="feature-card" href={href} key={href}>
                <span className="feature-index">{number}</span>
                <h3>{title}</h3><p>{copy}</p><Icon className="arrow" size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wrap">
        <div className="container-wide">
          <div className="section-heading-row">
            <div><div className="eyebrow">Sobre a artista</div><h2 className="section-title">{artistName}</h2></div>
          </div>
          {bio ? <p className="body-large artist-bio">{bio}</p> : <div className="empty-state"><h3>Biografia ainda não cadastrada</h3><p>Esta apresentação será preenchida quando a artista enviar as informações que deseja compartilhar.</p></div>}
          <ArtistSocialLinks profile={profile} />
        </div>
      </section>

      <section className="section-wrap paper-deep">
        <div className="container-wide">
          <div className="callout-band">
            <div><h2>Pensando em uma tatuagem?</h2><p>Conte sua ideia. O horário só será confirmado depois que a artista analisar e aprovar o pedido.</p></div>
            <Link className="button-outline" href="/agendar">Contar minha ideia <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
