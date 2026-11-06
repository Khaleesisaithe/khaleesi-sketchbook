import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowUpRight, LogOut, Mail, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { ARTIST_ROUTE } from "@/lib/privateRoute";

type Tab = "appointments" | "portfolio" | "flash" | "art" | "profile" | "hours" | "privacy" | "emails";
type PortfolioItem = { id: string; title: string; description: string; category: string; image_path: string; image_alt: string; is_published: boolean; sort_order: number };
type CatalogItem = { id: string; title: string; description: string; image_path: string; dimensions: string; price: number | null; status: "available" | "reserved" | "sold" | "unavailable"; is_published: boolean; sort_order: number };
type Profile = { artist_name: string; bio: string; location: string; public_email: string; whatsapp_number: string; instagram_url: string; instagram_embed_url: string; instagram_post_urls: string[]; instagram_featured_post_url: string; pinterest_board_url: string; pinterest_embed_url: string; youtube_url: string; external_portfolio_url: string; timezone: string; slot_duration_minutes: number | null; is_public: boolean };
type Hour = { id: string; weekday: number; opens_at: string; closes_at: string; is_enabled: boolean };
type PrivacyRequest = { id: string; full_name: string; email: string; request_kind: string; message: string; status: string; created_at: string };
type EmailDelivery = { id: string; appointment_id: string | null; kind: "owner_new_request" | "customer_decision"; status: "sent" | "failed" | "not_configured"; error_code: string | null; created_at: string };

function isAllowedSocialUrl(value: string, hosts: string[]): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

function isHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === "https:"; }
  catch { return false; }
}

