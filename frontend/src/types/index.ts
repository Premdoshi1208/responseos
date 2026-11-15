export type IncidentStatus = 
  | 'NEW'
  | 'INFORMATION_COLLECTION'
  | 'AWAITING_OPERATOR_REVIEW'
  | 'REVIEWED'
  | 'TRAINING_UNIT_ASSIGNED'
  | 'CLOSED';

export type MessageRole = 'CALLER' | 'AI' | 'SYSTEM';

export type VoiceState = 
  | 'READY'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'ENDED';

export interface Workspace {
  id: string;
  name: string;
  role?: 'caller' | 'operator';
  accessToken?: string;
  operatorToken?: string;
  expiresAt?: string;
  isActive?: boolean;
}

export interface ExtractedField {
  id: string;
  name: string;
  value: string;
  confidence: 'CONFIRMED' | 'REPORTED' | 'UNCONFIRMED' | 'UNKNOWN';
  source_message_id?: string | null;
  previous_value?: string | null;
}

export interface OperatorNote {
  id: string;
  content: string;
  created_at: string;
}

export interface OperatorReview {
  id: string;
  field_name: string;
  review_type: 'CONFIRMED' | 'CORRECTED' | 'FLAGGED';
  original_value?: string | null;
  corrected_value?: string | null;
  created_at: string;
}

export interface UnitAssignment {
  assignment_id: string;
  unit_id: string;
  unit_name: string;
  unit_type: 'AMBULANCE' | 'FIRE' | 'GENERAL';
  assigned_at: string;
  released_at?: string | null;
  is_active: boolean;
}

export interface Incident {
  id: string;
  status: IncidentStatus;
  category: string | null;
  reported_location: string | null;
  location_confirmed: boolean;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  reported_hazards: string | null;
  reported_injuries: string | null;
  people_affected: number | null;
  missing_information?: string[];
  summary: string | null;
  operator_review_status?: string | null;
  created_at: string;
  updated_at?: string;
  extracted_fields?: ExtractedField[];
  notes?: OperatorNote[];
  reviews?: OperatorReview[];
  assignments?: UnitAssignment[];
}

export interface TranscriptMessage {
  id: string;
  role: MessageRole;
  content: string;
  audio_duration_ms?: number | null;
  transcription_latency_ms?: number | null;
  inference_latency_ms?: number | null;
  tts_provider?: string | null;
  created_at: string;
}

export interface TrainingUnit {
  id: string;
  unit_name: string;
  unit_type: 'AMBULANCE' | 'FIRE' | 'GENERAL';
  is_available: boolean;
  latitude: number;
  longitude: number;
  active_incident_id?: string | null;
}

export interface ToolResult {
  tool_name: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  status: string;
  execution_ms: number;
}

export interface TrainingScenario {
  id: string;
  title: string;
  category: string;
  landmark: string;
  suggestedPrompt: string;
  brief: string;
  icon: string;
}
