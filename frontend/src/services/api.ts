import type { AppSettings, ExecutionResult, SchemaMetadata } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface HealthStatus {
  status: string;
  database_connected: boolean;
  ollama_online: boolean;
  settings: AppSettings;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error('Failed to retrieve server health state.');
  return res.json();
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE_URL}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings from backend.');
  return res.json();
}

export async function updateSettings(settings: AppSettings): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.detail || 'Failed to update backend configurations.');
  }
  return res.json();
}

export async function fetchSchema(): Promise<SchemaMetadata> {
  const res = await fetch(`${API_BASE_URL}/schema`);
  if (!res.ok) throw new Error('Failed to load database schema from backend.');
  return res.json();
}

export async function executeSql(sql: string): Promise<ExecutionResult> {
  const res = await fetch(`${API_BASE_URL}/execute-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) throw new Error('Failed to execute SQL query.');
  return res.json();
}

export interface StreamEvent {
  event: string;
  selected_tables?: string[];
  text?: string;
  sql?: string;
  message?: string;
  result?: ExecutionResult;
}

export async function streamChat(
  message: string,
  onEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Chat connection error.');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Readable stream response is not supported by target browser.');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep trailing incomplete line in buffer

      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.startsWith('data: ')) {
          try {
            const rawJson = cleaned.slice(6);
            const parsed: StreamEvent = JSON.parse(rawJson);
            onEvent(parsed);
          } catch (e) {
            console.error('Failed to parse stream event line:', cleaned, e);
          }
        }
      }
    }
  } catch (err: any) {
    onError(err);
  }
}
