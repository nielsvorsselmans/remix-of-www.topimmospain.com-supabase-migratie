export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  show_on_about_page: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface Advocaat {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  active: boolean | null;
  user_id: string | null;
  created_at?: string | null;
}
