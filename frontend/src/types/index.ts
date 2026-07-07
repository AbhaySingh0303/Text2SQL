export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

export interface ForeignKeyMetadata {
  constrained_columns: string[];
  referred_table: string;
  referred_columns: string[];
}

export interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  primary_keys: string[];
  foreign_keys: ForeignKeyMetadata[];
}

export interface SchemaRelationship {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
}

export interface SchemaMetadata {
  tables: Record<string, TableMetadata>;
  relationships: SchemaRelationship[];
}

export interface AppSettings {
  database_url: string;
  ollama_url: string;
  ollama_model: string;
  ollama_temperature: number;
}

export interface ExecutionError {
  type: string;
  message: string;
}

export interface ExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
  execution_time_ms: number;
  error?: ExecutionError | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  selectedTables?: string[];
  sql?: string;
  executionResult?: ExecutionResult;
  status: 'loading' | 'streaming' | 'success' | 'error';
  error?: string;
}

export interface QueryHistoryItem {
  id: string;
  prompt: string;
  sql: string;
  timestamp: string;
  isFavorite: boolean;
}
