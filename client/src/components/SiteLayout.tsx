import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ArtistSocialLinks } from "@/components/ArtistSocialLinks";
import { loadArtistProfile } from "@/lib/siteData";

const navItems = [
  { href: "/portfolio", label: "Portfólio" },
  { href: "/flashes", label: "Flashes" },
  { href: "/artes", label: "Artes" },
  { href: "/inspiracoes", label: "Inspirações" },
  { href: "/cuidados", label: "Cuidados" },
];

type SiteLayoutProps = { children: React.ReactNode; pageLabel?: string };

export function SiteLayout({ children, pageLabel }: SiteLayoutProps) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: profile } = useQuery({ queryKey: ["artist-profile"], queryFn: loadArtistProfile });
  const home = location === "/";
  const whatsappDigits = profile?.whatsapp_number?.replace(/\D/g, "") ?? "";
  const whatsapp = whatsappDigits.length >= 8 && whatsappDigits.length <= 15
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Oi! Quero conversar sobre uma ideia de tatuagem.")}`
    : null;
  const email = profile?.public_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.public_email) ? profile.public_email.trim() : null;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <div className="topline"><span>Khaleesi Saithe</span><span>Sketchbook digital · tatuagem</span></div>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Khaleesi Saithe, início" onClick={() => setMenuOpen(false)}>
          <span className="wordmark-kicker">Caderno de desenhos</span><span className="wordmark-name">Khaleesi <i>Saithe</i></span>
        </Link>
        <button className="mobile-menu-button" aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
          {navItems.map((item) => <Link key={item.href} href={item.href} className={location === item.href ? "active" : ""} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
          <Link href="/agendar" className="nav-cta" onClick={() => setMenuOpen(false)}>Pedir horário <ArrowUpRight size={15} /></Link>
        </nav>
      </header>
      {!home && <div className="page-ribbon"><span>{pageLabel ?? "Caderno aberto"}</span><span>KS · {String(navItems.findIndex((item) => item.href === location) + 1).padStart(2, "0")}</span></div>}
      <main id="main-content" className="page-main" tabIndex={-1}>{children}</main>
      <footer className="site-footer">
        <div className="footer-mark"><span className="footer-seal">KS</span><div><strong>Khaleesi Saithe</strong><small>Sketchbook de tatuagem</small></div></div>
        <p className="footer-note">Desenhos que começam no papel e continuam na pele.</p>
        <ArtistSocialLinks profile={profile} compact />
        <div className="footer-links">
          <Link href="/privacidade">Privacidade</Link><Link href="/cuidados">Cuidados</Link>
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          {email && <a href={`mailto:${encodeURIComponent(email)}`}>Email</a>}
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} · Khaleesi Saithe</span><span>Feito para caber no seu caderno.</span></div>
      </footer>
    </div>
  );
}
