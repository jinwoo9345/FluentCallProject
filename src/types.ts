export interface Tutor {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  bio: string;
  hourlyRate: number;
  availability: string[]; // e.g., ["Mon 10:00", "Tue 14:00"]
  languages: string[];
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

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  credits: number;
  role: 'student' | 'tutor';
}
