export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface TimelineEvent {
  status: 'Reported' | 'Verified' | 'In Progress' | 'Resolved';
  timestamp: string;
  note: string;
}

export interface Report {
  id: string;
  creator?: string;
  title: string;
  description: string;
  category: 'Pothole' | 'Water Leakage' | 'Damaged Streetlight' | 'Waste Management' | 'Public Transport/Transit Gap' | 'Other' | string;
  severity: number;
  justification: string;
  status: 'Reported' | 'Verified' | 'In Progress' | 'Resolved';
  latitude: number;
  longitude: number;
  createdAt: string;
  upvotes: number;
  verifiedBy: string[];
  imageUrl: string;
  isValid: boolean;
  isDuplicate: boolean;
  linkedTicketId: string | null;
  comments: Comment[];
  timeline: TimelineEvent[];
}

export interface DashboardInsights {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  avgSeverity: number;
  resolvedCount: number;
  hotspots: Array<{
    lat: number;
    lng: number;
    severity: number;
    title: string;
  }>;
}

export interface LeaderboardUser {
  name: string;
  points: number;
  reportsCount: number;
  verificationsCount: number;
  badge: string;
}
