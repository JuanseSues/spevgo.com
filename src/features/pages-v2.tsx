import { type ComponentType, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Calendar, ChartBar, Heart, MapPin, Medal, Star, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { format, isThisWeek, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import { ADMIN_NOTIFICATION_EMAIL, CITIES, paymentCode, SPORTS, ticket, uid } from "../lib/data";
import type {
  Difficulty,
  EventItem,
  FootballCategory,
  FootballMode,
  FootballPlayer,
  AppDb,
  PaymentOrder,
  PaymentOrderStatus,
  Registration,
  Sport,
  TeamRegistration,
  User,
} from "../types/domain";
import { useStore } from "../hooks/useStore";
import { ChartCard, Empty, SimpleBar, SkeletonGrid } from "../components/common";
import { repository } from "../lib/repository";

const AnyMapContainer = MapContainer as unknown as ComponentType<any>;
const AnyTileLayer = TileLayer as unknown as ComponentType<any>;
const AnyMarker = Marker as unknown as ComponentType<any>;
const AnyPopup = Popup as unknown as ComponentType<any>;
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

const testimonials = [
  { name: "Catalina R.", text: "Encontre partidos de futbol cada semana sin complicaciones." },
  { name: "Santiago M.", text: "El ticket digital y recordatorios me facilitaron todo." },
  { name: "Laura G.", text: "Como organizadora, publicar eventos fue muy rapido." },
];

const sportTagClass: Record<string, string> = {
  futbol: "bg-emerald-100 text-emerald-800",
  ciclismo: "bg-amber-100 text-amber-800",
  running: "bg-rose-100 text-rose-800",
  natacion: "bg-sky-100 text-sky-800",
  tenis: "bg-lime-100 text-lime-800",
  baloncesto: "bg-orange-100 text-orange-800",
  voleibol: "bg-violet-100 text-violet-800",
  triatlon: "bg-cyan-100 text-cyan-800",
  senderismo: "bg-teal-100 text-teal-800",
  crossfit: "bg-red-100 text-red-800",
  "artes marciales": "bg-slate-200 text-slate-800",
  escalada: "bg-fuchsia-100 text-fuchsia-800",
};

const footballCategories: Array<{ value: FootballCategory; label: string }> = [
  { value: "6_8", label: "6 a 8 años" },
  { value: "9_11", label: "9 a 11 años" },
  { value: "12_14", label: "12 a 14 años" },
  { value: "15_17", label: "15 a 17 años" },
  { value: "mayores", label: "Mayores" },
  { value: "sub_35", label: "Sub 35" },
];

const footballModes: Array<{ value: FootballMode; label: string }> = [
  { value: "futbol_11", label: "Futbol 11" },
  { value: "futbol_7", label: "Futbol 7" },
  { value: "futbol_salon", label: "Futbol de salon" },
];

const paymentAccount = {
  bank: "Bancolombia",
  holder: "Spevgo SAS",
  account: "Ahorros 28100091234",
};

const eventPublicationFee = 59000;

const cityCoords: Record<string, [number, number]> = {
  Bogota: [4.711, -74.0721],
  Medellin: [6.2442, -75.5812],
  Cali: [3.4516, -76.532],
  Barranquilla: [10.9685, -74.7813],
  Cartagena: [10.391, -75.4794],
  Bucaramanga: [7.1193, -73.1227],
  Pereira: [4.8143, -75.6946],
  Manizales: [5.0703, -75.5138],
  "Santa Marta": [11.2408, -74.199],
  Villavicencio: [4.142, -73.6266],
  Cucuta: [7.8891, -72.4967],
  Pasto: [1.2136, -77.2811],
  Ibague: [4.4389, -75.2322],
  Monteria: [8.75, -75.883],
  Neiva: [2.9273, -75.2819],
  Armenia: [4.5339, -75.6811],
  Rionegro: [6.1551, -75.3737],
};

const defaultColombiaCenter: [number, number] = [4.5709, -74.2973];

const isValidCoordinate = (lat?: number, lng?: number) =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const getEventCoords = (event: EventItem): [number, number] | null => {
  if (isValidCoordinate(event.latitude, event.longitude)) return [event.latitude!, event.longitude!];
  return cityCoords[event.city] ?? null;
};

const geocodeInColombia = async (query: string): Promise<[number, number] | null> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=co&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;
  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  return isValidCoordinate(lat, lng) ? [lat, lng] : null;
};

const getAgeOnDate = (birthDate: string, eventDate: string): number => {
  const b = new Date(birthDate);
  const e = new Date(eventDate);
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return -1;
  let age = e.getFullYear() - b.getFullYear();
  const monthDiff = e.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && e.getDate() < b.getDate())) age -= 1;
  return age;
};

const isAgeValidForCategory = (age: number, category: FootballCategory): boolean => {
  if (age < 0) return false;
  switch (category) {
    case "6_8":
      return age >= 6 && age <= 8;
    case "9_11":
      return age >= 9 && age <= 11;
    case "12_14":
      return age >= 12 && age <= 14;
    case "15_17":
      return age >= 15 && age <= 17;
    case "mayores":
      return age >= 18;
    case "sub_35":
      return age >= 18 && age < 35;
    default:
      return false;
  }
};

const paymentStatusLabel: Record<PaymentOrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  reported: "Reportado por usuario",
  under_review: "En revision",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const paymentStatusClass: Record<PaymentOrderStatus, string> = {
  pending_payment: "bg-slate-100 text-slate-700",
  reported: "bg-amber-100 text-amber-700",
  under_review: "bg-sky-100 text-sky-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const parsePlayersFromText = (raw: string): FootballPlayer[] =>
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes("|")
        ? "|"
        : line.includes("\t")
          ? "\t"
          : line.includes(";")
            ? ";"
            : ",";
      const parts = line.split(separator).map((p) => p.trim());
      return {
        full_name: parts[0] ?? "",
        identity_number: parts[1] ?? "",
        birth_date: parts[2] ?? "",
      };
    })
    .filter((player, index) => {
      if (index !== 0) return true;
      const full = player.full_name.toLowerCase();
      const id = player.identity_number.toLowerCase();
      const birth = player.birth_date.toLowerCase();
      const isHeader =
        (full.includes("nombre") || full.includes("jugador")) &&
        (id.includes("ident") || id.includes("document")) &&
        (birth.includes("fecha") || birth.includes("nacimiento") || birth.includes("birth"));
      return !isHeader;
    });

const getPlayerLimitsByMode = (mode: FootballMode | undefined) => {
  if (mode === "futbol_7" || mode === "futbol_salon") return { min: 10, max: 15 };
  return { min: 14, max: 20 };
};

const footballModeLabel = (mode?: FootballMode) =>
  footballModes.find((m) => m.value === mode)?.label ?? "Futbol 11";

const syncFootballTeamsCounter = (db: AppDb, eventId?: string) => {
  if (!eventId) return;
  const event = db.events.find((e) => e.id === eventId);
  if (!event || event.sport !== "futbol") return;
  event.current_participants = db.team_registrations.filter((r) => r.event_id === eventId && r.status !== "rejected").length;
};

