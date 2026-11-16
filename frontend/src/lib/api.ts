import { Incident, TrainingUnit, TranscriptMessage, Workspace, ToolResult } from '../types';

const API_BASE = '/api';

function getHeaders(role: 'caller' | 'operator' = 'caller'): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const opToken = localStorage.getItem('responseos_operator_token');
  const callerToken = localStorage.getItem('responseos_caller_token');

  if (role === 'operator' && opToken) {
    headers['X-Operator-Token'] = opToken;
  } else if (callerToken) {
    headers['X-Workspace-Token'] = callerToken;
  } else if (opToken) {
    headers['X-Operator-Token'] = opToken;
  }

  return headers;
}

export async function createWorkspace(name?: string): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name || 'Simulation Workspace' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create workspace' }));
    throw new Error(err.detail || 'Failed to create workspace');
  }

  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('responseos_caller_token', data.access_token);
  }
  if (data.operator_token) {
    localStorage.setItem('responseos_operator_token', data.operator_token);
  }

  return {
    id: data.id,
    name: data.name,
    accessToken: data.access_token,
    operatorToken: data.operator_token,
    expiresAt: data.expires_at,
    isActive: true,
  };
}

export async function getCurrentWorkspace(role: 'caller' | 'operator' = 'caller'): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/current`, {
    headers: getHeaders(role),
  });

  if (!res.ok) {
    throw new Error('Workspace not found or unauthorized');
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    expiresAt: data.expires_at,
    isActive: data.is_active,
  };
}

export async function transcribeAudio(audioBlob: Blob): Promise<{
  text: string;
  duration_ms?: number;
  latency_ms: number;
  provider: string;
  model: string;
}> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');

  const headers: Record<string, string> = {};
  const callerToken = localStorage.getItem('responseos_caller_token');
  const opToken = localStorage.getItem('responseos_operator_token');
  if (callerToken) {
    headers['X-Workspace-Token'] = callerToken;
  } else if (opToken) {
    headers['X-Operator-Token'] = opToken;
  }

  const res = await fetch(`${API_BASE}/voice/transcribe`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
    throw new Error(err.detail || 'Transcription failed');
  }

  return res.json();
}

export interface ConversationTurnResponse {
  text: string;
  incident_id?: string;
  incident_updates?: Record<string, any>;
  tool_results?: ToolResult[];
  inference_latency_ms?: number;
  model_used?: string;
  is_real_emergency_interrupt?: boolean;
  synthesis?: {
    audio_base64: string | null;
    content_type: string;
    latency_ms: number;
    provider: string;
    use_browser_fallback: boolean;
    fallback_reason: string | null;
  };
}

export async function sendConversationTurn(
  text: string,
  incidentId?: string,
  audioDurationMs?: number,
  transcriptionLatencyMs?: number
): Promise<ConversationTurnResponse> {
  const res = await fetch(`${API_BASE}/voice/conversation`, {
    method: 'POST',
    headers: getHeaders('caller'),
    body: JSON.stringify({
      text,
      incident_id: incidentId || null,
      audio_duration_ms: audioDurationMs || null,
      transcription_latency_ms: transcriptionLatencyMs || null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Conversation failed' }));
    throw new Error(err.detail || 'Conversation failed');
  }

  return res.json();
}

export async function getIncidents(
  statusFilter?: string,
  role: 'caller' | 'operator' = 'caller'
): Promise<Incident[]> {
  const url = statusFilter
    ? `${API_BASE}/incidents?status=${encodeURIComponent(statusFilter)}`
    : `${API_BASE}/incidents`;

  const res = await fetch(url, {
    headers: getHeaders(role),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch incidents');
  }

  return res.json();
}

export async function getIncidentDetail(
  incidentId: string,
  role: 'caller' | 'operator' = 'caller'
): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}`, {
    headers: getHeaders(role),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch incident details');
  }

  return res.json();
}

export async function getTranscript(
  incidentId: string,
  role: 'caller' | 'operator' = 'caller'
): Promise<TranscriptMessage[]> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/transcript`, {
    headers: getHeaders(role),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch incident transcript');
  }

  return res.json();
}

export async function getTrainingUnits(role: 'caller' | 'operator' = 'caller'): Promise<TrainingUnit[]> {
  const res = await fetch(`${API_BASE}/units`, {
    headers: getHeaders(role),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch training units');
  }

  return res.json();
}

export async function assignTrainingUnit(unitId: string, incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/units/${unitId}/assign`, {
    method: 'POST',
    headers: getHeaders('operator'),
    body: JSON.stringify({ incident_id: incidentId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to assign unit' }));
    throw new Error(err.detail || 'Failed to assign unit');
  }

  return res.json();
}

export async function releaseTrainingUnit(unitId: string, incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/units/${unitId}/release`, {
    method: 'POST',
    headers: getHeaders('operator'),
    body: JSON.stringify({ incident_id: incidentId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to release unit' }));
    throw new Error(err.detail || 'Failed to release unit');
  }

  return res.json();
}

export async function submitOperatorReview(
  incidentId: string,
  fieldName: string,
  reviewType: 'CONFIRMED' | 'CORRECTED' | 'FLAGGED',
  correctedValue?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/review`, {
    method: 'POST',
    headers: getHeaders('operator'),
    body: JSON.stringify({
      field_name: fieldName,
      review_type: reviewType,
      corrected_value: correctedValue || null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit review' }));
    throw new Error(err.detail || 'Failed to submit review');
  }

  return res.json();
}

export async function addOperatorNote(incidentId: string, content: string): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/notes`, {
    method: 'POST',
    headers: getHeaders('operator'),
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add operator note' }));
    throw new Error(err.detail || 'Failed to add operator note');
  }

  return res.json();
}

export async function updateIncidentStatus(incidentId: string, status: string): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/status`, {
    method: 'POST',
    headers: getHeaders('operator'),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update incident status' }));
    throw new Error(err.detail || 'Failed to update incident status');
  }

  return res.json();
}

export async function closeIncident(incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/close`, {
    method: 'POST',
    headers: getHeaders('operator'),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to close incident' }));
    throw new Error(err.detail || 'Failed to close incident');
  }

  return res.json();
}

export async function fetchIncidentReport(
  incidentId: string,
  format: 'markdown' | 'json' = 'markdown'
): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/report?format=${format}`, {
    headers: getHeaders('operator'),
  });

  if (!res.ok) {
    throw new Error('Failed to generate incident report');
  }

  if (format === 'json') {
    return res.json();
  }
  return res.text();
}
