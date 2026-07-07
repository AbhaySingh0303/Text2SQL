# Text-to-SQL Assistant UI (Frontend)

A sleek, premium, React-based dashboard built using Vite, TypeScript, and Tailwind CSS. The workspace layout provides natural language inputs, dynamic schema pruning visualization, streaming SQL generation viewports, and interactive, paginated database results sheets.

## Features
- **Split Workspace Panel**: Side-by-side prompt control card and execution response table.
- **Dynamic Schema Explorer**: Accordion selector showcasing database tables, columns, primary keys, and foreign keys.
- **SQL Styling**: Custom-built, zero-dependency SQL highlighter.
- **Settings Controller**: Real-time DB Connection URL and Ollama endpoint modification matching.
- **Keyboard Actions**: `Ctrl + Enter` to generate and run, `Ctrl + Shift + Enter` to run query.
- **CSV Downloads**: Fast export of dataset queries to CSV files.
- **Favorites & History**: LocalStorage-persisted bookmarks for recurring prompts.

## Folder Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── ResultPanel.tsx     # Syntax highlighting & pagination grid
│   │   ├── Sidebar.tsx         # Schema accordion & history tabs
│   │   └── SettingsModal.tsx   # Floating connections settings configurer
│   ├── context/
│   │   └── SettingsContext.tsx # Centralized configuration and service health sync
│   ├── services/
│   │   └── api.ts              # HTTP fetch client & SSE chunk receiver
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── App.tsx                 # Core UI dashboard workspace
│   ├── index.css               # Tailwind directives and scrollbar styles
│   └── main.tsx                # StrictMode loader
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS settings
├── postcss.config.js           # PostCSS configuration
└── README.md
```

## Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- NPM or Yarn package managers

### 2. Quickstart Development
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Boot up local Vite developer server:
   ```bash
   npm run dev
   ```
4. Access the web portal:
   Open your browser and navigate to `http://localhost:5173`.

### 3. Build Production bundle
```bash
npm run build
```
This outputs compiled, optimized assets to `dist/`, which are ready to be deployed.
