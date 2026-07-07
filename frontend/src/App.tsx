import React, { useState, useEffect, useRef } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { Sidebar } from './components/Sidebar';
import { ResultPanel } from './components/ResultPanel';
import { SettingsModal } from './components/SettingsModal';
import type { QueryHistoryItem, ExecutionResult } from './types';
import { executeSql, streamChat } from './services/api';
import type { StreamEvent } from './services/api';
import { 
  Play, Sparkles, Database, AlertCircle, Info, CheckCircle2,
  Layers, Keyboard
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { dbConnected, ollamaOnline, refreshSchema, triggerHealthCheck } = useSettings();
  
  // App States
  const [prompt, setPrompt] = useState('');
  const [sql, setSql] = useState('');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  // UI states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('query_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: QueryHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('query_history', JSON.stringify(newHistory));
  };

  // Toast trigger
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter: Generate SQL
      if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerateSQL();
      }
      // Ctrl + Shift + Enter: Execute SQL
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteSQL();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, sql]);

  const handleGenerateSQL = async () => {
    if (!prompt.trim()) {
      showToast('Please type a natural language prompt first.', 'info');
      return;
    }
    
    setGenerating(true);
    setSql('');
    setSelectedTables([]);
    setExecutionResult(null);

    let finalSql = '';

    await streamChat(
      prompt,
      (event: StreamEvent) => {
        if (event.event === 'metadata' && event.selected_tables) {
          setSelectedTables(event.selected_tables);
        } else if (event.event === 'sql_chunk' && event.text) {
          finalSql += event.text;
          setSql(finalSql);
        } else if (event.event === 'sql_done' && event.sql) {
          setSql(event.sql);
          finalSql = event.sql;
        } else if (event.event === 'execution_result' && event.result) {
          setExecutionResult(event.result);
          
          // Only append to history on full end-to-end success
          if (event.result.success) {
            const newItem: QueryHistoryItem = {
              id: Math.random().toString(36).substring(2, 9),
              prompt: prompt.trim(),
              sql: finalSql,
              timestamp: new Date().toISOString(),
              isFavorite: false,
            };
            saveHistory([newItem, ...history]);
            showToast('SQL generated and executed successfully!', 'success');
          } else {
            showToast('SQL generated but execution failed.', 'error');
          }
          setGenerating(false);
        } else if (event.event === 'validation_error' && event.message) {
          setGenerating(false);
          showToast(`SQL Safety validation failed: ${event.message}`, 'error');
          setExecutionResult({
            success: false,
            columns: [],
            rows: [],
            row_count: 0,
            execution_time_ms: 0,
            error: { type: 'ValidationError', message: event.message }
          });
        } else if (event.event === 'error' && event.message) {
          setGenerating(false);
          showToast(`Error: ${event.message}`, 'error');
        }
      },
      (err: Error) => {
        setGenerating(false);
        showToast(err.message || 'Stream processing failed.', 'error');
      }
    );
  };

  const handleExecuteSQL = async () => {
    if (!sql.trim()) {
      showToast('No SQL statement available to execute.', 'info');
      return;
    }

    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await executeSql(sql);
      setExecutionResult(res);
      if (res.success) {
        showToast(`SQL run successfully. ${res.row_count} rows.`, 'success');
      } else {
        showToast('SQL statement execution failed.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Execution connection error.', 'error');
      setExecutionResult({
        success: false,
        columns: [],
        rows: [],
        row_count: 0,
        execution_time_ms: 0,
        error: { type: 'ConnectionError', message: e.message || 'Failed connecting to database API.' }
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleClear = () => {
    setPrompt('');
    setSql('');
    setExecutionResult(null);
    setSelectedTables([]);
    showToast('Workspace cleared.', 'info');
  };

  const handleSelectQuery = (selectedPrompt: string, selectedSql?: string) => {
    setPrompt(selectedPrompt);
    if (selectedSql) {
      setSql(selectedSql);
      setExecutionResult(null);
      setSelectedTables([]);
    }
    showToast('Loaded query from history.', 'success');
  };

  const handleToggleFavorite = (id: string) => {
    const updated = history.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveHistory(updated);
    const item = updated.find(i => i.id === id);
    showToast(item?.isFavorite ? 'Bookmark added' : 'Bookmark removed', 'success');
  };

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
    showToast('History item deleted', 'info');
  };

  const loadExample = (ex: string) => {
    setPrompt(ex);
    if (promptRef.current) {
      promptRef.current.focus();
    }
  };

  const examplePrompts = [
    'Show all students from CSE.',
    'Find employees earning more than 50000.',
    'List all courses offered by Computer Science department.',
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar Area */}
      <Sidebar 
        history={history}
        onSelectQuery={handleSelectQuery}
        onToggleFavorite={handleToggleFavorite}
        onDeleteHistory={handleDeleteHistory}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Status:</span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <span className={`h-2 w-2 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                PostgreSQL {dbConnected ? 'Ready' : 'Offline'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <span className={`h-2 w-2 rounded-full ${ollamaOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                Ollama {ollamaOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              <Keyboard className="h-3.5 w-3.5" />
              Ctrl+Enter to Run
            </span>
            <button
              onClick={() => {
                triggerHealthCheck();
                refreshSchema();
                showToast('Verifying engine statuses...', 'info');
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              Sync Services
            </button>
          </div>
        </header>

        {/* Dashboard Panels */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full max-h-[calc(100vh-6rem)]">
            
            {/* Left Panel: Inputs and LLM controls */}
            <div className="flex flex-col gap-4 overflow-hidden">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-md font-bold text-slate-805 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-500" /> Natural Language Prompt
                  </h2>
                  {prompt && (
                    <button
                      onClick={handleClear}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-650 dark:hover:text-slate-350"
                    >
                      Clear Workspace
                    </button>
                  )}
                </div>

                {/* Prompt Box Input */}
                <div className="relative">
                  <textarea
                    ref={promptRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    placeholder="Ask a question about your PostgreSQL database in plain English (e.g. 'Show all students from CSE with a GPA above 3.5')..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-4 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
                  />
                  <span className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-semibold">
                    Ctrl + Enter
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateSQL}
                      disabled={generating || !prompt.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition shadow-md shadow-indigo-500/10"
                    >
                      <Sparkles className="h-4 w-4" />
                      {generating ? 'Translating...' : 'Generate & Run'}
                    </button>
                    <button
                      onClick={handleExecuteSQL}
                      disabled={executing || !sql.trim() || generating}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 dark:border-indigo-950/30 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition"
                    >
                      <Play className="h-4 w-4" />
                      {executing ? 'Executing...' : 'Run SQL'}
                    </button>
                  </div>
                </div>

                {/* Quick Examples */}
                <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Try these Example Queries
                  </span>
                  <div className="flex flex-col gap-2">
                    {examplePrompts.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => loadExample(ex)}
                        className="text-left text-xs text-slate-650 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 px-3 py-2 rounded-xl transition dark:text-slate-350 dark:border-slate-850 dark:hover:bg-slate-800/30"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Relevance selection logs card */}
              {selectedTables.length > 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/15 p-4 dark:border-indigo-950/20 dark:bg-indigo-950/5 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Dynamic Schema Filter Logs
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Query context pruned to include only relevant tables:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTables.map((tbl) => (
                      <span
                        key={tbl}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-indigo-300"
                      >
                        <Database className="h-3 w-3 text-slate-400" />
                        {tbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Code output and result grid */}
            <div className="overflow-hidden">
              <ResultPanel sql={sql} result={executionResult} loading={generating || executing} />
            </div>
            
          </div>
        </main>
      </div>

      {/* Floating Settings Configuration Dialog */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-2xl dark:bg-slate-850 animate-fade-in border border-slate-850 dark:border-slate-750">
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="h-4 w-4 text-indigo-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <MainApp />
    </SettingsProvider>
  );
}
