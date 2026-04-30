export type Role = "visitor" | "user" | "admin";
export type Difficulty = "beginner" | "intermediate" | "advanced" | "all_levels";
export type FootballCategory = "6_8" | "9_11" | "12_14" | "15_17" | "mayores" | "sub_35";
export type FootballMode = "futbol_11" | "futbol_7" | "futbol_salon";
export type EventStatus = "draft" | "pending_review" | "published" | "rejected";
export type RegStatus = "confirmed" | "pending" | "cancelled";
export type PaymentStatus = "free" | "paid" | "pending_payment";
export type TeamRegistrationStatus = "pending_payment" | "payment_reported" | "confirmed" | "rejected";
export type PaymentOrderStatus = "pending_payment" | "reported" | "under_review" | "approved" | "rejected";
export type PaymentOrderPurpose = "team_registration" | "event_publication";
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
  football_mode?: FootballMode;
  football_category?: FootballCategory;
  max_teams?: number;
};

export type FootballPlayer = {
  full_name: string;
  identity_number: string;
  birth_date: string;
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
  team_registrations: TeamRegistration[];
  payment_orders: PaymentOrder[];
};

export type PaymentEvidence = {
  reference: string;
  paid_at?: string;
  notes?: string;
  attachment_url?: string;
  reported_email?: string;
};

export type PaymentOrder = {
  id: string;
  code: string;
  purpose: PaymentOrderPurpose;
  status: PaymentOrderStatus;
  amount: number;
  created_by: string;
  event_id?: string;
  team_registration_id?: string;
  instructions_account: string;
  instructions_holder: string;
  instructions_bank: string;
  evidence?: PaymentEvidence;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
};

export type TeamRegistration = {
  id: string;
  event_id: string;
  event_title: string;
  captain_user_id: string;
  captain_name: string;
  team_name: string;
  football_category: FootballCategory;
  players: FootballPlayer[];
  status: TeamRegistrationStatus;
  payment_order_id: string;
  review_notes?: string;
  created_at: string;
};
