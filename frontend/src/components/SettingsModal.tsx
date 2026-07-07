import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { X, CheckCircle2, AlertTriangle, RefreshCw, Sliders, Database, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateAppSettings,
    dbConnected,
    ollamaOnline,
    triggerHealthCheck,
    isLoading: contextLoading,
  } = useSettings();

  const [dbUrl, setDbUrl] = useState(settings.database_url);
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollama_url);
  const [modelName, setModelName] = useState(settings.ollama_model);
  const [temp, setTemp] = useState(settings.ollama_temperature);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Sync state with settings changes in context (e.g. if loaded asynchronously on startup)
  useEffect(() => {
    setDbUrl(settings.database_url);
    setOllamaUrl(settings.ollama_url);
    setModelName(settings.ollama_model);
    setTemp(settings.ollama_temperature);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setTesting(true);
    try {
      await updateAppSettings({
        database_url: dbUrl,
        ollama_url: ollamaUrl,
        ollama_model: modelName,
        ollama_temperature: temp,
      });
      setSuccessMsg('Configurations applied and saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings. Verify connection settings.');
    } finally {
      setTesting(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await triggerHealthCheck();
      setSuccessMsg('Connection check completed.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setErrorMsg('Failed testing service statuses.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Engine Configurations</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Indicators */}
        <div className="my-4 grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">PostgreSQL</span>
            </div>
            {dbConnected ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> Disconnected
              </span>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Ollama API</span>
            </div>
            {ollamaOnline ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> Offline
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Database Connection URL
            </label>
            <input
              type="text"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
              placeholder="postgresql://user:pass@host:5432/dbname"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ollama Server URL
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
              placeholder="http://localhost:11434"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Model Name
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
                placeholder="qwen2.5:1.5b"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Temperature ({temp.toFixed(1)})
              </label>
              <div className="flex h-10 items-center px-1">
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-800 dark:accent-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || contextLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
            <button
              type="submit"
              disabled={testing || contextLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
