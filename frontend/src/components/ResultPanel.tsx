import React, { useState, useEffect } from 'react';
import type { ExecutionResult } from '../types';
import { Copy, Check, Download, AlertCircle, Clock, List, ChevronLeft, ChevronRight } from 'lucide-react';

interface ResultPanelProps {
  sql: string;
  result: ExecutionResult | null;
  loading: boolean;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ sql, result, loading }) => {
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1); // Reset page on new result loading
  }, [result]);

  const handleCopy = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    if (!result || result.rows.length === 0) return;
    
    const headers = result.columns.join(',');
    const rows = result.rows.map(row => 
      result.columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const strVal = String(val);
        // Escape quotes
        return strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')
          ? `"${strVal.replace(/"/g, '""')}"`
          : strVal;
      }).join(',')
    );
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `query_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple SQL highlighting utility
  const highlightSQL = (code: string) => {
    if (!code) return '';
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Keywords
    const keywords = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP\s+BY|ORDER\s+BY|LIMIT|OFFSET|AND|OR|IN|NOT|AS|WITH|UNION|HAVING|EXPLAIN|SHOW)\b/gi;
    escaped = escaped.replace(keywords, '<span class="sql-keyword">$1</span>');

    // Values / strings
    escaped = escaped.replace(/('(.*?)')/g, '<span class="sql-string">$1</span>');

    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');

    // Functions
    const funcs = /\b(count|sum|avg|min|max|coalesce|now|date_trunc|concat)\b/gi;
    escaped = escaped.replace(funcs, '<span class="sql-function">$1</span>');

    return escaped;
  };

  // Pagination bounds
  const totalRows = result?.rows.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = result?.rows.slice(indexOfFirstRow, indexOfLastRow) || [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-1">
      {/* Generated SQL Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Generated SQL Statement
          </span>
          {sql && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy SQL
                </>
              )}
            </button>
          )}
        </div>
        <div className="overflow-x-auto bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-200 min-h-[70px]">
          {sql ? (
            <pre className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }} />
          ) : (
            <span className="italic text-slate-500">Ask a question to see the SQL output here...</span>
          )}
        </div>
      </div>

      {/* Query Stats Banner */}
      {result && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Execution time: <strong className="text-slate-700 dark:text-slate-200">{result.execution_time_ms} ms</strong>
          </span>
          <span className="flex items-center gap-1">
            <List className="h-3.5 w-3.5" />
            Total matching records: <strong className="text-slate-700 dark:text-slate-200">{result.row_count}</strong>
          </span>
        </div>
      )}

      {/* Query Result Workspace */}
      <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 animate-pulse">
              Running SQL statement on PostgreSQL...
            </p>
          </div>
        ) : result ? (
          result.success ? (
            result.rows.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-8 w-8 text-slate-350 dark:text-slate-650" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-350">
                  Empty Result Set
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The query compiled and ran successfully but returned 0 rows.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Actions Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Results Table
                  </span>
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download CSV
                  </button>
                </div>

                {/* Table Viewport */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(51,65,85,1)]">
                      <tr>
                        {result.columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-850"
                            style={{ minWidth: '100px' }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentRows.map((row, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          {result.columns.map((col) => (
                            <td
                              key={col}
                              className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300"
                            >
                              {row[col] === null ? (
                                <span className="italic text-slate-400">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Showing {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, totalRows)} of {totalRows} records
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-650 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-semibold px-2 dark:text-slate-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-650 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-rose-50/10">
              <AlertCircle className="h-10 w-10 text-rose-500 dark:text-rose-400 animate-bounce" />
              <h3 className="mt-3 text-sm font-bold text-slate-805 dark:text-slate-100">
                SQL Execution Error
              </h3>
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-450 max-w-lg font-mono whitespace-pre-wrap text-left bg-rose-50 dark:bg-rose-950/20 p-4 border border-rose-100 dark:border-rose-950/50 rounded-xl leading-relaxed">
                {result.error?.message}
              </p>
              <div className="mt-3 text-[10px] text-slate-400 font-semibold uppercase">
                Type: {result.error?.type}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-600">
            <p className="text-sm italic">Execute a compiled SQL statement to view results table...</p>
          </div>
        )}
      </div>
    </div>
  );
};
