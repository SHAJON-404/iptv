export interface GoalScorer {
  name: string;
  minute: string;
  penalty?: boolean;
  owngoal?: boolean;
}

export interface MatchScore {
  ft: [number, number];
  ht: [number, number];
  et?: [number, number];
  p?: [number, number];
}

export interface Match {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  score?: MatchScore;
  goals1?: GoalScorer[];
  goals2?: GoalScorer[];
  group?: string;
  ground: string;
  originalDate?: string;
  originalTime?: string;
  formattedDateTime?: string;
  timestamp?: number;
}

export interface WorldCupData {
  name: string;
  matches: Match[];
}

export interface TeamStats {
  team: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  played: number;
}