const tabs: { id: Tab; label: string }[] = [
  { id: "appointments", label: "Agendamentos" }, { id: "portfolio", label: "Portfólio" },
  { id: "flash", label: "Flashes" }, { id: "art", label: "Artes" },
  { id: "profile", label: "Perfil e links" }, { id: "hours", label: "Agenda e horários" },
  { id: "privacy", label: "Privacidade" }, { id: "emails", label: "Emails" },
];
const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const statusLabel: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Recusado", cancelled: "Cancelado", available: "Disponível", reserved: "Reservado", sold: "Indisponível", unavailable: "Indisponível", in_review: "Em análise", completed: "Concluído", sent: "Enviado", failed: "Falha", not_configured: "Não configurado" };
const emptyProfile: Profile = { artist_name: "Khaleesi Saithe", bio: "", location: "", public_email: "", whatsapp_number: "", instagram_url: "", instagram_embed_url: "", instagram_post_urls: [], instagram_featured_post_url: "", pinterest_board_url: "", pinterest_embed_url: "", youtube_url: "", external_portfolio_url: "", timezone: "", slot_duration_minutes: null, is_public: false };
const formatDate = (date: string, timezone?: string) => {
  try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", ...(timezone ? { timeZone: timezone } : {}) }).format(new Date(date)); }
  catch { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date)); }
};
function localDateTimeInZoneToIso(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match || !timezone) throw new Error("Horário ou fuso inválido.");
  const [, year, month, day, hour, minute] = match.map((part) => part ?? "");
  const target = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let guess = target;
  for (let index = 0; index < 5; index += 1) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const observed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const delta = target - observed;
    guess += delta;
    if (!delta) break;
  }
  const finalParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
  const observed = Date.UTC(Number(finalParts.year), Number(finalParts.month) - 1, Number(finalParts.day), Number(finalParts.hour), Number(finalParts.minute));
  if (observed !== target) throw new Error("Este horário local não existe neste fuso.");
  return new Date(guess).toISOString();
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authView, setAuthView] = useState<"login" | "request" | "update">(() => new URLSearchParams(window.location.search).get("recovery") === "1" ? "update" : "login");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [tab, setTab] = useState<Tab>("appointments");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") { setAuthView("update"); setAuthMessage(""); setAuthError(""); }
      setSession(next);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const oldContent = existing?.content;
    const meta = existing ?? document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    if (!existing) document.head.appendChild(meta);
    return () => { if (existing) meta.content = oldContent ?? ""; else meta.remove(); };
  }, []);

  const me = trpc.auth.me.useQuery(undefined, { enabled: Boolean(session?.access_token), retry: false });
  const appointmentQuery = trpc.appointments.adminList.useQuery(undefined, { enabled: Boolean(session?.access_token && me.data?.isAdmin && tab === "appointments"), retry: false });
  const updateAppointment = trpc.appointments.update.useMutation({ onSuccess: async (result) => { setMessage(`Atualização salva. Email ao cliente: ${statusLabel[result.emailStatus] || result.emailStatus}.`); setErrorText(""); await appointmentQuery.refetch(); } });

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setLoginError("Não foi possível entrar. Verifique os dados da conta Supabase Auth autorizada.");
    else { setPassword(""); await me.refetch(); }
  }
  async function requestPasswordRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(""); setAuthMessage("");
    if (!supabase) return;
    const address = email.trim();
    if (!address) { setAuthError("Informe o email da conta autorizada."); return; }
    setRecoveryBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}${ARTIST_ROUTE}?recovery=1` });
      if (error) {
        setAuthError(error.message.toLowerCase().includes("rate limit") ? "O Supabase limitou temporariamente os emails de autenticação. Aguarde antes de tentar de novo; se o projeto ainda usa o provedor padrão, configure SMTP próprio." : "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.");
      } else {
        setAuthMessage("Se este endereço corresponder à conta autorizada, você receberá um link para criar uma nova senha.");
      }
    } catch {
      setAuthError("Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.");
    } finally { setRecoveryBusy(false); }
  }
  async function saveNewPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(""); setAuthMessage("");
    if (!supabase || !session) { setAuthError("O link expirou. Solicite um novo email de recuperação."); return; }
    if (newPassword.length < 12) { setAuthError("Use uma senha com pelo menos 12 caracteres."); return; }
    if (newPassword !== confirmNewPassword) { setAuthError("As senhas não correspondem."); return; }
    setRecoveryBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      setSession(null); setAuthView("login"); setNewPassword(""); setConfirmNewPassword("");
      window.history.replaceState({}, document.title, window.location.pathname);
      setAuthMessage("Senha atualizada. Entre no painel com a nova senha.");
    } catch {
      setAuthError("Não foi possível atualizar a senha. O link pode ter expirado; solicite outro email de recuperação.");
    } finally { setRecoveryBusy(false); }
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setSession(null); setMessage(""); setErrorText(""); }

  return (
    <div className="admin-app">
      <header className="admin-brandbar"><a className="admin-brand" href="/" aria-label="Voltar ao site público"><span>KS</span><strong>Khaleesi Saithe</strong></a><span className="admin-brand-caption">Área reservada da artista</span><a className="admin-public-link" href="/">Abrir site público <ArrowUpRight size={15} /></a></header>
      <main className="admin-main">
      {!isSupabaseConfigured ? (
        <section className="container-wide admin-login paper-panel"><h2 className="form-panel-title">Conexão necessária</h2><p className="form-panel-copy">O painel será habilitado quando URL e chave pública do projeto Supabase estiverem configuradas. Nenhuma conta fictícia será criada.</p></section>
      ) : authLoading ? (
        <section className="container-wide admin-login"><p className="loading-mark">Verificando sessão…</p></section>
      ) : authView === "update" ? (
        <section className="container-wide admin-login paper-panel">
          {session ? <><h2 className="form-panel-title">Definir nova senha</h2><p className="form-panel-copy">Escolha uma senha com pelo menos 12 caracteres.</p><form onSubmit={saveNewPassword}><div className="form-field"><label htmlFor="new-password">Nova senha</label><input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} maxLength={256} /></div><div className="form-field" style={{ marginTop: 14 }}><label htmlFor="confirm-new-password">Confirme a nova senha</label><input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required minLength={12} maxLength={256} /></div>{authError && <p className="form-error" role="alert">{authError}</p>}<button className="button-primary" style={{ marginTop: 18 }} type="submit" disabled={recoveryBusy}>{recoveryBusy ? "Salvando…" : "Salvar nova senha"}</button></form></> : <><h2 className="form-panel-title">Link expirado ou inválido</h2><p className="form-panel-copy">Peça um novo link de recuperação e abra-o no mesmo navegador.</p><button className="button-outline" onClick={() => { setAuthView("request"); setAuthError(""); setAuthMessage(""); }}>Solicitar outro link</button></>}
        </section>
      ) : !session ? (
        <section className="container-wide admin-login paper-panel">
          {authView === "request" ? <><h2 className="form-panel-title">Recuperar acesso</h2><p className="form-panel-copy">Informe o email da conta autorizada. Se ele corresponder a uma conta, enviaremos um link para criar outra senha.</p><form onSubmit={requestPasswordRecovery}><div className="form-field"><label htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></div>{authError && <p className="form-error" role="alert">{authError}</p>}{authMessage && <p className="status-message" role="status">{authMessage}</p>}<button className="button-primary" style={{ marginTop: 18 }} type="submit" disabled={recoveryBusy}>{recoveryBusy ? "Enviando…" : "Enviar link de recuperação"}</button></form><button className="button-quiet" style={{ marginTop: 12 }} type="button" onClick={() => { setAuthView("login"); setAuthError(""); setAuthMessage(""); }}>Voltar para entrar</button></> : <><h2 className="form-panel-title">Entrar no painel</h2><p className="form-panel-copy">Use a conta Supabase Auth previamente criada e verificada pela responsável.</p><form onSubmit={signIn}><div className="form-field"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></div><div className="form-field" style={{ marginTop: 14 }}><label htmlFor="admin-password">Senha</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={256} /></div>{loginError && <p className="form-error" role="alert">{loginError}</p>}{authMessage && <p className="status-message" role="status">{authMessage}</p>}<button className="button-primary" style={{ marginTop: 18 }} type="submit">Entrar <ArrowUpRight size={14} /></button></form><button className="button-quiet" style={{ marginTop: 12 }} type="button" onClick={() => { setAuthView("request"); setLoginError(""); setAuthError(""); setAuthMessage(""); }}>Esqueci minha senha</button></>}
        </section>
      ) : me.isLoading ? <section className="container-wide admin-login"><p className="loading-mark">Confirmando permissões…</p></section> : !me.data?.isAdmin ? (
        <section className="container-wide admin-login paper-panel"><h2 className="form-panel-title">Acesso não autorizado</h2><p className="form-panel-copy">Esta conta não está na lista administrativa. A autorização é controlada no servidor e no banco de dados.</p><button className="button-outline" onClick={signOut}>Sair</button></section>
      ) : (
        <section className="container-wide admin-wrap">
          <div className="admin-topbar"><div><h2>Olá, Khaleesi.</h2><span className="form-help">Sessão verificada · {session.user.email}</span></div><button className="button-outline" onClick={signOut}><LogOut size={14} /> Sair</button></div>
          <nav className="admin-tabs" aria-label="Seções administrativas">{tabs.map((item) => <button key={item.id} className={`admin-tab ${tab === item.id ? "active" : ""}`} onClick={() => { setTab(item.id); setMessage(""); setErrorText(""); }} aria-pressed={tab === item.id}>{item.label}</button>)}</nav>
          {message && <p className="status-message" role="status">{message}</p>}{errorText && <p className="data-error" role="alert">{errorText}</p>}
          {tab === "appointments" && <AppointmentsPanel rows={appointmentQuery.data ?? []} loading={appointmentQuery.isLoading} error={appointmentQuery.error?.message ?? ""} onReload={() => appointmentQuery.refetch()} onUpdate={async (args) => { setMessage(""); setErrorText(""); try { await updateAppointment.mutateAsync(args); } catch { setErrorText("Não foi possível salvar esta mudança. O horário pode ter sido ocupado por outro pedido."); } }} />}
          {tab === "portfolio" && <PortfolioPanel setMessage={setMessage} setError={setErrorText} />}
          {tab === "flash" && <CatalogPanel kind="flash" setMessage={setMessage} setError={setErrorText} />}
          {tab === "art" && <CatalogPanel kind="art" setMessage={setMessage} setError={setErrorText} />}
          {tab === "profile" && <ProfilePanel setMessage={setMessage} setError={setErrorText} />}
          {tab === "hours" && <SchedulePanel setMessage={setMessage} setError={setErrorText} />}
          {tab === "privacy" && <PrivacyPanel setMessage={setMessage} setError={setErrorText} />}
          {tab === "emails" && <EmailPanel setError={setErrorText} />}
        </section>
      )}
      </main>
    </div>
  );
}

function AppointmentsPanel({ rows, loading, error, onReload, onUpdate }: { rows: Array<Record<string, any>>; loading: boolean; error: string; onReload: () => void; onUpdate: (args: { id: string; action: "approve" | "reject" | "cancel" | "reschedule"; newStart?: string; newEnd?: string; note?: string }) => Promise<void> }) {
  const [reschedule, setReschedule] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const scheduleConfig = trpc.appointments.configuration.useQuery(undefined, { retry: false });
  const studioTimezone = scheduleConfig.data?.timezone || "UTC";
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  function toIsoInTimezone(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) throw new Error("Horário inválido.");
    const [, year, month, day, hour, minute] = match.map((part) => part ?? "");
    const target = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    let guess = target;
    for (let index = 0; index < 4; index += 1) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: studioTimezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
      const observed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      const delta = target - observed; guess += delta; if (!delta) break;
    }
    return new Date(guess).toISOString();
  }
  return <div className="admin-stack"><div className="admin-topbar"><div><h2>Agendamentos</h2><small className="form-help">{pendingCount} pedidos aguardam decisão · fuso do estúdio: {studioTimezone} · horário não é confirmado antes da aprovação.</small></div><button className="button-quiet" onClick={onReload}><RefreshCw size={14} /> Atualizar</button></div>{loading ? <p className="loading-mark">Carregando solicitações…</p> : error ? <p className="data-error">Não foi possível carregar os pedidos.</p> : rows.length === 0 ? <div className="empty-state"><h3>Nenhum pedido recebido.</h3><p>As solicitações aparecerão aqui quando alguém enviar o formulário público.</p></div> : <div className="admin-list">{rows.map((row) => { const duration = new Date(row.scheduled_end).getTime() - new Date(row.scheduled_start).getTime(); return <article className="admin-card" key={row.id}><div className="admin-row"><div><strong>{row.full_name}</strong><small>{row.email} · {row.whatsapp}</small></div><span className="admin-row-status">{statusLabel[row.status] || row.status}</span></div><div className="admin-form-grid" style={{ marginTop: 14 }}><div><span className="field-label">Data/hora do estúdio</span><p>{formatDate(row.scheduled_start, studioTimezone)}</p></div><div><span className="field-label">Local e tamanho</span><p>{row.body_location} · {row.approximate_size}</p></div><div className="form-field full"><span className="field-label">Ideia</span><p>{row.tattoo_description}</p></div>{row.reference_notes && <div className="form-field full"><span className="field-label">Referências</span><p>{row.reference_notes}</p></div>}{row.reference_url && <div className="form-field full"><a href={row.reference_url} target="_blank" rel="noopener noreferrer" className="button-quiet">Abrir referência <ArrowUpRight size={13} /></a></div>}<div className="form-field full"><label htmlFor={`note-${row.id}`}>Mensagem para a resposta (opcional)</label><input id={`note-${row.id}`} value={note[row.id] ?? ""} onChange={(event) => setNote((current) => ({ ...current, [row.id]: event.target.value }))} maxLength={1000} /></div><div className="form-field full"><div className="admin-actions">{row.status === "pending" && <><button onClick={() => onUpdate({ id: row.id, action: "approve", note: note[row.id] })}>Aprovar horário</button><button onClick={() => onUpdate({ id: row.id, action: "reject", note: note[row.id] })}>Recusar</button></>}{(row.status === "approved" || row.status === "pending") && <button onClick={() => { if (window.confirm("Cancelar este pedido? O horário ficará disponível novamente.")) void onUpdate({ id: row.id, action: "cancel", note: note[row.id] }); }}>Cancelar pedido</button>}</div></div>{(row.status === "approved" || row.status === "pending") && <><div className="form-field"><label htmlFor={`reschedule-${row.id}`}>Novo horário local do estúdio ({studioTimezone})</label><input id={`reschedule-${row.id}`} type="datetime-local" value={reschedule[row.id] ?? ""} onChange={(event) => setReschedule((current) => ({ ...current, [row.id]: event.target.value }))} /></div><div className="form-field" style={{ alignSelf: "end" }}><button className="button-outline" disabled={!reschedule[row.id] || !scheduleConfig.data?.timezone} onClick={() => { try { const start = toIsoInTimezone(reschedule[row.id]); const end = new Date(new Date(start).getTime() + duration).toISOString(); void onUpdate({ id: row.id, action: "reschedule", newStart: start, newEnd: end, note: note[row.id] }); } catch { window.alert("Confira a data e o horário no fuso do estúdio."); } }}>Reagendar e enviar resposta</button></div></>}</div></article>; })}</div>}</div>;
}

async function uploadImage(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase indisponível.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sessão expirada.");
  const form = new FormData(); form.append("file", file);
  const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` }, body: form });
  if (!response.ok) throw new Error(response.status === 415 ? "Use apenas JPEG, PNG ou WebP." : response.status === 413 ? "A imagem deve ter até 8 MB." : "Falha no upload seguro.");
  const result = await response.json() as { path?: string };
  if (!result.path) throw new Error("Upload incompleto.");
  return result.path;
}

