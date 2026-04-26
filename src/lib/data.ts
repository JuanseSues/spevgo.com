import type { AppDb, EventItem, Sport, User } from "../types/domain";

export const SPORTS: Sport[] = [
  "futbol",
  "ciclismo",
  "running",
  "natacion",
  "tenis",
  "baloncesto",
  "voleibol",
  "triatlon",
  "senderismo",
  "crossfit",
  "artes marciales",
  "escalada",
];

export const CITIES = [
  "Medellin",
  "Rionegro",
  "Envigado",
  "Bello",
  "Itagui",
  "Sabaneta",
  "Guarne",
  "Santa Fe de Antioquia",
];

export const STORAGE_DB_KEY = "spevgo-db-v1";
export const STORAGE_SESSION_KEY = "spevgo-session-v1";

export const uid = () => crypto.randomUUID();
export const ticket = () => `EVS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const initialEvents: EventItem[] = [
  {
    id: uid(),
    title: "Clasico Paisa Amateur",
    description: "Torneo de futbol 8 con scouting local.",
    sport: "futbol",
    city: "Medellin",
    date: "2026-05-18",
    time: "09:00",
    current_participants: 42,
    max_participants: 64,
    price: 35000,
    is_featured: true,
    latitude: 6.2442,
    longitude: -75.5812,
    difficulty: "intermediate",
    status: "published",
    organizer_id: "seed-admin",
    organizer_name: "Spevgo Admin",
    payment_required: true,
    image_url: "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: uid(),
    title: "Ruta Ciclismo Oriente",
    description: "Circuito recreativo para todos los niveles.",
    sport: "ciclismo",
    city: "Rionegro",
    date: "2026-05-26",
    time: "06:30",
    current_participants: 30,
    max_participants: 90,
    price: 0,
    is_featured: true,
    latitude: 6.1544,
    longitude: -75.3737,
    difficulty: "all_levels",
    status: "published",
    organizer_id: "seed-admin",
    organizer_name: "Spevgo Admin",
    payment_required: false,
  },
  {
    id: uid(),
    title: "5K Nocturna Envigado",
    description: "Running urbano con kit oficial.",
    sport: "running",
    city: "Envigado",
    date: "2026-06-03",
    time: "19:00",
    current_participants: 18,
    max_participants: 300,
    price: 28000,
    is_featured: false,
    latitude: 6.1703,
    longitude: -75.5872,
    difficulty: "beginner",
    status: "published",
    organizer_id: "seed-admin",
    organizer_name: "Spevgo Admin",
    payment_required: true,
  },
];

const initialUsers: User[] = [
  { id: "seed-admin", name: "Admin Spevgo", email: "admin@spevgo.co", password: "Admin123*", role: "admin", favorite_event_ids: [] },
  { id: "seed-user", name: "Juan Deportista", email: "user@spevgo.co", password: "User123*", role: "user", favorite_event_ids: [] },
];

export const createSeedDb = (): AppDb => ({
  events: initialEvents,
  registrations: [],
  users: initialUsers,
});
