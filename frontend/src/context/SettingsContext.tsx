import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppSettings, SchemaMetadata } from '../types';
import { fetchHealth, updateSettings, fetchSchema } from '../services/api';

interface SettingsContextType {
  settings: AppSettings;
  isDarkMode: boolean;
  dbConnected: boolean;
  ollamaOnline: boolean;
  isLoading: boolean;
  schema: SchemaMetadata | null;
  toggleDarkMode: () => void;
  updateAppSettings: (newSettings: AppSettings) => Promise<void>;
  refreshSchema: () => Promise<void>;
  triggerHealthCheck: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    database_url: 'postgresql://postgres:postgres@localhost:5432/postgres',
    ollama_url: 'http://localhost:11434',
    ollama_model: 'qwen2.5:1.5b',
    ollama_temperature: 0.0,
  });

  // Default to Dark Mode for premium aesthetics
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schema, setSchema] = useState<SchemaMetadata | null>(null);

  // Initialize Dark Mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    
    // Default to dark mode if no setting is saved yet, or if it is saved as dark
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : true;
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      if (next) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
      return next;
    });
  };

  const triggerHealthCheck = async () => {
    try {
      const health = await fetchHealth();
      setDbConnected(health.database_connected);
      setOllamaOnline(health.ollama_online);
      setSettings(health.settings);
    } catch (e) {
      console.error('Backend health check failed:', e);
      setDbConnected(false);
      setOllamaOnline(false);
    }
  };

  const refreshSchema = async () => {
    if (!dbConnected) {
      setSchema(null);
      return;
    }
    try {
      const schemaData = await fetchSchema();
      setSchema(schemaData);
    } catch (e) {
      console.error('Failed to load database schema:', e);
      setSchema(null);
    }
  };

  // Run on startup
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await triggerHealthCheck();
      setIsLoading(false);
    };
    initialize();
  }, []);

  // Refresh schema whenever db connections succeed/change
  useEffect(() => {
    if (dbConnected) {
      refreshSchema();
    } else {
      setSchema(null);
    }
  }, [dbConnected, settings.database_url]);

  const updateAppSettings = async (newSettings: AppSettings) => {
    setIsLoading(true);
    try {
      // Send configurations to the backend
      const res = await updateSettings(newSettings);
      if (res.success) {
        setSettings(newSettings);
        // Force database connection status verification
        await triggerHealthCheck();
      }
    } catch (e) {
      setIsLoading(false);
      throw e;
    }
    setIsLoading(false);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isDarkMode,
        dbConnected,
        ollamaOnline,
        isLoading,
        schema,
        toggleDarkMode,
        updateAppSettings,
        refreshSchema,
        triggerHealthCheck,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
