import { Resend } from "resend";
import { recordEmailDelivery } from "./supabase";

type Delivery = { status: "sent" | "failed" | "not_configured"; errorCode?: string | null };
type BookingMail = {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  tattoo: string;
  bodyLocation: string;
  size: string;
  references: string;
  referenceUrl: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone?: string;
};

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function formatStart(value: string, timeZone = "UTC") {
  try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone }).format(new Date(value)); }
  catch { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)); }
}

async function send(to: string, subject: string, text: string, html: string, idempotencyKey: string): Promise<Delivery & { messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from || !to.trim()) return { status: "not_configured", errorCode: "missing_email_configuration" };
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from, to: [to.trim()], subject, text, html }, { idempotencyKey });
    if (error) return { status: "failed", errorCode: "provider_rejected" };
    return { status: "sent", messageId: data?.id };
  } catch { return { status: "failed", errorCode: "provider_unavailable" }; }
}

export async function sendOwnerNewBooking(booking: BookingMail): Promise<Delivery> {
  const to = process.env.BOOKING_NOTIFICATION_EMAIL?.trim() ?? "";
  const start = formatStart(booking.scheduledStart, booking.timezone);
  const values = [
    `Nome: ${booking.fullName}`, `Email: ${booking.email}`, `WhatsApp: ${booking.whatsapp}`,
    `Tatuagem desejada: ${booking.tattoo}`, `Local do corpo: ${booking.bodyLocation}`, `Tamanho: ${booking.size}`,
    `Data/hora solicitada: ${start}`, `Referências: ${booking.references || "Não informadas"}`,
    `Link: ${booking.referenceUrl || "Não informado"}`,
  ];
  const html = `<h2>Novo pedido de tatuagem — pendente</h2><p>O horário não está confirmado até sua aprovação.</p><dl>${values.map((item) => `<dd>${esc(item)}</dd>`).join("")}</dl>`;
  const delivery = await send(to, "Novo pedido de agendamento — Khaleesi Saithe", values.join("\n"), html, `appointment-${booking.id}-owner-pending`);
  await recordEmailDelivery({ appointmentId: booking.id, kind: "owner_new_request", status: delivery.status, providerMessageId: delivery.messageId, errorCode: delivery.errorCode });
  return delivery;
}

export async function sendCustomerDecision(input: {
  booking: BookingMail;
  decision: "approved" | "rejected" | "cancelled" | "rescheduled";
  decisionNote?: string;
}): Promise<Delivery> {
  const { booking, decision } = input;
  const labels = {
    approved: "Sua solicitação de horário foi aprovada",
    rejected: "Sua solicitação de horário não foi aprovada",
    cancelled: "Seu horário foi cancelado",
    rescheduled: "Seu pedido de horário foi atualizado",
  } as const;
  const decisionText = labels[decision];
  const start = formatStart(booking.scheduledStart, booking.timezone);
  const note = input.decisionNote?.trim() || "";
  const text = `${decisionText}.\n${decision === "approved" ? "Data/hora: " : "Data/hora solicitada: "}${start}${note ? `\nMensagem: ${note}` : ""}\nKhaleesi Saithe`;
  const html = `<h2>${esc(decisionText)}</h2><p>${decision === "approved" ? "Data e horário:" : "Data/horário solicitado:"} ${esc(start)}</p>${note ? `<p>${esc(note)}</p>` : ""}<p>Khaleesi Saithe</p>`;
  const delivery = await send(booking.email, "Atualização do agendamento — Khaleesi Saithe", text, html, `appointment-${booking.id}-${decision}-${booking.scheduledStart}`);
  await recordEmailDelivery({ appointmentId: booking.id, kind: "customer_decision", status: delivery.status, providerMessageId: delivery.messageId, errorCode: delivery.errorCode });
  return delivery;
}