function PortfolioPanel({ setMessage, setError }: { setMessage: (value: string) => void; setError: (value: string) => void }) {
  const [rows, setRows] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  async function reload() { if (!supabase) return; setLoading(true); const { data, error } = await supabase.from("portfolio_items").select("*").order("sort_order").order("created_at", { ascending: false }); if (error) setError("Não foi possível carregar o portfólio."); else setRows((data ?? []) as PortfolioItem[]); setLoading(false); }
  useEffect(() => { void reload(); }, []);
  function clear() { setEditing(null); setFile(null); const form = document.getElementById("portfolio-form") as HTMLFormElement | null; form?.reset(); }
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!supabase) return; setBusy(true); setError(""); const form = new FormData(event.currentTarget); try { const image = file ? await uploadImage(file) : editing?.image_path; if (!image) throw new Error("Adicione uma fotografia real antes de salvar."); const values = { title: String(form.get("title") || "").trim(), description: String(form.get("description") || "").trim(), category: String(form.get("category") || "").trim(), image_path: image, image_alt: String(form.get("image_alt") || "").trim(), is_published: form.get("is_published") === "on", sort_order: Number(form.get("sort_order") || 0) }; const query = editing ? supabase.from("portfolio_items").update(values).eq("id", editing.id) : supabase.from("portfolio_items").insert(values); const { error } = await query; if (error) throw new Error("Não foi possível salvar. Verifique os campos e a autorização RLS."); setMessage("Trabalho salvo. As alterações publicadas aparecem no site."); clear(); await reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao salvar o trabalho."); } finally { setBusy(false); } }
  async function remove(item: PortfolioItem) { if (!supabase || !window.confirm(`Excluir “${item.title}” e sua fotografia?`)) return; setError(""); if (item.image_path) { const { error } = await supabase.storage.from("portfolio-images").remove([item.image_path]); if (error) { setError("Não foi possível remover a fotografia; o registro foi mantido."); return; } } const { error } = await supabase.from("portfolio_items").delete().eq("id", item.id); if (error) setError("Não foi possível excluir o trabalho."); else { setMessage("Trabalho removido."); await reload(); } }
  return <div className="admin-stack"><div className="admin-topbar"><h2>Portfólio</h2><span className="form-help">Somente fotos reais fornecidas pela artista.</span></div><form id="portfolio-form" className="admin-card" onSubmit={save}><h3>{editing ? "Editar trabalho" : "Adicionar trabalho"}</h3><div className="admin-form-grid"><div className="form-field"><label htmlFor="p-title">Título</label><input id="p-title" name="title" defaultValue={editing?.title ?? ""} required maxLength={120} /></div><div className="form-field"><label htmlFor="p-category">Categoria</label><input id="p-category" name="category" defaultValue={editing?.category ?? ""} maxLength={80} /></div><div className="form-field full"><label htmlFor="p-desc">Descrição</label><textarea id="p-desc" name="description" defaultValue={editing?.description ?? ""} maxLength={2000} /></div><div className="form-field"><label htmlFor="p-alt">Texto alternativo</label><input id="p-alt" name="image_alt" defaultValue={editing?.image_alt ?? ""} maxLength={250} /></div><div className="form-field"><label htmlFor="p-sort">Ordem</label><input id="p-sort" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} /></div><div className="form-field full"><label htmlFor="p-file">Fotografia (JPEG, PNG ou WebP · máx. 8 MB)</label><input id="p-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><span className="form-help">{editing?.image_path && !file ? "A foto atual será mantida." : "A imagem só entra no site se marcada como publicada."}</span></div><div className="form-field full"><label className="admin-check"><input name="is_published" type="checkbox" defaultChecked={editing?.is_published ?? false} /> Publicar no site</label></div><div className="form-field full admin-actions"><button className="button-primary" disabled={busy}>{busy ? "Salvando…" : <><Save size={14} /> Salvar trabalho</>}</button>{editing && <button type="button" onClick={clear}>Cancelar edição</button>}</div></div></form>{loading ? <p className="loading-mark">Carregando trabalhos…</p> : <div className="admin-list">{rows.map((row) => <div className="admin-row" key={row.id}><div><strong>{row.title}</strong><small>{row.category || "Sem categoria"} · {row.is_published ? "Publicado" : "Rascunho"}</small></div><div className="admin-actions"><button onClick={() => setEditing(row)}>Editar</button><button onClick={() => void remove(row)}><Trash2 size={12} /> Excluir</button></div></div>)}</div>}</div>;
}