const createPaymentReportedEmail = ({
  order,
  event,
  teamReg,
}: {
  order: PaymentOrder;
  event?: EventItem;
  teamReg?: TeamRegistration;
}) => {
  const subject = `[Spevgo] Pago reportado ${order.code} - ${order.purpose === "team_registration" ? teamReg?.team_name ?? "Equipo" : event?.title ?? "Evento"}`;
  const lines = [
    "Hola equipo admin de Spevgo,",
    "",
    "Se ha reportado un nuevo pago y requiere revision.",
    "",
    "=== IDENTIFICACION ===",
    `Codigo: ${order.code}`,
    `Tipo: ${order.purpose === "team_registration" ? "Inscripcion de equipo" : "Publicacion de evento"}`,
    `Estado actual: ${paymentStatusLabel[order.status]}`,
    `Fecha reporte: ${new Date().toLocaleString("es-CO")}`,
    "",
    "=== EVENTO ===",
    `Nombre: ${event?.title ?? "N/A"}`,
    `Ciudad: ${event?.city ?? "N/A"}`,
    `Fecha: ${event?.date ?? "N/A"} ${event?.time ?? ""}`,
    `Organizador: ${event?.organizer_name ?? "N/A"}`,
    `Modalidad: ${footballModeLabel(event?.football_mode)}`,
    `Categoria futbol: ${event?.football_category ?? "N/A"}`,
    "",
    "=== EQUIPO ===",
    `Nombre equipo: ${teamReg?.team_name ?? "No aplica"}`,
    `Capitan: ${teamReg?.captain_name ?? "N/A"}`,
    `Total jugadores: ${teamReg?.players.length ?? 0}`,
    "",
    "=== PAGO REPORTADO ===",
    `Valor esperado: $${order.amount.toLocaleString("es-CO")} COP`,
    `Referencia: ${order.evidence?.reference ?? "N/A"}`,
    `Fecha de pago reportada: ${order.evidence?.paid_at ?? "N/A"}`,
    `Comprobante: ${order.evidence?.attachment_url ?? "N/A"}`,
    `Correo de reporte: ${order.evidence?.reported_email ?? "N/A"}`,
    `Notas usuario: ${order.evidence?.notes ?? "N/A"}`,
    "",
    "=== CHECKLIST DE REVISION ===",
    "- Referencia legible y consistente",
    "- Valor coincide con la orden",
    "- Comprobante visible y coherente",
    "- Evento/equipo coincide con la orden",
    "- Sin duplicidad de reporte",
    "",
    "Por favor revisar en el panel de administracion de Spevgo.",
  ];

  return {
    subject,
    body: lines.join("\n"),
  };
};

function StatCard({ icon, label, value, tone }: { icon: JSX.Element; label: string; value: number; tone: "emerald" | "sky" | "amber" }) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  }[tone];
  return (
    <div className={`surface-card flex items-center gap-3 p-4 ${toneClass}`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 dark:bg-slate-900/50">{icon}</div>
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      </div>
    </div>
  );
}

export function HomePage() {
  const { db, currentUser, updateDb } = useStore();
  const [sport, setSport] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  if (!db.data) return <SkeletonGrid />;

  const events = db.data.events
    .filter((e) => e.status === "published")
    .filter((e) => !sport || e.sport === sport)
    .filter((e) => !city || e.city === city)
    .filter((e) => !date || e.date === date);

  const featured = events.filter((e) => e.is_featured);
  const thisWeek = events.filter((e) => isThisWeek(parseISO(e.date), { weekStartsOn: 1 }));
  const footballFocus = events.filter((e) => e.sport === "futbol");
  const nearCity = city ? events.filter((e) => e.city === city) : events.slice(0, 3);

  const favorites = new Set(currentUser?.favorite_event_ids ?? []);
  const toggleFavorite = async (eventId: string) => {
    if (!currentUser) return toast.info("Inicia sesion para guardar favoritos");
    await updateDb((d) => {
      const user = d.users.find((u) => u.id === currentUser.id);
      if (!user) return d;
      const set = new Set(user.favorite_event_ids ?? []);
      if (set.has(eventId)) set.delete(eventId);
      else set.add(eventId);
      user.favorite_event_ids = Array.from(set);
      return d;
    });
  };

  return (
    <div className="space-y-10">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900 via-emerald-700 to-emerald-500 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.12),transparent_30%)]" />
        <div className="relative">
          <img
            src="/spevgo-logo.png"
            alt="Spevgo Plataforma Deportiva"
            className="h-14 w-auto rounded-md object-contain sm:h-16"
          />
          <p className="mt-3 inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Colombia · Nacional</p>
          <h1 className="text-display mt-4">Tu proxima aventura deportiva te espera</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-50/95 sm:text-base">La forma mas rapida de descubrir torneos, carreras y retos deportivos. Futbol en primer plano, y 11 disciplinas mas.</p>
        </div>
      </motion.section>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="-mt-16 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input-base" value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="">Todos los deportes</option>
            {SPORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input-base" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Todas las ciudades</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="input-base" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn-primary">Buscar eventos</button>
        </div>
      </motion.div>

      <motion.section {...fadeUp}>
        <h2 className="section-title">Eventos Destacados</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {featured.length === 0 ? <Empty text="No hay eventos destacados ahora." /> : featured.map((e) => <EventCard key={e.id} e={e} isFavorite={favorites.has(e.id)} onToggleFavorite={() => void toggleFavorite(e.id)} />)}
        </div>
      </motion.section>

      <motion.section {...fadeUp}>
        <h2 className="section-title">Futbol en tendencia</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {footballFocus.length === 0 ? <Empty text="Aun no hay eventos de futbol publicados." /> : footballFocus.map((e) => <EventCard key={e.id} e={e} isFavorite={favorites.has(e.id)} onToggleFavorite={() => void toggleFavorite(e.id)} />)}
        </div>
      </motion.section>

      <motion.section {...fadeUp}>
        <h2 className="section-title">Eventos de esta semana</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {thisWeek.length === 0 ? <Empty text="No hay eventos esta semana." /> : thisWeek.map((e) => <EventCard key={e.id} e={e} isFavorite={favorites.has(e.id)} onToggleFavorite={() => void toggleFavorite(e.id)} />)}
        </div>
      </motion.section>

      <motion.section {...fadeUp}>
        <h2 className="section-title">Cerca de ti</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {nearCity.length === 0 ? <Empty text="Selecciona una ciudad para recomendaciones cercanas." /> : nearCity.map((e) => <EventCard key={e.id} e={e} isFavorite={favorites.has(e.id)} onToggleFavorite={() => void toggleFavorite(e.id)} />)}
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="surface-card h-[320px] overflow-hidden sm:h-[380px]">
          <AnyMapContainer center={defaultColombiaCenter} zoom={5} className="h-full w-full">
            <AnyTileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {events.map((e) => {
              const coords = getEventCoords(e);
              if (!coords) return null;
              return (
              <AnyMarker key={e.id} position={coords}>
                <AnyPopup>
                  <p className="font-semibold">{e.title}</p>
                  <p>{e.date} - {e.sport}</p>
                  <Link to={`/eventos/${e.id}`} className="text-emerald-700">Ver evento</Link>
                </AnyPopup>
              </AnyMarker>
              );
            })}
          </AnyMapContainer>
        </div>
        <div className="grid gap-2">
          <StatCard icon={<Trophy size={22} />} label="Eventos publicados" value={db.data.events.filter((e) => e.status === "published").length} tone="emerald" />
          <StatCard icon={<MapPin size={22} />} label="Ciudades activas" value={new Set(db.data.events.map((e) => e.city)).size} tone="sky" />
          <StatCard icon={<ChartBar size={22} />} label="Deportistas registrados" value={db.data.registrations.length} tone="amber" />
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="surface-card p-5">
        <h2 className="section-title !mb-3">Comunidad Spevgo</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t.text}</p>
              <p className="mt-3 text-sm font-semibold">{t.name}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

