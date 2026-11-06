import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAnonSupabaseClient, createUserSupabaseClient, isSupabaseServerConfigured } from "./_core/supabase";
import { sendCustomerDecision, sendOwnerNewBooking } from "./_core/email";
import { enforceRateLimit } from "./_core/rateLimit";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const emailSchema = z.string().trim().email().max(254);
const bookingInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  whatsapp: z.string().trim().min(8).max(32),
  tattoo: z.string().trim().min(10).max(2000),
  bodyLocation: z.string().trim().min(2).max(100),
  size: z.string().trim().min(1).max(100),
  references: z.string().max(2000).optional().default(""),
  referenceUrl: z.string().trim().max(1000).optional().default("").refine((value) => !value || /^https:\/\/[^\s]+$/i.test(value), "O link deve começar com https://."),
  slotStart: z.string().datetime({ offset: true }),
  slotEnd: z.string().datetime({ offset: true }),
  privacyConsent: z.boolean().refine((value) => value === true, "O consentimento é obrigatório."),
  honeypot: z.string().max(150).optional().default(""),
});

function configured() {
  if (!isSupabaseServerConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "O serviço ainda não está configurado." });
}
function safeDatabaseFailure(): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a solicitação. Tente novamente." });
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ({
      user: ctx.supabaseUser ? { id: ctx.supabaseUser.id, email: ctx.supabaseUser.email ?? null } : null,
      isAdmin: ctx.isAdmin,
    })),
  }),
  appointments: router({
    configuration: publicProcedure.query(async () => {
      configured();
      const { data, error } = await createAnonSupabaseClient().from("artist_profile").select("timezone").eq("id", 1).maybeSingle();
      if (error) safeDatabaseFailure();
      return { timezone: data?.timezone || null };
    }),
    availability: publicProcedure.input(z.object({ date: dateSchema })).query(async ({ input }) => {
      configured();
      enforceRateLimit("availability-global", "all", 300, 60 * 1000);
      const client = createAnonSupabaseClient();
      const [{ data, error }, { data: profile, error: profileError }] = await Promise.all([
        client.rpc("get_public_slots", { p_date: input.date }),
        client.from("artist_profile").select("timezone").eq("id", 1).maybeSingle(),
      ]);
      if (error || profileError) safeDatabaseFailure();
      const rows = (data ?? []) as Array<{ slot_start: string; slot_end: string }>;
      const uniqueRows = Array.from(new Map(rows.map((row) => [`${row.slot_start}|${row.slot_end}`, row])).values());
      return { timezone: profile?.timezone || null, slots: uniqueRows.map((row) => ({ start: row.slot_start, end: row.slot_end })) };
    }),
    submit: publicProcedure.input(bookingInput).mutation(async ({ input }) => {
      configured();
      enforceRateLimit("booking-email", input.email.toLowerCase(), 6, 15 * 60 * 1000);
      enforceRateLimit("booking-global", "all", 120, 15 * 60 * 1000);
      const client = createAnonSupabaseClient();
      const { data, error } = await client.rpc("create_public_appointment", {
        p_name: input.name,
        p_email: input.email,
        p_whatsapp: input.whatsapp,
        p_tattoo: input.tattoo,
        p_body_location: input.bodyLocation,
        p_size: input.size,
        p_references: input.references,
        p_reference_url: input.referenceUrl,
        p_start: input.slotStart,
        p_end: input.slotEnd,
        p_consent: input.privacyConsent,
        p_honeypot: input.honeypot,
      });
      if (error) {
        if (error.message.includes("SLOT_UNAVAILABLE")) throw new TRPCError({ code: "CONFLICT", message: "Esse horário acabou de ficar indisponível. Atualize a agenda e escolha outro." });
        if (error.message.includes("RATE_LIMITED")) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas solicitações para este email. Aguarde antes de tentar novamente." });
        if (error.message.includes("INVALID_REQUEST") || error.message.includes("INVALID_REFERENCE_URL")) throw new TRPCError({ code: "BAD_REQUEST", message: "Confira os dados enviados e tente novamente." });
        safeDatabaseFailure();
      }
      const appointmentId = typeof data === "string" ? data : (data as { id?: string } | null)?.id;
      if (!appointmentId) safeDatabaseFailure();
      const { data: profile } = await client.from("artist_profile").select("timezone").eq("id", 1).maybeSingle();
      const start = input.slotStart;
      const booking = {
        id: appointmentId,
        fullName: input.name,
        email: input.email,
        whatsapp: input.whatsapp,
        tattoo: input.tattoo,
        bodyLocation: input.bodyLocation,
        size: input.size,
        references: input.references,
        referenceUrl: input.referenceUrl,
        scheduledStart: start,
        scheduledEnd: input.slotEnd,
        timezone: profile?.timezone || "UTC",
      };
      const delivery = await sendOwnerNewBooking(booking);
      return { id: appointmentId, status: "pending" as const, notificationStatus: delivery.status };
    }),
    adminList: adminProcedure.query(async ({ ctx }) => {
      const db = createUserSupabaseClient(ctx.accessToken);
      const { data, error } = await db.from("appointments").select("*").order("scheduled_start", { ascending: true }).limit(250);
      if (error) safeDatabaseFailure();
      return data ?? [];
    }),
    update: adminProcedure.input(z.object({
      id: z.string().uuid(),
      action: z.enum(["approve", "reject", "cancel", "reschedule"]),
      newStart: z.string().datetime({ offset: true }).optional(),
      newEnd: z.string().datetime({ offset: true }).optional(),
      note: z.string().trim().max(1000).optional().default(""),
    })).mutation(async ({ input, ctx }) => {
      const db = createUserSupabaseClient(ctx.accessToken);
      const { data: current, error: readError } = await db.from("appointments").select("*").eq("id", input.id).maybeSingle();
      if (readError || !current) throw new TRPCError({ code: "NOT_FOUND", message: "O pedido não foi encontrado." });
      let status = current.status as "pending" | "approved" | "rejected" | "cancelled";
      let scheduledStart = current.scheduled_start as string;
      let scheduledEnd = current.scheduled_end as string;
      if (input.action === "approve") {
        if (status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "Somente pedidos pendentes podem ser aprovados." });
        status = "approved";
      } else if (input.action === "reject") {
        if (status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "Somente pedidos pendentes podem ser recusados." });
        status = "rejected";
      } else if (input.action === "cancel") {
        if (status !== "pending" && status !== "approved") throw new TRPCError({ code: "CONFLICT", message: "Este pedido não pode mais ser cancelado." });
        status = "cancelled";
      } else {
        if (status !== "pending" && status !== "approved") throw new TRPCError({ code: "CONFLICT", message: "Somente pedidos ativos podem ser reagendados." });
        if (!input.newStart || !input.newEnd || new Date(input.newEnd) <= new Date(input.newStart)) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha um novo horário válido." });
        const { data: profile, error: profileError } = await db.from("artist_profile").select("timezone,slot_duration_minutes").eq("id", 1).maybeSingle();
        if (profileError || !profile?.timezone || !profile.slot_duration_minutes) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure fuso horário e duração das sessões antes de reagendar." });
        if (new Date(input.newEnd).getTime() - new Date(input.newStart).getTime() !== Number(profile.slot_duration_minutes) * 60_000) throw new TRPCError({ code: "BAD_REQUEST", message: "A duração não corresponde ao tempo de sessão configurado." });
        const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: profile.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(input.newStart));
        const { data: slots, error: slotError } = await db.rpc("get_public_slots", { p_date: localDate });
        if (slotError || !(slots ?? []).some((slot: { slot_start: string; slot_end: string }) => new Date(slot.slot_start).getTime() === new Date(input.newStart!).getTime() && new Date(slot.slot_end).getTime() === new Date(input.newEnd!).getTime())) {
          throw new TRPCError({ code: "CONFLICT", message: "O horário escolhido não está livre. Atualize a agenda e tente novamente." });
        }
        scheduledStart = input.newStart;
        scheduledEnd = input.newEnd;
      }
      const { data: updated, error: updateError } = await db.from("appointments").update({
        status,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        decision_note: input.note,
        decided_by: ctx.supabaseUser.id,
        decided_at: new Date().toISOString(),
      }).eq("id", input.id).eq("status", current.status).eq("updated_at", current.updated_at).select("*").single();
      if (updateError) {
        if (updateError.code === "PGRST116") throw new TRPCError({ code: "CONFLICT", message: "O pedido mudou enquanto você atualizava. Recarregue a agenda antes de decidir novamente." });
        if (updateError.code === "23P01" || updateError.code === "23505") throw new TRPCError({ code: "CONFLICT", message: "O horário conflita com um pedido ativo ou bloqueio. Atualize a agenda." });
        safeDatabaseFailure();
      }
      const { data: profile } = await db.from("artist_profile").select("timezone").eq("id", 1).maybeSingle();
      const decision = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : input.action === "cancel" ? "cancelled" : "rescheduled";
      const delivery = await sendCustomerDecision({
        booking: {
          id: updated.id,
          fullName: updated.full_name,
          email: updated.email,
          whatsapp: updated.whatsapp,
          tattoo: updated.tattoo_description,
          bodyLocation: updated.body_location,
          size: updated.approximate_size,
          references: updated.reference_notes,
          referenceUrl: updated.reference_url,
          scheduledStart: updated.scheduled_start,
          scheduledEnd: updated.scheduled_end,
          timezone: profile?.timezone || "UTC",
        },
        decision,
        decisionNote: input.note,
      });
      return { success: true, status, emailStatus: delivery.status };
    }),
  }),
  privacy: router({
    request: publicProcedure.input(z.object({
      name: z.string().trim().min(2).max(120),
      email: emailSchema,
      kind: z.enum(["access", "correction", "deletion"]),
      message: z.string().max(1500).default(""),
      consent: z.boolean().refine((value) => value === true, "O consentimento é obrigatório."),
    })).mutation(async ({ input }) => {
      configured();
      enforceRateLimit("privacy-email", input.email.toLowerCase(), 4, 60 * 60 * 1000);
      enforceRateLimit("privacy-global", "all", 40, 60 * 60 * 1000);
      const { error } = await createAnonSupabaseClient().rpc("create_privacy_request", {
        p_name: input.name, p_email: input.email, p_kind: input.kind, p_message: input.message, p_consent: input.consent,
      });
      if (error) {
        if (error.message.includes("RATE_LIMITED")) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas solicitações recentes para este email." });
        if (error.message.includes("INVALID_REQUEST")) throw new TRPCError({ code: "BAD_REQUEST", message: "Confira os dados do pedido." });
        safeDatabaseFailure();
      }
      return { success: true };
    }),
    executeDeletion: adminProcedure.input(z.object({ requestId: z.string().uuid() })).mutation(async ({ input, ctx }) => {
      const db = createUserSupabaseClient(ctx.accessToken);
      const { data, error } = await db.rpc("execute_privacy_deletion", { p_request_id: input.requestId });
      if (error) {
        if (error.message.includes("REQUEST_NOT_FOUND")) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado ou já concluído." });
        if (error.message.includes("NOT_AUTHORIZED")) throw new TRPCError({ code: "FORBIDDEN", message: "A conta não pode executar esta operação." });
        safeDatabaseFailure();
      }
      return { success: true, deletedAppointments: Number(data ?? 0) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