function CatalogPanel({ kind, setMessage, setError }: { kind: "flash" | "art"; setMessage: (value: string) => void; setError: (value: string) => void }) {
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const tableTitle = kind === "flash" ? "Flashes" : "Artes disponíveis";
  async function reload() { if (!supabase) return; const { data, error } = await supabase.from("catalog_items").select("*").eq("kind", kind).order("sort_order").order("created_at", { ascending: false }); if (error) setError("Não foi possível carregar o catálogo."); else setRows((data ?? []) as CatalogItem[]); }
  useEffect(() => { void reload(); }, [kind]);
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!supabase) return; setBusy(true); setError(""); const form = new FormData(event.currentTarget); try { const image = file ? await uploadImage(file) : editing?.image_path; if (!image) throw new Error("Adicione uma fotografia real ou arte fornecida pela artista."); const rawPrice = String(form.get("price") || "").trim().replace(",", "."); const price = rawPrice ? Number(rawPrice) : null; if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Informe um preço válido."); const values = { kind, title: String(form.get("title") || "").trim(), description: String(form.get("description") || "").trim(), image_path: image, dimensions: String(form.get("dimensions") || "").trim(), price, status: String(form.get("status") || "available"), is_published: form.get("is_published") === "on", sort_order: Number(form.get("sort_order") || 0) }; const query = editing ? supabase.from("catalog_items").update(values).eq("id", editing.id) : supabase.from("catalog_items").insert(values); const { error } = await query; if (error) throw new Error("Não foi possível salvar o catálogo. Confira os campos e a autorização RLS."); setMessage("Item salvo."); setEditing(null); setFile(null); (document.getElementById("catalog-form") as HTMLFormElement | null)?.reset(); await reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao salvar."); } finally { setBusy(false); } }
  async function remove(item: CatalogItem) { if (!supabase || !window.confirm(`Excluir “${item.title}” do catálogo?`)) return; if (item.image_path) { const { error } = await supabase.storage.from("portfolio-images").remove([item.image_path]); if (error) { setError("Não foi possível remover a imagem; o item foi mantido."); return; } } const { error } = await supabase.from("catalog_items").delete().eq("id", item.id); if (error) setError("Não foi possível excluir."); else { setMessage("Item removido."); await reload(); } }
  return <div className="admin-stack"><div className="admin-topbar"><h2>{tableTitle}</h2><span className="form-help">Preço, dimensões e disponibilidade podem ficar em branco até serem confirmados.</span></div><form id="catalog-form" className="admin-card" onSubmit={save}><h3>{editing ? "Editar item" : "Adicionar item"}</h3><div className="admin-form-grid"><div className="form-field"><label htmlFor="c-title">Título</label><input id="c-title" name="title" defaultValue={editing?.title ?? ""} required maxLength={120} /></div><div className="form-field"><label htmlFor="c-status">Status</label><select id="c-status" name="status" defaultValue={editing?.status ?? "available"}><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="sold">Indisponível/vendido</option><option value="unavailable">Indisponível</option></select></div><div className="form-field"><label htmlFor="c-dimensions">Dimensões sugeridas</label><input id="c-dimensions" name="dimensions" defaultValue={editing?.dimensions ?? ""} maxLength={100} /></div><div className="form-field"><label htmlFor="c-price">Preço (R$)</label><input id="c-price" name="price" type="number" min="0" step="0.01" defaultValue={editing?.price ?? ""} /></div><div className="form-field full"><label htmlFor="c-description">Descrição</label><textarea id="c-description" name="description" defaultValue={editing?.description ?? ""} maxLength={2000} /></div><div className="form-field"><label htmlFor="c-order">Ordem</label><input id="c-order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} /></div><div className="form-field"><label htmlFor="c-file">Foto/arte original (JPEG, PNG ou WebP · máx. 8 MB)</label><input id="c-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div><div className="form-field full"><label className="admin-check"><input name="is_published" type="checkbox" defaultChecked={editing?.is_published ?? false} /> Publicar no site</label></div><div className="form-field full admin-actions"><button className="button-primary" disabled={busy}>{busy ? "Salvando…" : <><Upload size={14} /> Salvar item</>}</button>{editing && <button type="button" onClick={() => { setEditing(null); setFile(null); (document.getElementById("catalog-form") as HTMLFormElement | null)?.reset(); }}>Cancelar</button>}</div></div></form><div className="admin-list">{rows.map((row) => <div className="admin-row" key={row.id}><div><strong>{row.title}</strong><small>{row.status} · {row.is_published ? "Publicado" : "Rascunho"}</small></div><div className="admin-actions"><button onClick={() => setEditing(row)}>Editar</button><button onClick={() => void remove(row)}>Excluir</button></div></div>)}</div></div>;
}

