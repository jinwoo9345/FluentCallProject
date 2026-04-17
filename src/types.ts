export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Tutor {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  bio: string;
  longBio?: string;
  reviews?: Review[];
  hourlyRate: number;
  availability: string[]; // e.g., ["Mon 10:00", "Tue 14:00"]
  languages: string[];
  tier?: string;
  location?: string;
}

export interface Session {
  id: string;
  tutorId: string;
  userId: string;
  startTime: Date;
  duration: number; // minutes
  status: 'upcoming' | 'completed' | 'cancelled';
  meetingLink?: string;
}

export type UserRole = 'student' | 'tutor' | 'admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  credits: number;
  role: UserRole;
  referralCode?: string;
  referredBy?: string;
  discountBalance?: number;
  wishlist?: string[];
  hasCompletedConsultation?: boolean;
  studentAvailability?: string[];
  availability?: string[];
  createdAt?: any;
}

export interface Consultation {
  id?: string;
  name: string;
  contactType: 'kakao' | 'discord' | 'phone';
  contactValue: string;
  availableTime: string;
  motivation: string;
  notes?: string;
  userId?: string | null;
  status?: 'pending' | 'completed';
  createdAt?: any;
}
