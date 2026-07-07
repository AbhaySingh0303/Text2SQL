import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { QueryHistoryItem } from '../types';
import { 
  Database, History, Star, Trash2, Settings, 
  ChevronRight, ChevronDown, Key, ArrowRight, Sun, Moon, HelpCircle
} from 'lucide-react';

interface SidebarProps {
  history: QueryHistoryItem[];
  onSelectQuery: (prompt: string, sql?: string) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  history,
  onSelectQuery,
  onToggleFavorite,
  onDeleteHistory,
  onOpenSettings,
}) => {
  const { schema, isDarkMode, toggleDarkMode, dbConnected } = useSettings();
  const [activeTab, setActiveTab] = useState<'schema' | 'history'>('schema');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const favoriteQueries = history.filter(item => item.isFavorite);
  const recentQueries = history.filter(item => !item.isFavorite);

  return (
    <aside className="flex h-full w-80 flex-col border-r border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90 glass-effect">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500 shadow-md shadow-indigo-500/20">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Text2SQL Engine
          </span>
        </div>
        <button
          onClick={toggleDarkMode}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-100 p-2 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
            activeTab === 'schema'
              ? 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
              : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'
          }`}
        >
          <Database className="h-4 w-4" />
          Schema
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
              : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'
          }`}
        >
          <History className="h-4 w-4" />
          History
          {history.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'schema' ? (
          <div className="space-y-2">
            {!dbConnected ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 animate-pulse" />
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Database disconnected
                </p>
                <button
                  onClick={onOpenSettings}
                  className="mt-4 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Configure Connection
                </button>
              </div>
            ) : !schema || Object.keys(schema.tables).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No tables found in public schema. Seeding metadata...
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Database Tables ({Object.keys(schema.tables).length})
                </h3>
                {Object.values(schema.tables).map((table) => {
                  const isExpanded = expandedTables[table.name];
                  return (
                    <div
                      key={table.name}
                      className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40 dark:border-slate-800/40 dark:bg-slate-900/30"
                    >
                      <button
                        onClick={() => toggleTable(table.name)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {table.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          {table.columns.length} col
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-white/50 px-3 py-2 dark:border-slate-850 dark:bg-slate-950/20">
                          <div className="space-y-1.5">
                            {table.columns.map((col) => {
                              const isPk = table.primary_keys.includes(col.name);
                              const isFk = table.foreign_keys.some(fk => 
                                fk.constrained_columns.includes(col.name)
                              );
                              return (
                                <div key={col.name} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1">
                                    {isPk && <span title="Primary Key"><Key className="h-3 w-3 text-amber-500" /></span>}
                                    {isFk && <span title="Foreign Key"><ArrowRight className="h-3 w-3 text-indigo-400" /></span>}
                                    <span className={`font-mono ${isPk ? 'font-bold text-slate-850 dark:text-slate-100' : 'text-slate-650 dark:text-slate-350'}`}>
                                      {col.name}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {col.type.toLowerCase().split('(')[0]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Favorites Section */}
            {favoriteQueries.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="flex items-center gap-1 px-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-500" /> Bookmarks
                </h4>
                {favoriteQueries.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col gap-1 rounded-xl border border-amber-100 bg-amber-50/20 p-2.5 transition hover:border-amber-200 dark:border-amber-950/20 dark:bg-amber-950/5"
                  >
                    <button
                      onClick={() => onSelectQuery(item.prompt, item.sql)}
                      className="text-left text-xs font-semibold text-slate-700 hover:text-indigo-650 dark:text-slate-300 dark:hover:text-indigo-400"
                    >
                      {item.prompt}
                    </button>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onToggleFavorite(item.id)}
                          className="text-amber-500 hover:text-slate-400"
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-500" />
                        </button>
                        <button
                          onClick={() => onDeleteHistory(item.id)}
                          className="text-rose-500 hover:text-rose-650"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recents Section */}
            <div className="space-y-1.5">
              <h4 className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recent Queries
              </h4>
              {recentQueries.length === 0 ? (
                <p className="px-2 text-center text-xs text-slate-400 py-6">
                  No recent searches
                </p>
              ) : (
                recentQueries.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/20 p-2.5 transition hover:border-slate-200 dark:border-slate-800/40 dark:bg-slate-900/20"
                  >
                    <button
                      onClick={() => onSelectQuery(item.prompt, item.sql)}
                      className="text-left text-xs font-semibold text-slate-700 hover:text-indigo-650 dark:text-slate-300 dark:hover:text-indigo-400"
                    >
                      {item.prompt}
                    </button>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onToggleFavorite(item.id)}
                          className="text-slate-400 hover:text-amber-500"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteHistory(item.id)}
                          className="text-rose-500 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-150 dark:text-slate-300 dark:hover:bg-slate-800 transition"
        >
          <Settings className="h-4.5 w-4.5" />
          Connection Settings
        </button>
      </div>
    </aside>
  );
};
