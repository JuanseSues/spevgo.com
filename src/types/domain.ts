export type Role = "visitor" | "user" | "admin";
export type Difficulty = "beginner" | "intermediate" | "advanced" | "all_levels";
export type EventStatus = "draft" | "pending_review" | "published" | "rejected";
export type RegStatus = "confirmed" | "pending" | "cancelled";
export type PaymentStatus = "free" | "paid" | "pending_payment";
export type Sport =
  | "futbol"
  | "ciclismo"
  | "running"
  | "natacion"
  | "tenis"
  | "baloncesto"
  | "voleibol"
  | "triatlon"
  | "senderismo"
  | "crossfit"
  | "artes marciales"
  | "escalada";

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  sport: Sport;
  city: string;
  address?: string;
  date: string;
  time?: string;
  image_url?: string;
  max_participants?: number;
  current_participants: number;
  price: number;
  is_featured: boolean;
  latitude?: number;
  longitude?: number;
  difficulty: Difficulty;
  status: EventStatus;
  organizer_id: string;
  organizer_name: string;
  review_notes?: string;
  payment_required: boolean;
};

export type Registration = {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_city: string;
  event_sport: string;
  participant_name: string;
  participant_email: string;
  user_id: string;
  status: RegStatus;
  payment_status: PaymentStatus;
  amount_paid: number;
  payment_method?: string;
  ticket_code?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, "visitor">;
  favorite_event_ids?: string[];
};

export type AppDb = {
  events: EventItem[];
  registrations: Registration[];
  users: User[];
};