export function EventDetailPage() {
  const { id } = useParams();
  const { db, currentUser, updateDb, qc } = useStore();
  const event = db.data?.events.find((e) => e.id === id);
  const [openPay, setOpenPay] = useState(false);
  const [openTeamRegistration, setOpenTeamRegistration] = useState(false);
  const [accept, setAccept] = useState(false);

  const register = useMutation({
    mutationFn: async ({ paid, method }: { paid: boolean; method?: string }) => {
      if (!currentUser || !event) throw new Error("Debes iniciar sesion");
      await updateDb((d) => {
        const exists = d.registrations.find((r) => r.event_id === event.id && r.user_id === currentUser.id && r.status !== "cancelled");
        if (exists) throw new Error("Ya te registraste");
        const reg: Registration = {
          id: uid(),
          event_id: event.id,
          event_title: event.title,
          event_date: event.date,
          event_city: event.city,
          event_sport: event.sport,
          participant_name: currentUser.name,
          participant_email: currentUser.email,
          user_id: currentUser.id,
          status: "confirmed",
          payment_status: event.price > 0 ? (paid ? "paid" : "pending_payment") : "free",
          amount_paid: paid ? event.price : 0,
          payment_method: method,
          ticket_code: paid || event.price === 0 ? ticket() : undefined,
        };
        const ev = d.events.find((x) => x.id === event.id);
        if (ev) ev.current_participants += 1;
        d.registrations.push(reg);
        return d;
      });
      await qc.invalidateQueries({ queryKey: ["db"] });
      return true;
    },
  });

  if (!event) return <Empty text="Evento no encontrado." />;

  const teamsForEvent = db.data?.team_registrations.filter((r) => r.event_id === event.id && r.status !== "rejected") ?? [];
  const teamsCount = teamsForEvent.length;
  const progressBase = event.sport === "futbol" ? (event.max_teams || 1) : (event.max_participants || 100);
  const progressCurrent = event.sport === "futbol" ? teamsCount : event.current_participants;
  const progress = Math.min(100, (progressCurrent / progressBase) * 100);
  const organizerEvents = db.data?.events.filter((e) => e.organizer_id === event.organizer_id && e.status === "published").length ?? 0;

  return (
    <div className="space-y-5 pb-20 sm:pb-0">
      <img className="h-56 w-full rounded-3xl object-cover shadow-lg shadow-emerald-100 sm:h-72" src={event.image_url || "https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1200&q=80"} />
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isToday(parseISO(event.date)) && <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">Hoy</span>}
          {event.is_featured && <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">Destacado</span>}
          {event.price === 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">Gratis</span>}
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{event.sport} · {event.city} · {format(parseISO(event.date), "dd MMM yyyy")} {event.time ?? ""}</p>
        <p className="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">{event.description || "Evento deportivo en Colombia."}</p>
        <div className="mt-4 h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-3 rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {event.sport === "futbol"
            ? `Equipos inscritos ${teamsCount}/${event.max_teams ?? "sin limite"} · Modalidad ${footballModeLabel(event.football_mode)}`
            : `Inscritos ${event.current_participants}/${event.max_participants ?? "sin limite"} · Dificultad ${event.difficulty}`}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Precio</p><p className="text-xl font-black text-emerald-700">${event.price.toLocaleString("es-CO")}</p></div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Organizador</p><p className="text-sm font-semibold">{event.organizer_name}</p></div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Reputacion</p><p className="flex items-center gap-1 text-sm font-semibold"><Star size={14} className="text-amber-500" />4.8 · {organizerEvents} eventos</p></div>
        </div>

        <div className="mt-4 h-56 overflow-hidden rounded-2xl border border-emerald-100">
          <AnyMapContainer center={getEventCoords(event) ?? defaultColombiaCenter} zoom={getEventCoords(event) ? 13 : 6} className="h-full w-full">
            <AnyTileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <AnyMarker position={getEventCoords(event) ?? defaultColombiaCenter}><AnyPopup>{event.title}</AnyPopup></AnyMarker>
          </AnyMapContainer>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-100 p-3 text-sm dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-300">Organizado por <strong>{event.organizer_name}</strong></p>
          <Link className="text-emerald-700 hover:underline" to={`/organizador/${event.organizer_id}`}>Ver perfil</Link>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-100 bg-white/95 p-3 shadow-2xl backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none dark:border-slate-700 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            Acepto terminos y condiciones
          </label>
          <button
            className="btn-primary"
            onClick={() => {
              if (!currentUser) return window.location.assign("/login");
              if (!accept) return toast.error("Debes aceptar terminos y condiciones");
              if (event.sport === "futbol") return setOpenTeamRegistration(true);
              if (event.price > 0) setOpenPay(true);
              else register.mutate({ paid: false });
            }}
          >
            {event.sport === "futbol" ? "Inscribir equipo" : "Registrarme ahora"}
          </button>
        </div>
      </div>

      {openPay && <PaymentModal amount={event.price} onClose={() => setOpenPay(false)} onSuccess={(method) => { register.mutate({ paid: true, method }); setOpenPay(false); toast.success("Pago exitoso y tiquete generado"); }} />}
      {openTeamRegistration && currentUser && (
        <TeamRegistrationModal
          event={event}
          user={currentUser}
          onClose={() => setOpenTeamRegistration(false)}
          updateDb={updateDb}
        />
      )}
    </div>
  );
}

function PaymentModal({ amount, onClose, onSuccess }: { amount: number; onClose: () => void; onSuccess: (m: string) => void }) {
  const [tab, setTab] = useState<"card" | "pse">("card");
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState("");
  const [name, setName] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [bank, setBank] = useState("Bancolombia");
  const [doc, setDoc] = useState("");

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className="surface-card w-full max-w-md p-5 shadow-xl">
        <p className="text-lg font-bold">Pago simulado</p>
        <div className="mt-3 flex gap-2">
          <button className={`rounded-xl px-3 py-1.5 ${tab === "card" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`} onClick={() => setTab("card")}>Tarjeta</button>
          <button className={`rounded-xl px-3 py-1.5 ${tab === "pse" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`} onClick={() => setTab("pse")}>PSE</button>
        </div>
        {tab === "card" ? (
          <div className="mt-3 space-y-2">
            <input className="input-base" placeholder="XXXX XXXX XXXX XXXX" value={card} onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())} />
            <input className="input-base" placeholder="Titular" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input-base" placeholder="MM/AA" value={exp} onChange={(e) => setExp(e.target.value)} />
              <input className="input-base" placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value.slice(0, 4))} />
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <select className="input-base" value={bank} onChange={(e) => setBank(e.target.value)}>
              <option>Bancolombia</option>
              <option>Davivienda</option>
              <option>BBVA</option>
              <option>Nequi</option>
            </select>
            <input className="input-base" placeholder="Documento" value={doc} onChange={(e) => setDoc(e.target.value)} />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-soft" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary px-3 py-2"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await new Promise((r) => setTimeout(r, 2000));
              setLoading(false);
              if (Math.random() < 0.05) return toast.error("Error bancario, intenta nuevamente.");
              onSuccess(tab === "card" ? "card" : `pse:${bank}`);
            }}
          >
            Pagar ${amount.toLocaleString("es-CO")} COP
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamRegistrationModal({
  event,
  user,
  onClose,
  updateDb,
}: {
  event: EventItem;
  user: User;
  onClose: () => void;
  updateDb: (updater: (d: AppDb) => AppDb) => Promise<void>;
}) {
  const [teamName, setTeamName] = useState("");
  const [playersRaw, setPlayersRaw] = useState("");
  const limits = getPlayerLimitsByMode(event.football_mode);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className="surface-card w-full max-w-2xl p-5 shadow-xl">
        <p className="text-lg font-bold">Inscripcion de equipo</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {footballModeLabel(event.football_mode)} · Min {limits.min} / Max {limits.max} jugadores.
          <br />
          Formatos soportados por linea: `Nombre | Identidad | AAAA-MM-DD` o `Nombre,Identidad,AAAA-MM-DD`
          (tambien `;` o tabulado al pegar desde Excel).
        </p>
        <input className="input-base mt-3" placeholder="Nombre del equipo" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        <textarea
          className="input-base mt-2 min-h-44"
          placeholder={"Ejemplo:\nJuan Perez|10101010|2001-04-02\nCarlos Ruiz,20202020,2000-11-18"}
          value={playersRaw}
          onChange={(e) => setPlayersRaw(e.target.value)}
        />
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <p>Banco: <strong>{paymentAccount.bank}</strong></p>
          <p>Titular: <strong>{paymentAccount.holder}</strong></p>
          <p>Cuenta: <strong>{paymentAccount.account}</strong></p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-soft" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={async () => {
              const players = parsePlayersFromText(playersRaw);
              const eventTeams = ((await repository.loadDb()).team_registrations ?? []).filter((r) => r.event_id === event.id && r.status !== "rejected").length;
              if (event.max_teams && eventTeams >= event.max_teams) return toast.error("Este evento ya completo sus cupos de equipos");
              if (!teamName.trim()) return toast.error("Ingresa nombre del equipo");
              if (players.length < limits.min || players.length > limits.max) {
                return toast.error(`El equipo debe tener entre ${limits.min} y ${limits.max} jugadores`);
              }
              const invalid = players.some((p) => !p.full_name || !p.identity_number || !p.birth_date);
              if (invalid) return toast.error("Todos los jugadores deben tener nombre, identidad y fecha");
              const identities = players.map((p) => p.identity_number.trim());
              if (new Set(identities).size !== identities.length) return toast.error("No se permiten identidades repetidas");
              const outCategory = players.some((p) => !event.football_category || !isAgeValidForCategory(getAgeOnDate(p.birth_date, event.date), event.football_category));
              if (outCategory) return toast.error("Hay jugadores fuera de la categoria del evento");

              const regId = uid();
              const orderId = uid();
              await updateDb((d) => {
                d.team_registrations.push({
                  id: regId,
                  event_id: event.id,
                  event_title: event.title,
                  captain_user_id: user.id,
                  captain_name: user.name,
                  team_name: teamName.trim(),
                  football_category: event.football_category ?? "mayores",
                  players,
                  status: "pending_payment",
                  payment_order_id: orderId,
                  created_at: new Date().toISOString(),
                });
                d.payment_orders.push({
                  id: orderId,
                  code: paymentCode(),
                  purpose: "team_registration",
                  status: "pending_payment",
                  amount: event.price,
                  created_by: user.id,
                  event_id: event.id,
                  team_registration_id: regId,
                  instructions_account: paymentAccount.account,
                  instructions_holder: paymentAccount.holder,
                  instructions_bank: paymentAccount.bank,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
                syncFootballTeamsCounter(d, event.id);
                return d;
              });
              toast.success("Equipo inscrito. Reporta el pago en Mis eventos > Inscripciones.");
              onClose();
            }}
          >
            Generar orden de pago
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateEventPage() {
  const { currentUser, updateDb } = useStore();
  const nav = useNavigate();
  const [selectedSport, setSelectedSport] = useState<Sport>("futbol");
  const [difficulty, setDifficulty] = useState<Difficulty>("all_levels");
  const [footballMode, setFootballMode] = useState<FootballMode>("futbol_11");
  const [footballCategory, setFootballCategory] = useState<FootballCategory>("mayores");
  const [showCoords, setShowCoords] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string>("");
  if (!currentUser) return <Navigate to="/login" replace />;

  const extractImageFromFile = (file?: File) =>
    new Promise<string>((resolve, reject) => {
      if (!file) return resolve("");
      if (!file.type.startsWith("image/")) return reject(new Error("El archivo debe ser una imagen"));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      reader.readAsDataURL(file);
    });

  return (
    <form className="surface-card grid gap-2 p-4" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const sport = fd.get("sport") as Sport;
      const city = String(fd.get("city"));
      const address = String(fd.get("address") || "");
      const rawLat = Number(fd.get("lat") || NaN);
      const rawLng = Number(fd.get("lng") || NaN);
      let latitude = Number.isFinite(rawLat) ? rawLat : undefined;
      let longitude = Number.isFinite(rawLng) ? rawLng : undefined;
      if (!isValidCoordinate(latitude, longitude)) {
        const locationQuery = [address, city, "Colombia"].filter(Boolean).join(", ");
        const geo = await geocodeInColombia(locationQuery);
        if (geo) {
          latitude = geo[0];
          longitude = geo[1];
        } else {
          const cityFallback = cityCoords[city];
          latitude = cityFallback?.[0];
          longitude = cityFallback?.[1];
        }
      }

      const uploadedFile = fd.get("imageFile");
      const uploadedImageData = await extractImageFromFile(uploadedFile instanceof File ? uploadedFile : undefined);
      const finalImage = uploadedImageData || uploadedImage || imageUrl || String(fd.get("image") || "");

      if (sport === "futbol") {
        const maxTeams = Number(fd.get("maxTeams") || 0);
        if (!maxTeams || maxTeams < 2) return toast.error("Define cupos por equipos (minimo 2)");
      }

      await updateDb((d) => {
        const eventId = uid();
        const orderId = uid();
        d.events.push({
          id: eventId,
          title: String(fd.get("title")),
          sport,
          city,
          date: String(fd.get("date")),
          time: String(fd.get("time") || ""),
          address,
          description: String(fd.get("description") || ""),
          image_url: finalImage,
          price: Number(fd.get("price") || 0),
          max_participants: Number(fd.get("max") || 0) || undefined,
          latitude,
          longitude,
          current_participants: 0,
          difficulty: (fd.get("difficulty") as Difficulty) || "all_levels",
          status: "draft",
          is_featured: false,
          organizer_id: currentUser.id,
          organizer_name: currentUser.name,
          payment_required: Number(fd.get("price") || 0) > 0,
          football_mode: sport === "futbol" ? footballMode : undefined,
          football_category: sport === "futbol" ? footballCategory : undefined,
          max_teams: sport === "futbol" ? Number(fd.get("maxTeams") || 0) || undefined : undefined,
        });
        d.payment_orders.push({
          id: orderId,
          code: paymentCode(),
          purpose: "event_publication",
          status: "pending_payment",
          amount: eventPublicationFee,
          created_by: currentUser.id,
          event_id: eventId,
          instructions_account: paymentAccount.account,
          instructions_holder: paymentAccount.holder,
          instructions_bank: paymentAccount.bank,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return d;
      });
      toast.success("Evento creado. Debes reportar el pago de publicacion para enviarlo a revision.");
      nav("/mis-eventos");
    }}>
      <h2 className="section-title !mb-1">Crear evento</h2>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Publicar evento tiene tarifa de <strong>${eventPublicationFee.toLocaleString("es-CO")} COP</strong>. Al finalizar, se generara un codigo de pago para transferencia y reporte de soporte.
      </div>

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Info basica</p>
        <div className="grid gap-3">
          <div className="field-floating">
            <input name="title" placeholder=" " required />
            <label>Titulo del evento</label>
          </div>
          <select className="input-base" name="sport" required value={selectedSport} onChange={(e) => {
            setSelectedSport(e.target.value as Sport);
          }}>{SPORTS.map((s) => <option key={s}>{s}</option>)}</select>
          <div className="field-floating">
            <textarea name="description" placeholder=" " rows={4} />
            <label>Descripcion</label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha y lugar</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field-floating"><input name="city" placeholder=" " required /><label>Ciudad</label></div>
          <div className="field-floating"><input name="address" placeholder=" " /><label>Direccion</label></div>
          <input className="input-base" type="date" name="date" required />
          <input className="input-base" type="time" name="time" />
        </div>
        <button type="button" className="btn-soft mt-3" onClick={() => setShowCoords((v) => !v)}>
          Seleccionar en mapa
        </button>
        {showCoords && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input className="input-base" type="number" step="any" name="lat" placeholder="Latitud" />
            <input className="input-base" type="number" step="any" name="lng" placeholder="Longitud" />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Detalles y cupos</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field-floating"><input name="price" type="number" placeholder=" " /><label>Precio COP</label></div>
          {selectedSport !== "futbol" && <div className="field-floating"><input name="max" type="number" placeholder=" " /><label>Maximo participantes</label></div>}
        </div>
        <p className="mt-4 text-xs font-medium text-slate-500">Nivel</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { value: "beginner", label: "Principiante" },
            { value: "intermediate", label: "Intermedio" },
            { value: "advanced", label: "Avanzado" },
            { value: "all_levels", label: "Todos" },
          ].map((d) => (
            <button
              key={d.value}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${difficulty === d.value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
              onClick={() => setDifficulty(d.value as Difficulty)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="difficulty" value={difficulty} />

        <div
          className={`mt-4 rounded-2xl border border-dashed p-4 text-center transition ${dragging ? "border-emerald-500 bg-emerald-100/50 dark:bg-emerald-950/30" : "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"}`}
          onDragOver={(ev) => {
            ev.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={async (ev) => {
            ev.preventDefault();
            setDragging(false);
            const file = ev.dataTransfer.files?.[0];
            if (!file) return;
            try {
              const data = await extractImageFromFile(file);
              setUploadedImage(data);
            } catch (error) {
              toast.error((error as Error).message);
            }
          }}
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Arrastra una imagen o pega una URL</p>
          <p className="mt-1 text-xs text-slate-500">Soporta archivos de imagen o URL externa.</p>
          <input className="input-base mt-3" name="image" placeholder="https://..." value={imageUrl} onChange={(ev) => setImageUrl(ev.target.value)} />
          <input className="input-base mt-2" type="file" name="imageFile" accept="image/*" onChange={async (ev) => {
            const file = ev.target.files?.[0];
            if (!file) return;
            try {
              const data = await extractImageFromFile(file);
              setUploadedImage(data);
            } catch (error) {
              toast.error((error as Error).message);
            }
          }} />
          {(uploadedImage || imageUrl) && (
            <img src={uploadedImage || imageUrl} alt="Previsualizacion" className="mx-auto mt-3 h-24 rounded-lg object-cover" />
          )}
        </div>
      </section>

      {selectedSport === "futbol" && <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Configuracion del torneo de futbol</p>
        <p className="text-xs text-slate-500">Los equipos se inscriben despues, cuando el evento este publicado por admin.</p>

        <p className="mt-3 text-xs font-medium text-slate-500">Modalidad</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {footballModes.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${footballMode === m.value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
              onClick={() => setFootballMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs font-medium text-slate-500">Categoria</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {footballCategories.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${footballCategory === c.value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
              onClick={() => setFootballCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="field-floating mt-3">
          <input name="maxTeams" type="number" min={2} placeholder=" " required />
          <label>Cupos maximos de equipos</label>
        </div>
      </section>}

      <button className="btn-primary w-fit px-5">Enviar para revision</button>
    </form>
  );
}

export function MyEventsPage() {
  const { db, currentUser, updateDb } = useStore();
  const [tab, setTab] = useState<"inscripciones" | "organizo">("inscripciones");
  const [reportingOrderId, setReportingOrderId] = useState<string | null>(null);
  if (!db.data || !currentUser) return <Navigate to="/login" replace />;

  const regs = db.data.registrations.filter((r) => r.user_id === currentUser.id);
  const own = db.data.events.filter((e) => e.organizer_id === currentUser.id);
  const teamRegs = db.data.team_registrations.filter((r) => r.captain_user_id === currentUser.id);
  const paymentOrders = db.data.payment_orders.filter((o) => o.created_by === currentUser.id);

  const downloadTicket = (r: Registration) => {
    const lines = [
      "SPEVGO TICKET DIGITAL",
      `Evento: ${r.event_title}`,
      `Fecha: ${r.event_date}`,
      `Ciudad: ${r.event_city}`,
      `Deporte: ${r.event_sport}`,
      `Participante: ${r.participant_name}`,
      `Codigo: ${r.ticket_code ?? "N/A"}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${r.ticket_code ?? r.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "inscripciones" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-200 dark:bg-slate-800 dark:text-slate-200"}`} onClick={() => setTab("inscripciones")}>Mis Inscripciones</button>
        <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "organizo" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-200 dark:bg-slate-800 dark:text-slate-200"}`} onClick={() => setTab("organizo")}>Eventos que organizo</button>
      </div>
      {tab === "inscripciones" ? (
        <div className="grid gap-3">
          {regs.length === 0 ? <Empty text="Aun no tienes inscripciones." /> : regs.map((r) => (
            <div key={r.id} className="surface-card p-4">
              <p className="font-bold">{r.event_title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{r.event_date} · {r.event_city} · pago: {r.payment_status}</p>
              {r.ticket_code && (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-3 dark:from-emerald-950/30 dark:to-slate-900">
                  <p className="font-bold">Ticket digital Spevgo</p>
                  <p>{r.participant_name} - {r.event_sport}</p>
                  <p className="font-mono text-lg tracking-widest text-emerald-700">{r.ticket_code}</p>
                  <button className="btn-soft mt-2" onClick={() => downloadTicket(r)}>Descargar ticket</button>
                </div>
              )}
              {r.status !== "cancelled" && <button className="mt-2 rounded-xl bg-red-100 px-3 py-1.5 text-red-700" onClick={async () => {
                await updateDb((d) => {
                  const reg = d.registrations.find((x) => x.id === r.id);
                  if (reg) reg.status = "cancelled";
                  return d;
                });
              }}>Cancelar</button>}
            </div>
          ))}
          {teamRegs.map((reg) => {
            const order = paymentOrders.find((o) => o.id === reg.payment_order_id);
            if (!order) return null;
            return (
              <div key={reg.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{reg.team_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{reg.event_title} · {reg.players.length} jugadores</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusClass[order.status]}`}>{paymentStatusLabel[order.status]}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Codigo de pago: <strong>{order.code}</strong> · Valor: ${order.amount.toLocaleString("es-CO")} COP</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Transferir a {order.instructions_bank} - {order.instructions_account} ({order.instructions_holder})</p>
                {order.admin_notes && <p className="mt-2 text-sm text-rose-600">Motivo: {order.admin_notes}</p>}
                {(order.status === "pending_payment" || order.status === "rejected") && (
                  <button className="btn-soft mt-3" onClick={() => setReportingOrderId(order.id)}>Reportar pago</button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          {own.length === 0 ? <Empty text="No organizas eventos aun." /> : own.map((e) => {
            const order = paymentOrders.find((o) => o.event_id === e.id && o.purpose === "event_publication");
            return <div key={e.id} className="surface-card p-4">
              <p className="font-bold">{e.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Estado del evento: {e.status}</p>
              {order && (
                <>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pago publicacion: <span className={`rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusClass[order.status]}`}>{paymentStatusLabel[order.status]}</span></p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Codigo: <strong>{order.code}</strong> · ${order.amount.toLocaleString("es-CO")} COP</p>
                  {order.admin_notes && <p className="mt-1 text-sm text-rose-600">Motivo: {order.admin_notes}</p>}
                  {(order.status === "pending_payment" || order.status === "rejected") && (
                    <button className="btn-soft mt-2" onClick={() => setReportingOrderId(order.id)}>Reportar pago</button>
                  )}
                </>
              )}
              {e.review_notes && <p className="mt-1 text-sm text-red-700">Notas revision: {e.review_notes}</p>}
            </div>;
          })}
        </div>
      )}
      {reportingOrderId && db.data.payment_orders.find((o) => o.id === reportingOrderId) && (
        <PaymentReportModal
          order={db.data.payment_orders.find((o) => o.id === reportingOrderId)!}
          onClose={() => setReportingOrderId(null)}
          onSubmit={async (payload) => {
            const currentOrder = db.data!.payment_orders.find((o) => o.id === reportingOrderId);
            const currentEvent = currentOrder?.event_id ? db.data!.events.find((e) => e.id === currentOrder.event_id) : undefined;
            const currentTeamReg = currentOrder?.team_registration_id
              ? db.data!.team_registrations.find((r) => r.id === currentOrder.team_registration_id)
              : undefined;
            await updateDb((d) => {
              const order = d.payment_orders.find((o) => o.id === reportingOrderId);
              if (!order) return d;
              order.status = "reported";
              order.evidence = payload;
              order.updated_at = new Date().toISOString();
              if (order.purpose === "team_registration" && order.team_registration_id) {
                const reg = d.team_registrations.find((r) => r.id === order.team_registration_id);
                if (reg) reg.status = "payment_reported";
              }
              return d;
            });
            if (currentOrder) {
              const updatedOrder = { ...currentOrder, status: "reported" as PaymentOrderStatus, evidence: payload };
              const email = createPaymentReportedEmail({
                order: updatedOrder,
                event: currentEvent,
                teamReg: currentTeamReg,
              });
              const mailtoUrl = `mailto:${encodeURIComponent(ADMIN_NOTIFICATION_EMAIL)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
              window.open(mailtoUrl, "_blank");
            }
            toast.success("Pago reportado. Se preparo el correo para notificacion al admin.");
            setReportingOrderId(null);
          }}
        />
      )}
    </div>
  );
}

function PaymentReportModal({
  order,
  onClose,
  onSubmit,
}: {
  order: PaymentOrder;
  onClose: () => void;
  onSubmit: (payload: { reference: string; paid_at?: string; notes?: string; attachment_url?: string; reported_email?: string }) => Promise<void>;
}) {
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [reportedEmail, setReportedEmail] = useState("");
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className="surface-card w-full max-w-lg p-5 shadow-xl">
        <p className="text-lg font-bold">Reportar pago</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Orden {order.code} · ${order.amount.toLocaleString("es-CO")} COP</p>
        <input className="input-base mt-3" placeholder="Referencia de transferencia" value={reference} onChange={(e) => setReference(e.target.value)} />
        <input className="input-base mt-2" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        <input className="input-base mt-2" placeholder="URL del comprobante (Drive/imagen)" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
        <input className="input-base mt-2" type="email" placeholder="Correo para acuse admin" value={reportedEmail} onChange={(e) => setReportedEmail(e.target.value)} />
        <textarea className="input-base mt-2" placeholder="Notas opcionales" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-soft" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={async () => {
              if (!reference.trim()) return toast.error("Debes ingresar referencia");
              await onSubmit({
                reference: reference.trim(),
                paid_at: paidAt || undefined,
                notes: notes || undefined,
                attachment_url: attachmentUrl || undefined,
                reported_email: reportedEmail || undefined,
              });
            }}
          >
            Enviar reporte
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { db, updateDb } = useStore();
  if (!db.data) return <SkeletonGrid />;

  const pending = db.data.events.filter((e) => e.status === "pending_review");
  const published = db.data.events.filter((e) => e.status === "published").length;
  const rejected = db.data.events.filter((e) => e.status === "rejected").length;
  const gmv = db.data.registrations.filter((r) => r.payment_status === "paid").reduce((a, b) => a + b.amount_paid, 0);
  const bySport = Object.entries(db.data.registrations.reduce((acc: Record<string, number>, r) => { acc[r.event_sport] = (acc[r.event_sport] || 0) + 1; return acc; }, {})).map(([name, total]) => ({ name, total })).slice(0, 5);
  const byCity = Object.entries(db.data.events.reduce((acc: Record<string, number>, e) => { acc[e.city] = (acc[e.city] || 0) + 1; return acc; }, {})).map(([name, total]) => ({ name, total })).slice(0, 5);
  const paymentPendingReview = db.data.payment_orders.filter((o) => o.status === "reported" || o.status === "under_review");

  return (
    <div className="space-y-6">
      <h1 className="section-title !mb-0 !text-3xl">Panel Admin</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          ["Pendientes", pending.length],
          ["Pagos por revisar", paymentPendingReview.length],
          ["Publicados", published],
          ["Rechazados", rejected],
          ["Registros", db.data.registrations.length],
          ["GMV", `$${gmv.toLocaleString("es-CO")}`],
        ].map(([k, v]) => <div key={String(k)} className="surface-card p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{k}</p><p className="text-2xl font-black">{v}</p></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top 5 deportes"><SimpleBar data={bySport} /></ChartCard>
        <ChartCard title="Top 5 ciudades"><SimpleBar data={byCity} /></ChartCard>
      </div>

      <section className="surface-card p-4">
        <p className="mb-2 font-bold">Revision de pagos reportados</p>
        <div className="space-y-3">
          {paymentPendingReview.length === 0 ? <Empty text="No hay pagos reportados por revisar." /> : paymentPendingReview.map((order) => (
            <PaymentReviewRow
              key={order.id}
              order={order}
              event={order.event_id ? db.data.events.find((e) => e.id === order.event_id) : undefined}
              teamReg={order.team_registration_id ? db.data.team_registrations.find((r) => r.id === order.team_registration_id) : undefined}
              onApprove={async () => updateDb((d) => {
                const target = d.payment_orders.find((o) => o.id === order.id);
                if (!target) return d;
                target.status = "approved";
                target.admin_notes = undefined;
                target.updated_at = new Date().toISOString();
                if (target.purpose === "event_publication" && target.event_id) {
                  const ev = d.events.find((e) => e.id === target.event_id);
                  if (ev) ev.status = "pending_review";
                }
                if (target.purpose === "team_registration" && target.team_registration_id) {
                  const reg = d.team_registrations.find((r) => r.id === target.team_registration_id);
                  if (reg) reg.status = "confirmed";
                  syncFootballTeamsCounter(d, target.event_id);
                }
                return d;
              })}
              onReject={async (notes) => updateDb((d) => {
                const target = d.payment_orders.find((o) => o.id === order.id);
                if (!target) return d;
                target.status = "rejected";
                target.admin_notes = notes;
                target.updated_at = new Date().toISOString();
                if (target.purpose === "event_publication" && target.event_id) {
                  const ev = d.events.find((e) => e.id === target.event_id);
                  if (ev) ev.status = "draft";
                }
                if (target.purpose === "team_registration" && target.team_registration_id) {
                  const reg = d.team_registrations.find((r) => r.id === target.team_registration_id);
                  if (reg) {
                    reg.status = "rejected";
                    reg.review_notes = notes;
                  }
                  syncFootballTeamsCounter(d, target.event_id);
                }
                return d;
              })}
            />
          ))}
        </div>
      </section>

      <section className="surface-card p-4">
        <p className="mb-2 font-bold">Revision de eventos pendientes</p>
        <div className="space-y-3">
          {pending.length === 0 ? <Empty text="No hay pendientes." /> : pending.map((e) => <PendingRow key={e.id} e={e} onApprove={async () => updateDb((d) => { const ev = d.events.find((x) => x.id === e.id); if (ev) ev.status = "published"; return d; })} onReject={async (notes) => updateDb((d) => { const ev = d.events.find((x) => x.id === e.id); if (ev) { ev.status = "rejected"; ev.review_notes = notes; } return d; })} />)}
        </div>
      </section>

      <section className="surface-card p-4">
        <p className="mb-2 font-bold">Objetivos 12 meses</p>
        <ul className="grid gap-1 text-sm md:grid-cols-2">
          <li>2000+ usuarios</li><li>150+ eventos publicados</li><li>8000+ inscripciones</li><li>8+ ciudades activas</li><li>GMV mes 12: $30.000.000 COP</li><li>NPS {">"} 50</li>
        </ul>
      </section>
    </div>
  );
}

function PaymentReviewRow({
  order,
  event,
  teamReg,
  onApprove,
  onReject,
}: {
  order: PaymentOrder;
  event?: EventItem;
  teamReg?: TeamRegistration;
  onApprove: () => Promise<void>;
  onReject: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  return (
    <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{order.purpose === "event_publication" ? "Pago publicacion de evento" : "Pago inscripcion de equipo"}</p>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusClass[order.status]}`}>{paymentStatusLabel[order.status]}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Codigo: <strong>{order.code}</strong> · Valor: ${order.amount.toLocaleString("es-CO")} COP</p>
      {event && <p className="text-sm text-slate-600 dark:text-slate-300">Evento: {event.title} ({event.city})</p>}
      {teamReg && <p className="text-sm text-slate-600 dark:text-slate-300">Equipo: {teamReg.team_name} · Jugadores: {teamReg.players.length}</p>}
      {order.evidence && (
        <div className="mt-2 rounded-xl bg-slate-50 p-2 text-sm dark:bg-slate-800">
          <p>Referencia: <strong>{order.evidence.reference}</strong></p>
          {order.evidence.paid_at && <p>Fecha de pago: {order.evidence.paid_at}</p>}
          {order.evidence.attachment_url && <p>Soporte: <a className="text-emerald-700 underline" href={order.evidence.attachment_url} target="_blank" rel="noreferrer">Ver archivo</a></p>}
          {order.evidence.reported_email && <p>Correo de reporte: {order.evidence.reported_email}</p>}
          {order.evidence.notes && <p>Notas usuario: {order.evidence.notes}</p>}
        </div>
      )}
      <textarea className="input-base mt-2" placeholder="Motivo si rechazas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <button className="btn-primary px-3 py-1.5" onClick={() => void onApprove()}>Validar pago</button>
        <button className="rounded-xl bg-red-600 px-3 py-1.5 text-white" onClick={() => void onReject(notes || "El comprobante no coincide con la orden.")}>Rechazar</button>
      </div>
    </div>
  );
}

function PendingRow({ e, onApprove, onReject }: { e: EventItem; onApprove: () => Promise<void>; onReject: (notes: string) => Promise<void> }) {
  const [n, setN] = useState("");
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{e.title}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{e.city} - {e.sport}</p>
        </div>
        <button className="btn-soft !px-2 !py-1 text-xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Ocultar detalle" : "Ver detalle completo"}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <p><strong>Fecha:</strong> {e.date} {e.time ?? ""}</p>
          <p><strong>Direccion:</strong> {e.address || "No registrada"}</p>
          <p><strong>Precio:</strong> ${e.price.toLocaleString("es-CO")} COP</p>
          <p><strong>Cupos:</strong> {e.sport === "futbol" ? `${e.max_teams ?? "sin limite"} equipos` : `${e.current_participants}/${e.max_participants ?? "sin limite"} participantes`}</p>
          <p><strong>Dificultad:</strong> {e.difficulty}</p>
          <p><strong>Organizador:</strong> {e.organizer_name}</p>
          {e.football_mode && <p><strong>Modalidad futbol:</strong> {footballModeLabel(e.football_mode)}</p>}
          {e.football_category && <p><strong>Categoria futbol:</strong> {footballCategories.find((c) => c.value === e.football_category)?.label ?? e.football_category}</p>}
          {typeof e.latitude === "number" && typeof e.longitude === "number" && <p><strong>Coordenadas:</strong> {e.latitude.toFixed(5)}, {e.longitude.toFixed(5)}</p>}
          {e.description && <p className="sm:col-span-2"><strong>Descripcion:</strong> {e.description}</p>}
        </div>
      )}
      <textarea className="input-base mt-2" placeholder="Notas de revision" value={n} onChange={(ev) => setN(ev.target.value)} />
      <div className="mt-2 flex gap-2">
        <button className="btn-primary px-3 py-1.5" onClick={() => void onApprove()}>Aprobar</button>
        <button className="rounded-xl bg-red-600 px-3 py-1.5 text-white" onClick={() => void onReject(n || "No cumple lineamientos.")}>Rechazar</button>
      </div>
    </div>
  );
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const nav = useNavigate();
  const { setSession, qc } = useStore();

  return (
    <form className="surface-card mx-auto max-w-md space-y-2 p-5" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const email = String(fd.get("email")).toLowerCase();
      const password = String(fd.get("password"));
      const terms = Boolean(fd.get("terms"));
      if (mode === "register" && !terms) return toast.error("Debes aceptar terminos");

      const db = await repository.loadDb();
      if (mode === "register") {
        if (db.users.find((u) => u.email === email)) return toast.error("Email ya registrado");
        const u: User = { id: uid(), name: String(fd.get("name")), email, password, role: "user", favorite_event_ids: [] };
        db.users.push(u);
        await repository.saveDb(db);
        await setSession(u.id);
        toast.success("Registro exitoso");
      } else {
        const u = db.users.find((x) => x.email === email && x.password === password);
        if (!u) return toast.error("Credenciales invalidas");
        await setSession(u.id);
      }

      await qc.invalidateQueries({ queryKey: ["db"] });
      nav("/");
    }}>
      <h1 className="section-title !mb-1 !text-2xl">{mode === "login" ? "Iniciar sesion" : "Crear cuenta"}</h1>
      {mode === "register" && <input className="input-base" name="name" placeholder="Nombre" required />}
      <input className="input-base" name="email" type="email" placeholder="Email" required />
      <input className="input-base" name="password" type="password" placeholder="Contrasena" required />
      {mode === "register" && <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" name="terms" />Acepto terminos y politica de privacidad</label>}
      <button className="btn-primary w-full">{mode === "login" ? "Entrar" : "Registrarme"}</button>
      <button type="button" className="btn-soft w-full" onClick={async () => {
        const db = await repository.loadDb();
        let u = db.users.find((x) => x.email === "google@spevgo.co");
        if (!u) {
          u = { id: uid(), name: "Google User", email: "google@spevgo.co", password: "oauth", role: "user", favorite_event_ids: [] };
          db.users.push(u);
          await repository.saveDb(db);
        }
        await setSession(u.id);
        nav("/");
      }}>
        Continuar con Google (simulado)
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">Demo admin: admin@spevgo.co / Admin123*</p>
    </form>
  );
}

export function OrganizerPage() {
  const { id } = useParams();
  const { db } = useStore();
  if (!db.data) return <SkeletonGrid />;
  const organizerEvents = db.data.events.filter((e) => e.organizer_id === id);
  const organizer = db.data.users.find((u) => u.id === id);
  if (!organizer) return <Empty text="Organizador no encontrado." />;

  return (
    <div className="space-y-5">
      <section className="surface-card p-5">
        <p className="text-xs uppercase tracking-wide text-emerald-600">Perfil organizador</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{organizer.name}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Especialista en eventos deportivos para Colombia.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Eventos publicados</p><p className="mt-1 flex items-center gap-1 text-xl font-black"><Medal size={16} className="text-emerald-600" />{organizerEvents.filter((e) => e.status === "published").length}</p></div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Asistentes acumulados</p><p className="mt-1 flex items-center gap-1 text-xl font-black"><Users size={16} className="text-emerald-600" />{organizerEvents.reduce((acc, e) => acc + e.current_participants, 0)}</p></div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Valoracion</p><p className="mt-1 flex items-center gap-1 text-xl font-black"><Star size={16} className="text-amber-500" />4.8</p></div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Eventos del organizador</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {organizerEvents.length === 0 ? <Empty text="Este organizador aun no publica eventos." /> : organizerEvents.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
      </section>
    </div>
  );
}

function EventCard({ e, isFavorite = false, onToggleFavorite }: { e: EventItem; isFavorite?: boolean; onToggleFavorite?: () => void }) {
  const progressBase = e.sport === "futbol" ? (e.max_teams || 1) : (e.max_participants || 100);
  const progress = Math.round((e.current_participants / progressBase) * 100);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.28 }} whileHover={{ y: -5 }} className="surface-card overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative">
        <div className="overflow-hidden">
          <img className="aspect-video w-full object-cover transition-transform duration-500 hover:scale-105" src={e.image_url || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=60"} />
        </div>
        <div className="absolute left-2 top-2 flex gap-1">
          {e.is_featured && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Destacado</span>}
          {e.price === 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Gratis</span>}
          {isToday(parseISO(e.date)) && <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700">Hoy</span>}
        </div>
        {onToggleFavorite && (
          <button className={`absolute right-2 top-2 rounded-full p-1.5 ${isFavorite ? "bg-rose-500 text-white" : "bg-white/90 text-slate-600"}`} onClick={onToggleFavorite} aria-label="Favorito">
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="space-y-2 p-4 text-sm">
        <p className="font-bold leading-snug text-slate-900 dark:text-slate-100">{e.title}</p>
        <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><MapPin size={13} />{e.city} <Calendar size={13} /> {format(parseISO(e.date), "dd MMM")}</p>
        <p className="flex items-center justify-between">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sportTagClass[e.sport] ?? "bg-emerald-100 text-emerald-800"}`}>{e.sport}</span>
          <span className="text-xs text-slate-500">{progress}% cupos</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {e.sport === "futbol"
            ? `${e.current_participants}/${e.max_teams ?? "∞"} equipos · ${footballModeLabel(e.football_mode)}`
            : `${e.current_participants}/${e.max_participants ?? "∞"} inscritos`} · ${e.price.toLocaleString("es-CO")} COP
        </p>
        <Link className="btn-ghost mt-2 inline-block px-3 py-1.5" to={`/eventos/${e.id}`}>Ver detalle</Link>
      </div>
    </motion.div>
  );
}
