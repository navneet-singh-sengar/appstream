# AppStream - React Frontend

A modern React-based frontend for AppStream, built with Vite, TypeScript, Tailwind CSS, and Zustand.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **Zustand** - State management
- **Socket.IO Client** - Real-time build logging
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Lucide React** - Icons

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Python backend running on port 5001

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API requests to the Python backend on port 5001.

### Build for Production

```bash
npm run build
```

The production build is output to `dist/` and will be automatically served by the Flask backend.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Button, Card, etc.)
│   │   ├── layout/          # Layout components (Navbar, etc.)
│   │   ├── project-list.tsx
│   │   ├── app-list.tsx
│   │   ├── app-form.tsx
│   │   ├── build-console.tsx
│   │   ├── run-console.tsx
│   │   └── build-history.tsx
│   ├── hooks/
│   │   ├── use-apps.ts      # App CRUD operations
│   │   ├── use-build.ts     # Build management
│   │   └── use-socket.ts    # WebSocket connection
│   ├── services/
│   │   ├── api.ts           # REST API client
│   │   └── socket.ts        # Socket.IO client
│   ├── store/
│   │   └── index.ts         # Zustand store
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles + Tailwind
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Features

- **Project Management** - Add, edit, delete Flutter projects
- **App Management** - Create multiple app configurations per project
- **Build Configuration** - Select platform, build type, and output format
- **Real-time Build Logs** - WebSocket-powered live log streaming
- **Flutter Run** - Run apps on connected devices with hot reload/restart
- **Build History** - Track all builds with download links
- **Dark/Light Mode** - Toggle between themes
- **Responsive Design** - Works on desktop and mobile
- **Toast Notifications** - User feedback for actions

## Running with Backend

### Option 1: Development (two terminals)

```bash
# Terminal 1: Backend
cd backend && python server.py

# Terminal 2: Frontend dev server
cd frontend && npm run dev
```

### Option 2: Production (single server)

```bash
# Build frontend
cd frontend && npm run build

# Start backend (serves React build automatically)
cd backend && python server.py
```

Visit `http://localhost:5001` to access the app.
