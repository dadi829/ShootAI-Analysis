export interface ShootingData {
  serialNumber: number;
  direction: string;
  score: number;
  totalScore: number;
  time: number;
  interval: number;
}

export interface AnalysisResult {
  rawData: ShootingData[];
  statistics: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    totalScore: number;
    totalShots: number;
    averageInterval: number;
  };
  trend: {
    isImproving: boolean;
    description: string;
  };
  aiSuggestions: string[];
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  analysisResult: AnalysisResult;
  imageUrl?: string;
  notes?: string;
  trainingType?: string;
  environment?: string;
  tags?: string[];
}

export interface HistoryFilter {
  dateRange?: {
    start: number;
    end: number;
  };
  trainingType?: string;
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  keyword?: string;
}
