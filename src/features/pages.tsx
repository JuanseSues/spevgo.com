import { type ComponentType, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { toast } from "sonner";
import { CITIES, SPORTS, ticket, uid } from "../lib/data";
import type { Difficulty, EventItem, Registration, Sport, User } from "../types/domain";
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

export function HomePage() {
  const { db } = useStore();
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

  return (
    <div className="space-y-10">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900 via-emerald-700 to-emerald-500 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-10">
        <p className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Antioquia · Colombia</p>
        <h1 className="text-display mt-4">Tu proxima aventura deportiva te espera</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-50/95 sm:text-base">Descubre, crea y gestiona eventos deportivos en una sola plataforma. Futbol, running, ciclismo, natacion y mas.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input-base border-white/30 bg-white/95 dark:border-slate-700 dark:bg-slate-900" value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="">Todos los deportes</option>
            {SPORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input-base border-white/30 bg-white/95 dark:border-slate-700 dark:bg-slate-900" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Todas las ciudades</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="input-base border-white/30 bg-white/95 dark:border-slate-700 dark:bg-slate-900" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn-primary bg-black/20 backdrop-blur hover:bg-black/30">Filtrar en tiempo real</button>
        </div>
      </motion.section>

      <motion.section {...fadeUp}>
        <h2 className="section-title">Eventos Destacados</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {featured.length === 0 ? <Empty text="No hay eventos destacados ahora." /> : featured.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
      </motion.section>

      <motion.section {...fadeUp}>
        <h2 className="section-title">Proximos Eventos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {events.length === 0 ? <Empty text="No hay eventos en esta ciudad aun." /> : events.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="surface-card h-[320px] overflow-hidden sm:h-[380px]">
          <AnyMapContainer center={[6.2518, -75.5636]} zoom={9} className="h-full w-full">
            <AnyTileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {events.filter((e) => e.latitude && e.longitude).map((e) => (
              <AnyMarker key={e.id} position={[e.latitude ?? 6.25, e.longitude ?? -75.56]}>
                <AnyPopup>
                  <p className="font-semibold">{e.title}</p>
                  <p>{e.date} - {e.sport}</p>
                  <Link to={`/eventos/${e.id}`} className="text-emerald-700">Ver evento</Link>
                </AnyPopup>
              </AnyMarker>
            ))}
          </AnyMapContainer>
        </div>
        <div className="surface-card p-4">
          <p className="font-semibold">Estadisticas plataforma</p>
          <div className="mt-3 grid gap-2">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm"><p className="text-xs text-emerald-700">Eventos</p><p className="text-xl font-black text-emerald-900">{db.data.events.filter((e) => e.status === "published").length}</p></div>
            <div className="rounded-xl bg-slate-100 p-3 text-sm"><p className="text-xs text-slate-600">Ciudades activas</p><p className="text-xl font-black">{new Set(db.data.events.map((e) => e.city)).size}</p></div>
            <div className="rounded-xl bg-slate-100 p-3 text-sm"><p className="text-xs text-slate-600">Deportistas</p><p className="text-xl font-black">{db.data.registrations.length}</p></div>
          </div>
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

  return (
    <div className="space-y-5">
      <img className="h-56 w-full rounded-3xl object-cover shadow-lg shadow-emerald-100 sm:h-64" src={event.image_url || "https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1200&q=80"} />
      <div className="surface-card p-5">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{event.sport} - {event.city} - {event.date} {event.time ?? ""}</p>
        <p className="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">{event.description || "Evento deportivo en Antioquia."}</p>
        <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
          <div className="h-3 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, (event.current_participants / (event.max_participants || 100)) * 100)}%` }} />
        </div>
        <p className="mt-1 text-sm">Inscritos {event.current_participants}/{event.max_participants ?? "sin limite"} - Dificultad: {event.difficulty}</p>
        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <p className="text-xl font-extrabold text-emerald-700">${event.price.toLocaleString("es-CO")} COP</p>
          <button
            className="btn-primary"
            onClick={() => {
              if (!currentUser) return window.location.assign("/login");
              if (!accept) return toast.error("Debes aceptar terminos y condiciones");
              if (event.price > 0) setOpenPay(true); else register.mutate({ paid: false });
            }}
          >
            Registrarme
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          Acepto terminos y condiciones
        </label>
        <div className="mt-4 h-56 overflow-hidden rounded-2xl border border-emerald-100">
          <AnyMapContainer center={[event.latitude ?? 6.2442, event.longitude ?? -75.5812]} zoom={13} className="h-full w-full">
            <AnyTileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <AnyMarker position={[event.latitude ?? 6.2442, event.longitude ?? -75.5812]}><AnyPopup>{event.title}</AnyPopup></AnyMarker>
          </AnyMapContainer>
        </div>
      </div>
      {openPay && (
        <PaymentModal
          amount={event.price}
          onClose={() => setOpenPay(false)}
          onSuccess={(method) => {
            register.mutate({ paid: true, method });
            setOpenPay(false);
            toast.success("Pago exitoso y tiquete generado");
          }}
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
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
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

export function CreateEventPage() {
  const { currentUser, updateDb } = useStore();
  const nav = useNavigate();
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <form
      className="surface-card grid gap-2 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await updateDb((d) => {
          d.events.push({
            id: uid(),
            title: String(fd.get("title")),
            sport: fd.get("sport") as Sport,
            city: String(fd.get("city")),
            date: String(fd.get("date")),
            time: String(fd.get("time") || ""),
            address: String(fd.get("address") || ""),
            description: String(fd.get("description") || ""),
            image_url: String(fd.get("image") || ""),
            price: Number(fd.get("price") || 0),
            max_participants: Number(fd.get("max") || 0) || undefined,
            latitude: Number(fd.get("lat") || 0) || undefined,
            longitude: Number(fd.get("lng") || 0) || undefined,
            current_participants: 0,
            difficulty: (fd.get("difficulty") as Difficulty) || "all_levels",
            status: "pending_review",
            is_featured: false,
            organizer_id: currentUser.id,
            organizer_name: currentUser.name,
            payment_required: Number(fd.get("price") || 0) > 0,
          });
          return d;
        });
        toast.success("Evento enviado para revision");
        nav("/mis-eventos");
      }}
    >
      <h2 className="section-title !mb-1">Crear evento</h2>
      <input className="input-base" name="title" placeholder="Titulo" required />
      <select className="input-base" name="sport" required>{SPORTS.map((s) => <option key={s}>{s}</option>)}</select>
      <input className="input-base" name="city" placeholder="Ciudad" required />
      <input className="input-base" name="address" placeholder="Direccion" />
      <div className="grid gap-2 sm:grid-cols-2"><input className="input-base" type="date" name="date" required /><input className="input-base" type="time" name="time" /></div>
      <div className="grid gap-2 sm:grid-cols-2"><input className="input-base" type="number" name="price" placeholder="Precio COP" /><input className="input-base" type="number" name="max" placeholder="Maximo participantes" /></div>
      <select className="input-base" name="difficulty"><option value="all_levels">all_levels</option><option value="beginner">beginner</option><option value="intermediate">intermediate</option><option value="advanced">advanced</option></select>
      <input className="input-base" name="image" placeholder="URL imagen" />
      <div className="grid gap-2 sm:grid-cols-2"><input className="input-base" type="number" step="any" name="lat" placeholder="Latitud" /><input className="input-base" type="number" step="any" name="lng" placeholder="Longitud" /></div>
      <textarea className="input-base" name="description" placeholder="Descripcion" rows={4} />
      <button className="btn-primary">Enviar para revision</button>
    </form>
  );
}

export function MyEventsPage() {
  const { db, currentUser, updateDb } = useStore();
  const [tab, setTab] = useState<"inscripciones" | "organizo">("inscripciones");
  if (!db.data || !currentUser) return <Navigate to="/login" replace />;

  const regs = db.data.registrations.filter((r) => r.user_id === currentUser.id);
  const own = db.data.events.filter((e) => e.organizer_id === currentUser.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "inscripciones" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-200"}`} onClick={() => setTab("inscripciones")}>Mis Inscripciones</button>
        <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "organizo" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-200"}`} onClick={() => setTab("organizo")}>Eventos que organizo</button>
      </div>
      {tab === "inscripciones" ? (
        <div className="grid gap-3">
          {regs.length === 0 ? <Empty text="Aun no tienes inscripciones." /> : regs.map((r) => (
            <div key={r.id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <p className="font-bold">{r.event_title}</p>
              <p className="text-sm">{r.event_date} - {r.event_city} - pago: {r.payment_status}</p>
              {r.ticket_code && <div className="mt-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-3"><p className="font-bold">Ticket digital Spevgo</p><p>{r.participant_name} - {r.event_sport}</p><p className="font-mono text-lg tracking-widest text-emerald-700">{r.ticket_code}</p></div>}
              {r.status !== "cancelled" && (
                <button
                  className="mt-2 rounded-xl bg-red-100 px-3 py-1.5 text-red-700"
                  onClick={async () => {
                    await updateDb((d) => {
                      const reg = d.registrations.find((x) => x.id === r.id);
                      if (reg) reg.status = "cancelled";
                      return d;
                    });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {own.length === 0 ? <Empty text="No organizas eventos aun." /> : own.map((e) => <div key={e.id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="font-bold">{e.title}</p><p className="text-sm">Estado: {e.status}</p>{e.review_notes && <p className="text-sm text-red-700">Notas: {e.review_notes}</p>}</div>)}
        </div>
      )}
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

  return (
    <div className="space-y-6">
      <h1 className="section-title !mb-0 !text-3xl">Panel Admin</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Pendientes", pending.length],
          ["Publicados", published],
          ["Rechazados", rejected],
          ["Registros", db.data.registrations.length],
          ["GMV", `$${gmv.toLocaleString("es-CO")}`],
        ].map(([k, v]) => <div key={String(k)} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{k}</p><p className="text-2xl font-black">{v}</p></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top 5 deportes"><SimpleBar data={bySport} /></ChartCard>
        <ChartCard title="Top 5 ciudades"><SimpleBar data={byCity} /></ChartCard>
      </div>

      <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="mb-2 font-bold">Revision de eventos pendientes</p>
        <div className="space-y-3">
          {pending.length === 0 ? <Empty text="No hay pendientes." /> : pending.map((e) => <PendingRow key={e.id} e={e} onApprove={async () => updateDb((d) => { const ev = d.events.find((x) => x.id === e.id); if (ev) ev.status = "published"; return d; })} onReject={async (notes) => updateDb((d) => { const ev = d.events.find((x) => x.id === e.id); if (ev) { ev.status = "rejected"; ev.review_notes = notes; } return d; })} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="mb-2 font-bold">Objetivos 12 meses</p>
        <ul className="grid gap-1 text-sm md:grid-cols-2">
          <li>2000+ usuarios</li><li>150+ eventos publicados</li><li>8000+ inscripciones</li><li>8+ ciudades activas</li><li>GMV mes 12: $30.000.000 COP</li><li>NPS {">"} 50</li>
        </ul>
      </section>
    </div>
  );
}

function PendingRow({ e, onApprove, onReject }: { e: EventItem; onApprove: () => Promise<void>; onReject: (notes: string) => Promise<void> }) {
  const [n, setN] = useState("");
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <p className="font-semibold">{e.title}</p>
      <p className="text-sm">{e.city} - {e.sport}</p>
      <textarea className="mt-2 w-full rounded-xl border p-2 text-sm" placeholder="Notas de revision" value={n} onChange={(ev) => setN(ev.target.value)} />
      <div className="mt-2 flex gap-2">
        <button className="rounded-xl bg-emerald-600 px-3 py-1.5 text-white" onClick={() => void onApprove()}>Aprobar</button>
        <button className="rounded-xl bg-red-600 px-3 py-1.5 text-white" onClick={() => void onReject(n || "No cumple lineamientos.")}>Rechazar</button>
      </div>
    </div>
  );
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const nav = useNavigate();
  const { setSession, qc } = useStore();

  return (
    <form
      className="surface-card mx-auto max-w-md space-y-2 p-5"
      onSubmit={async (e) => {
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
      }}
    >
      <h1 className="section-title !mb-1 !text-2xl">{mode === "login" ? "Iniciar sesion" : "Crear cuenta"}</h1>
      {mode === "register" && <input className="input-base" name="name" placeholder="Nombre" required />}
      <input className="input-base" name="email" type="email" placeholder="Email" required />
      <input className="input-base" name="password" type="password" placeholder="Contrasena" required />
      {mode === "register" && <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" name="terms" />Acepto terminos y politica de privacidad</label>}
      <button className="btn-primary w-full">{mode === "login" ? "Entrar" : "Registrarme"}</button>
      <button
        type="button"
        className="btn-soft w-full"
        onClick={async () => {
          const db = await repository.loadDb();
          let u = db.users.find((x) => x.email === "google@spevgo.co");
          if (!u) {
            u = { id: uid(), name: "Google User", email: "google@spevgo.co", password: "oauth", role: "user", favorite_event_ids: [] };
            db.users.push(u);
            await repository.saveDb(db);
          }
          await setSession(u.id);
          nav("/");
        }}
      >
        Continuar con Google (simulado)
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">Demo admin: admin@spevgo.co / Admin123*</p>
    </form>
  );
}

function EventCard({ e }: { e: EventItem }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.28 }} whileHover={{ y: -5 }} className="surface-card overflow-hidden transition-shadow hover:shadow-lg">
      <img className="h-36 w-full object-cover" src={e.image_url || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=60"} />
      <div className="space-y-2 p-4 text-sm">
        <p className="font-bold leading-snug text-slate-900 dark:text-slate-100">{e.title}</p>
        <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><MapPin size={14} />{e.city} <Calendar size={14} /> {e.date}</p>
        <p><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{e.sport}</span></p>
        <Link className="btn-primary mt-2 inline-block px-3 py-1.5" to={`/eventos/${e.id}`}>Ver detalle</Link>
      </div>
    </motion.div>
  );
}
