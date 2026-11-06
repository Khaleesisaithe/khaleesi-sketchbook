import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, accent, description, note }: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  note?: ReactNode;
}) {
  return (
    <section className="page-intro container-wide reveal">
      <div className="page-intro-grid">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="display-title">{title}{accent ? <> <em>{accent}</em></> : null}</h1>
          {description && <p className="body-large">{description}</p>}
        </div>
        {note && <aside className="page-intro-note">{note}</aside>}
      </div>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><h2>{title}</h2><p>{children}</p></div>;
}
