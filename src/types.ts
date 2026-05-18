export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  updatedAt: any;
  createdAt: any;
}

export interface Message {
  id?: string;
  sessionId: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  createdAt: any;
}

export interface UserKnowledge {
  id: string;
  userId: string;
  fileName: string;
  content: string;
  createdAt: any;
}
