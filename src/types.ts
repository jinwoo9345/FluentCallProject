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
  hidden?: boolean;             // 공개 목록 숨김 여부 (관리자 전용)
  enrollDisabled?: boolean;     // 등록하기 버튼 비활성화 (소개는 노출하되 등록 차단)
  disabledMessage?: string;     // 비활성화 시 버튼 자리에 표시할 안내 문구 (예: "현재 대기 중")
}

/** 전역 앱 설정 (app_settings/main) */
export interface AppSettings {
  kakaoChannelUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  updatedAt?: any;
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
  name: string;          // 표시용 이름 (닉네임이 설정되어 있으면 닉네임, 아니면 실명)
  realName?: string;     // 실제 이름 (마이페이지에서만 노출)
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
  // 강사 신청 상태 (student 상태에서 강사 신청을 넣은 경우)
  tutorApplicationStatus?: 'pending' | 'approved' | 'rejected';
  tutorApplicationId?: string;
}

export interface TutorApplication {
  id?: string;
  userId: string;
  name: string;           // 실명
  email: string;
  contactValue: string;   // 연락처
  experience: string;     // 영어 교육/체류 경험
  qualifications: string; // 자격증·학력
  introduction: string;   // 자기 소개
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt?: any;
  reviewedAt?: any;
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