function ProfilePanel({ setMessage, setError }: { setMessage: (value: string) => void; setError: (value: string) => void }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!supabase) return;
    supabase.from("artist_profile").select("*").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setError("Não foi possível carregar o perfil.");
      if (data) setProfile({ ...emptyProfile, ...data } as Profile);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const postUrls = String(form.get("instagram_post_urls") || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const featuredPost = String(form.get("instagram_featured_post_url") || "").trim();
    const youtubeUrl = String(form.get("youtube_url") || "").trim();
    const portfolioUrl = String(form.get("external_portfolio_url") || "").trim();
    const instagramPostPattern = /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?(\?.*)?$/i;
    if (postUrls.length > 12 || postUrls.some((url) => !isAllowedSocialUrl(url, ["instagram.com"]) || !instagramPostPattern.test(url))) {
      setError("Informe até 12 URLs públicas de posts/reels do Instagram, uma por linha."); return;
    }
    if (featuredPost && (!instagramPostPattern.test(featuredPost) || !postUrls.includes(featuredPost))) {
      setError("O post em destaque deve ser uma das URLs cadastradas acima."); return;
    }
    if (youtubeUrl && !isAllowedSocialUrl(youtubeUrl, ["youtube.com", "youtu.be"])) {
      setError("Informe um link HTTPS válido do YouTube."); return;
    }
    if (portfolioUrl && !isHttpsUrl(portfolioUrl)) {
      setError("Informe um link HTTPS válido para o portfólio externo."); return;
    }

    setBusy(true);
    const duration = String(form.get("slot_duration_minutes") || "");
    const values = {
      id: 1,
      artist_name: String(form.get("artist_name") || "Khaleesi Saithe").trim(),
      bio: String(form.get("bio") || "").trim(),
      location: String(form.get("location") || "").trim(),
      public_email: String(form.get("public_email") || "").trim(),
      whatsapp_number: String(form.get("whatsapp_number") || "").replace(/[^+\d]/g, ""),
      instagram_url: String(form.get("instagram_url") || "").trim(),
      instagram_embed_url: profile.instagram_embed_url ?? "",
      instagram_post_urls: postUrls,
      instagram_featured_post_url: featuredPost,
      pinterest_board_url: String(form.get("pinterest_board_url") || "").trim(),
      pinterest_embed_url: profile.pinterest_embed_url ?? "",
      youtube_url: youtubeUrl,
      external_portfolio_url: portfolioUrl,
      timezone: String(form.get("timezone") || "").trim(),
      slot_duration_minutes: duration ? Number(duration) : null,
      is_public: form.get("is_public") === "on",
    };
    const { error } = await supabase.from("artist_profile").upsert(values);
    if (error) setError("Não foi possível salvar o perfil. Confira se a migração social foi aplicada e se sua conta tem permissão administrativa.");
    else { setProfile(values); setMessage("Perfil salvo. Informações públicas atualizadas."); }
    setBusy(false);
  }

  if (!loaded) return <p className="loading-mark">Carregando perfil…</p>;
  return (
    <form className="admin-card admin-stack" onSubmit={save}>
      <div><h3>Perfil e integrações públicas</h3><p className="form-help">Só serão mostrados os campos que você preencher. Não incluímos links, telefone ou local fictícios.</p></div>
      <div className="admin-form-grid">
        <div className="form-field"><label>Nome artístico</label><input name="artist_name" defaultValue={profile.artist_name} required maxLength={120} /></div>
        <div className="form-field"><label>Local de atendimento</label><input name="location" defaultValue={profile.location} maxLength={180} /></div>
        <div className="form-field full"><label>Apresentação</label><textarea name="bio" defaultValue={profile.bio} maxLength={2000} /></div>
        <div className="form-field"><label>Email público</label><input name="public_email" type="email" defaultValue={profile.public_email} maxLength={254} /></div>
        <div className="form-field"><label>WhatsApp (DDD e país)</label><input name="whatsapp_number" type="tel" defaultValue={profile.whatsapp_number} maxLength={20} /></div>
        <div className="form-field"><label>Perfil do Instagram (HTTPS)</label><input name="instagram_url" type="url" defaultValue={profile.instagram_url} /></div>
        <div className="form-field"><label>Painel público Pinterest (HTTPS)</label><input name="pinterest_board_url" type="url" defaultValue={profile.pinterest_board_url} /></div>
        <div className="form-field full"><label>URLs de posts/reels públicos do Instagram (uma por linha, até 12)</label><textarea name="instagram_post_urls" rows={5} defaultValue={(profile.instagram_post_urls ?? []).join("\n")} placeholder="https://www.instagram.com/p/…" /><small className="form-help">Sem scraping ou sincronização automática; cadastre links públicos escolhidos por você.</small></div>
        <div className="form-field full"><label>Post em destaque (deve estar na lista acima)</label><input name="instagram_featured_post_url" type="url" defaultValue={profile.instagram_featured_post_url} /></div>
        <div className="form-field"><label>Canal ou vídeo do YouTube (HTTPS)</label><input name="youtube_url" type="url" defaultValue={profile.youtube_url} placeholder="https://www.youtube.com/@…" /></div>
        <div className="form-field"><label>Portfólio externo (HTTPS)</label><input name="external_portfolio_url" type="url" defaultValue={profile.external_portfolio_url} /></div>
        <div className="form-field"><label>Fuso horário IANA</label><input name="timezone" defaultValue={profile.timezone} placeholder="Ex.: America/Sao_Paulo" /></div>
        <div className="form-field"><label>Duração padrão (minutos)</label><select name="slot_duration_minutes" defaultValue={profile.slot_duration_minutes?.toString() ?? ""}><option value="">Selecione depois</option>{[30,45,60,90,120,180,240].map((value) => <option key={value} value={value}>{value} min</option>)}</select></div>
        <div className="form-field full"><label className="admin-check"><input name="is_public" type="checkbox" defaultChecked={profile.is_public} /> Publicar o perfil e habilitar consulta de horários</label></div>
        <div className="form-field full"><button className="button-primary" disabled={busy}>{busy ? "Salvando…" : <><Save size={14} /> Salvar perfil</>}</button></div>
      </div>
    </form>
  );
}

