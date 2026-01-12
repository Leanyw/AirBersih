export interface Report {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userRT?: string;
  userRW?: string;
  location: string;
  coordinates?: string;
  distance?: string;
  description: string;
  photoUrl?: string;
  additionalPhotos?: string[];
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  waterQuality?: {
    smell: string;
    taste: string;
    color: string;
    temperature: number;
  };
  labResults?: WaterTest;
}

export interface WaterTest {
  bacteriaCount: number;
  phLevel: number;
  turbidity: number;
  chlorine: number;
  heavyMetals: boolean;
  eColiPresent: boolean;
  totalDissolvedSolids: number;
  safetyLevel: 'safe' | 'warning' | 'danger';
  technicianNotes?: string;
}

export interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  processingReports: number;
  completedReports: number;
  averageResponseTime: number;
  waterSources: number;
  activeUsers: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'broadcast' | 'individual' | 'emergency' | 'info';
  status: 'sent' | 'failed' | 'pending';
  recipients: number;
  sentAt: string;
}

export interface WaterSource {
  id: string;
  name: string;
  location: string;
  type: string;
  status: 'safe' | 'warning' | 'danger';
  capacity: string;
  users: number;
  lastChecked: string;
  notes?: string;
}