import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { PageIntro } from "@/components/PageIntro";
import { SiteLayout } from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { isSupabaseConfigured } from "@/lib/supabase";

function dateInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}

export default function Booking() {
  const configuration = trpc.appointments.configuration.useQuery(undefined, { enabled: isSupabaseConfigured, retry: false });
  const timeZone = configuration.data?.timezone || "UTC";
  const initialized = useRef(false);
  const [date, setDate] = useState(() => dateInZone(new Date(), "UTC"));
  const [slot, setSlot] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  useEffect(() => {
    if (configuration.data?.timezone && !initialized.current) {
      setDate(dateInZone(new Date(), configuration.data.timezone)); initialized.current = true;
    }
  }, [configuration.data?.timezone]);
  const today = useMemo(() => dateInZone(new Date(), timeZone), [timeZone]);
  const maxDate = useMemo(() => addCalendarDays(today, 45), [today]);
  const availability = trpc.appointments.availability.useQuery({ date }, { enabled: isSupabaseConfigured && Boolean(configuration.data?.timezone), retry: false, staleTime: 10_000 });
  const submit = trpc.appointments.submit.useMutation({ onSuccess: (result) => { setSubmitted(result.notificationStatus); setSlot(""); } });
  const slots = availability.data?.slots ?? [];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const chosenSlot = slots.find((item) => item.start === slot);
    if (!chosenSlot || form.get("privacyConsent") !== "on") return;
    submit.mutate({ name: String(form.get("name") || ""), email: String(form.get("email") || ""), whatsapp: String(form.get("whatsapp") || ""), tattoo: String(form.get("tattoo") || ""), bodyLocation: String(form.get("bodyLocation") || ""), size: String(form.get("size") || ""), references: String(form.get("references") || ""), referenceUrl: String(form.get("referenceUrl") || ""), slotStart: chosenSlot.start, slotEnd: chosenSlot.end, privacyConsent: true, honeypot: String(form.get("website") || "") });
  }

  return (
    <SiteLayout pageLabel="Agendamento">
      <PageIntro eyebrow="Conte sua ideia" title="Vamos conversar" accent="sobre a tatuagem" description="Conte o que você imagina e escolha um horário disponível. A artista analisa o pedido antes de confirmar." note="A agenda mostra apenas os horários que a artista publicou. Seu pedido continua pendente até ela analisar e aprovar." />
      <section className="container-wide form-layout">
        <form className="paper-panel" onSubmit={handleSubmit}>
          <h2 className="form-panel-title">Pedir um horário</h2><p className="form-panel-copy">Preencha os campos e escolha um horário disponível. A artista analisa cada pedido antes de confirmar.</p>
          {!isSupabaseConfigured && <div className="status-message warning" role="status">O agendamento ainda não está disponível.</div>}
          {isSupabaseConfigured && !configuration.isLoading && !configuration.data?.timezone && <div className="status-message warning" role="status">A agenda ainda não foi publicada. A artista precisa configurar os horários e o fuso antes de receber pedidos.</div>}
          {!submitted ? <div className="form-grid">
            <div className="form-field"><label htmlFor="name">Nome</label><input id="name" name="name" autoComplete="name" required maxLength={120} /></div>
            <div className="form-field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
            <div className="form-field"><label htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" type="tel" autoComplete="tel" required maxLength={32} placeholder="Seu número com DDD" /></div>
            <div className="form-field"><label htmlFor="bodyLocation">Local do corpo</label><input id="bodyLocation" name="bodyLocation" required maxLength={100} placeholder="Ex.: antebraço" /></div>
            <div className="form-field full"><label htmlFor="tattoo">Tatuagem desejada</label><textarea id="tattoo" name="tattoo" required maxLength={2000} placeholder="Conte a ideia, tema e detalhes importantes." /></div>
            <div className="form-field"><label htmlFor="size">Tamanho aproximado</label><input id="size" name="size" required maxLength={100} placeholder="Medida aproximada" /></div>
            <div className="form-field"><label htmlFor="date">Data desejada{configuration.data?.timezone ? ` · ${configuration.data.timezone}` : ""}</label><input id="date" name="date" type="date" min={today} max={maxDate} value={date} onChange={(event) => { setDate(event.target.value); setSlot(""); }} required disabled={!isSupabaseConfigured || !configuration.data?.timezone} /></div>
            <div className="form-field"><label htmlFor="slot">Horário disponível</label><select id="slot" name="slot" value={slot} onChange={(event) => setSlot(event.target.value)} required disabled={!isSupabaseConfigured || configuration.isLoading || availability.isLoading || slots.length === 0}><option value="">{availability.isLoading || configuration.isLoading ? "Consultando horários…" : slots.length ? "Selecione um horário" : "Nenhum horário disponível"}</option>{slots.map((item) => <option key={item.start} value={item.start}>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(item.start))}</option>)}</select>{!availability.isLoading && isSupabaseConfigured && configuration.data?.timezone && !slots.length && <span className="form-help">A artista ainda não publicou horários para esta data.</span>}</div>
            <div className="form-field"><label htmlFor="referenceUrl">Link de referência (opcional)</label><input id="referenceUrl" name="referenceUrl" type="url" maxLength={1000} placeholder="https://…" /></div>
            <div className="form-field full"><label htmlFor="references">Outras referências ou observações (opcional)</label><textarea id="references" name="references" maxLength={2000} placeholder="Links, referências ou detalhes." /></div>
            <div className="form-field full honeypot" aria-hidden="true"><label htmlFor="website">Deixe este campo em branco</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
            <div className="form-field full"><label className="consent-row"><input type="checkbox" name="privacyConsent" required /><span>Concordo com o uso dos dados deste formulário para análise do pedido e contato sobre o agendamento. Li a <Link href="/privacidade" className="text-link">Política de privacidade</Link>.</span></label></div>
            <div className="form-field full"><button className="button-primary" type="submit" disabled={!isSupabaseConfigured || submit.isPending || slots.length === 0}>{submit.isPending ? "Enviando solicitação…" : "Enviar solicitação"}</button>{submit.error && <span className="form-error" role="alert">{submit.error.message.includes("PRECONDITION_FAILED") ? "O agendamento ainda não está configurado." : submit.error.message}</span>}</div>
          </div> : <div className="status-message" role="status"><strong>Recebemos sua solicitação. Ela está pendente.</strong><br />O horário só fica confirmado depois que a artista analisar e aprovar o pedido.{submitted !== "sent" && <><br /><span className="form-help">O pedido foi salvo, mas a notificação por email não foi enviada à artista.</span></>}</div>}
        </form>
        <aside className="booking-aside"><h3>Como funciona</h3><ol><li>Conte sua ideia e escolha um horário disponível.</li><li>Seu pedido fica pendente.</li><li>A artista analisa o pedido e aprova, recusa ou propõe outro horário.</li><li>Depois da decisão, você recebe uma resposta por email quando o serviço estiver configurado.</li></ol><p>Seus dados de contato e referências não são exibidos publicamente.</p><Link href="/cuidados" className="button-quiet">Ler o manual de cuidados</Link></aside>
      </section>
    </SiteLayout>
  );
}