function SchedulePanel({ setMessage, setError }: { setMessage: (value: string) => void; setError: (value: string) => void }) {
  const [hours, setHours] = useState<Hour[]>([]);
  const [blocks, setBlocks] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const scheduleConfig = trpc.appointments.configuration.useQuery(undefined, { enabled: isSupabaseConfigured, retry: false });
  const timezone = scheduleConfig.data?.timezone || "";
  async function reload() {
    if (!supabase) return;
    setLoading(true);
    const [hoursResult, blocksResult] = await Promise.all([
      supabase.from("weekly_hours").select("*").order("weekday").order("opens_at"),
      supabase.from("blocked_slots").select("*").order("starts_at", { ascending: true }).limit(100),
    ]);
    if (hoursResult.error || blocksResult.error) setError("Não foi possível carregar a agenda.");
    else { setHours((hoursResult.data ?? []) as Hour[]); setBlocks(blocksResult.data ?? []); }
    setLoading(false);
  }
  useEffect(() => { void reload(); }, []);
  async function addHour(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = { weekday: Number(form.get("weekday")), opens_at: String(form.get("opens_at")), closes_at: String(form.get("closes_at")), is_enabled: true };
    const { error } = await supabase.from("weekly_hours").insert(value);
    if (error) setError("Não foi possível adicionar. Confira o dia, os horários e eventuais duplicidades.");
    else { setMessage("Horário semanal adicionado."); formElement.reset(); await reload(); }
  }
  async function addBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (!timezone) { setError("Defina primeiro um fuso horário IANA no perfil da artista."); return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const start = localDateTimeInZoneToIso(String(form.get("starts_at") || ""), timezone);
      const end = localDateTimeInZoneToIso(String(form.get("ends_at") || ""), timezone);
      if (new Date(end) <= new Date(start)) { setError("O fim do bloqueio precisa ser posterior ao início."); return; }
      const { error } = await supabase.from("blocked_slots").insert({ starts_at: start, ends_at: end, reason: String(form.get("reason") || "").trim() });
      if (error) setError("Não foi possível bloquear o período. Ele pode se sobrepor a outro bloqueio ou a um pedido pendente/aprovado; a agenda não foi alterada.");
      else { setMessage("Período bloqueado."); formElement.reset(); await reload(); }
    } catch { setError("Confira as datas locais e o fuso horário configurado no perfil."); }
  }
  async function remove(table: "weekly_hours" | "blocked_slots", id: string) {
    if (!supabase || !window.confirm("Remover esta regra da agenda?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setError("Não foi possível remover."); else { setMessage("Regra removida."); await reload(); }
  }
  return <div className="admin-stack"><div className="admin-topbar"><div><h2>Agenda e horários</h2><small className="form-help">Datas e horários avulsos usam o fuso do estúdio: {timezone || "defina no perfil"}.</small></div><button className="button-quiet" onClick={() => void reload()}><RefreshCw size={14} /> Atualizar</button></div>{loading ? <p className="loading-mark">Carregando disponibilidade…</p> : <><form className="admin-card" onSubmit={addHour}><h3>Horário semanal</h3><div className="admin-form-grid"><div className="form-field"><label>Dia</label><select name="weekday">{weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div><div className="form-field"><label>Abre ({timezone || "fuso do estúdio"})</label><input name="opens_at" type="time" required /></div><div className="form-field"><label>Fecha ({timezone || "fuso do estúdio"})</label><input name="closes_at" type="time" required /></div><div className="form-field" style={{ alignSelf: "end" }}><button className="button-primary">Adicionar horário</button></div></div><div className="admin-list" style={{ marginTop: 15 }}>{hours.map((hour) => <div className="admin-row" key={hour.id}><div><strong>{weekDays[hour.weekday]}</strong><small>{hour.opens_at.slice(0,5)}–{hour.closes_at.slice(0,5)}</small></div><button type="button" className="button-quiet" onClick={() => void remove("weekly_hours", hour.id)}><Trash2 size={13} /> Remover</button></div>)}</div></form><form className="admin-card" onSubmit={addBlock}><h3>Bloquear período</h3><div className="admin-form-grid"><div className="form-field"><label htmlFor="block-start">Início local ({timezone || "fuso do estúdio"})</label><input id="block-start" name="starts_at" type="datetime-local" required /></div><div className="form-field"><label htmlFor="block-end">Fim local ({timezone || "fuso do estúdio"})</label><input id="block-end" name="ends_at" type="datetime-local" required /></div><div className="form-field full"><label htmlFor="block-reason">Observação interna</label><input id="block-reason" name="reason" maxLength={250} /></div><div className="form-field full"><button className="button-outline">Bloquear período</button></div></div><div className="admin-list" style={{ marginTop: 15 }}>{blocks.map((block) => <div className="admin-row" key={block.id}><div><strong>{formatDate(block.starts_at, timezone || "UTC")} — {formatDate(block.ends_at, timezone || "UTC")}</strong><small>{block.reason || "Sem observação"}</small></div><button type="button" className="button-quiet" onClick={() => void remove("blocked_slots", block.id)}><Trash2 size={13} /> Remover</button></div>)}</div></form><p className="form-help">A agenda pública só exibe horários futuros quando o perfil estiver publicado, o fuso e a duração das sessões estiverem definidos.</p></>}</div>;
}

function PrivacyPanel({ setMessage, setError }: { setMessage: (value: string) => void; setError: (value: string) => void }) {
  const [rows, setRows] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const deletion = trpc.privacy.executeDeletion.useMutation();
  async function reload() { if (!supabase) return; setLoading(true); const { data, error } = await supabase.from("privacy_requests").select("*").order("created_at", { ascending: false }).limit(250); if (error) setError("Não foi possível carregar solicitações de privacidade."); else setRows((data ?? []) as PrivacyRequest[]); setLoading(false); }
  useEffect(() => { void reload(); }, []);
  async function update(request: PrivacyRequest) {
    if (!supabase) return;
    if (request.request_kind === "deletion") {
      const confirmation = window.prompt("Depois de verificar a identidade por um canal independente, digite o email deste pedido para confirmar a exclusão:");
      if (confirmation?.trim().toLowerCase() !== request.email.trim().toLowerCase()) { setError("Confirmação cancelada. A identidade deve ser verificada fora do site antes de apagar dados."); return; }
      try {
        const result = await deletion.mutateAsync({ requestId: request.id });
        setMessage(`Exclusão concluída: ${result.deletedAppointments} pedido(s) de agendamento removido(s); solicitação anonimizada para auditoria.`);
        setError(""); await reload();
      } catch { setError("Não foi possível executar a exclusão. Nenhum sucesso foi informado; confira permissões e tente novamente."); }
      return;
    }
    const confirmation = window.prompt("Atenda este pedido fora do site antes de concluí-lo. Digite ATENDIDA para confirmar:");
    if (confirmation?.trim().toUpperCase() !== "ATENDIDA") { setError("Pedido não concluído. Responda e aplique a correção fora do site antes de marcar como atendido."); return; }
    const { error } = await supabase.from("privacy_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", request.id);
    if (error) setError("Não foi possível atualizar o pedido."); else { setMessage("Solicitação marcada como concluída."); await reload(); }
  }
  return <div className="admin-stack"><div className="admin-topbar"><h2>Solicitações de privacidade</h2><button className="button-quiet" onClick={() => void reload()}><RefreshCw size={14} /> Atualizar</button></div>{loading ? <p className="loading-mark">Carregando solicitações…</p> : rows.length === 0 ? <div className="empty-state"><h3>Nenhuma solicitação recebida.</h3><p>Pedidos de acesso, correção ou exclusão aparecerão aqui.</p></div> : <div className="admin-list">{rows.map((row) => <article className="admin-card" key={row.id}><div className="admin-row"><div><strong>{row.full_name} · {row.request_kind}</strong><small>{row.email} · {formatDate(row.created_at)}</small></div><span className="admin-row-status">{statusLabel[row.status] || row.status}</span></div><p>{row.message || "Sem detalhes adicionais."}</p>{row.status !== "completed" && <button className="button-outline" disabled={deletion.isPending} onClick={() => void update(row)}>{row.request_kind === "deletion" ? "Confirmar e excluir dados" : "Marcar como concluída"}</button>}{row.request_kind === "deletion" && <p className="form-help">A artista deve verificar a identidade por outro canal antes da execução. A ação remove solicitações e agendamentos associados ao email; o pedido atual é anonimizado. Emails já retidos pelo provedor transacional e cópias de backup externas seguem a retenção definida por esses serviços.</p>}</article>)}</div>}</div>;
}

function EmailPanel({ setError }: { setError: (value: string) => void }) {
  const [rows, setRows] = useState<EmailDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  async function reload() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("email_delivery_logs").select("id,appointment_id,kind,status,error_code,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) setError("Não foi possível carregar o histórico de emails.");
    else setRows((data ?? []) as EmailDelivery[]);
    setLoading(false);
  }
  useEffect(() => { void reload(); }, []);
  return <div className="admin-stack"><div className="admin-topbar"><div><h2>Histórico de emails</h2><small className="form-help">Falhas e configuração ausente ficam registradas; o painel não reenvia mensagens automaticamente.</small></div><button className="button-quiet" onClick={() => void reload()}><RefreshCw size={14} /> Atualizar</button></div>{loading ? <p className="loading-mark">Carregando histórico…</p> : rows.length === 0 ? <div className="empty-state"><Mail size={20} /><h3>Nenhum email registrado.</h3><p>Os avisos da artista e as respostas aos clientes aparecerão aqui após os agendamentos.</p></div> : <div className="admin-list">{rows.map((row) => <article className="admin-card" key={row.id}><div className="admin-row"><div><strong>{row.kind === "owner_new_request" ? "Aviso à artista" : "Resposta ao cliente"}</strong><small>{formatDate(row.created_at)}{row.appointment_id ? ` · pedido ${row.appointment_id.slice(0, 8)}` : ""}</small></div><span className="admin-row-status">{statusLabel[row.status]}</span></div>{row.error_code && <p className="form-help">Código interno: {row.error_code}. Revise a configuração do provedor e contate a pessoa por um canal autorizado, se necessário.</p>}</article>)}</div>}</div>;
}
