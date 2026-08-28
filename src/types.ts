export interface Student {
  id?: string;
  name: string;
  initials: string;
  role: string;
  funFact: string;
  birthday: string;
  color: string;
  imageUrl?: string;
  instagram?: string;
  tiktok?: string;
  quote?: string;
  favSubject?: string;
  song?: {
    title: string;
    artist: string;
    coverUrl: string;
  };
}

export interface TimetableEntry {
  id?: string;
  period: string;
  time: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
}

export interface GalleryImage {
  id?: string;
  url: string;
  caption: string;
  reactions?: Record<string, number>;
  createdAt: number;
  likes?: string[];
  comments?: {
    id: string;
    nickname: string;
    text: string;
    createdAt: number;
  }[];
}

export interface CapsuleMessage {
  id?: string;
  nickname: string;
  content: string;
  unlockDate: number;
  createdAt: number;
}

export interface Message {
  id?: string;
  nickname: string;
  content: string;
  color: string;
  to?: string;
  song?: {
    title: string;
    artist: string;
    coverUrl: string;
  };
  createdAt: number;
  isEdited?: boolean;
  editReason?: string;
}

export interface Poll {
  id?: string;
  question: string;
  options: { text: string; votes: number }[];
  createdAt: number;
}
