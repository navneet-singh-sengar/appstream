# AppStream

A powerful, portable tool for managing Flutter app configurations, building multi-platform releases, and running live development sessions.

## Features

- **Project Management** - Add existing Flutter projects or clone from Git repositories
- **Multi-App Support** - Create multiple app configurations per project with custom package IDs, icons, and settings
- **Multi-Platform Builds** - Build APK, App Bundle (AAB) for Android, with iOS, Web, macOS, Windows, and Linux support
- **Live Development** - Run Flutter apps on connected devices with hot reload/restart
- **Real-time Logs** - Stream build and run logs via WebSocket
- **Platform-specific Settings** - Configure build arguments and Dart defines per platform
- **Asset Management** - Upload app icons and manage configurations per app
- **Build History** - Track all builds with download links and status

## Prerequisites

- **Python** 3.8+
- **Node.js** 18+
- **Flutter SDK** (for building apps)
- **Make** (pre-installed on macOS/Linux)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/user/appstream.git
cd appstream

# Start the server
make start
```

This single command will:
1. Create a Python virtual environment
2. Install backend dependencies
3. Install frontend dependencies
4. Build the React frontend
5. Start the server

Open http://localhost:5001 in your browser.

## Usage

| Command | Description |
|---------|-------------|
| `make start` | Install dependencies and start server (background) |
| `make stop` | Stop the running server |
| `make status` | Check if server is running |
| `make dev` | Start in development mode (foreground with debug) |
| `make install` | Install all dependencies without starting |
| `make clean` | Remove build artifacts, caches, and venv |

## Project Structure

```
appstream/
├── Makefile                 # Service management
├── README.md
├── LICENSE
├── backend/                 # Flask server
│   ├── data/                # Runtime data (gitignored)
│   │   ├── projects/        # Project and app configurations
│   │   └── builds/          # Build outputs
│   ├── server.py            # Entry point
│   ├── app.py               # Application factory
│   ├── config.py            # Configuration classes
│   ├── extensions.py        # Flask extensions
│   ├── requirements.txt
│   ├── services/            # Business logic
│   │   ├── project_service.py
│   │   ├── app_service.py
│   │   ├── build_service.py
│   │   ├── flutter_run_service.py
│   │   └── platforms/       # Platform-specific handlers
│   ├── routes/              # API endpoints
│   │   ├── main.py
│   │   ├── projects.py
│   │   ├── apps.py
│   │   ├── build.py
│   │   └── flutter.py
│   └── websocket/           # Socket.IO handlers
│       └── handlers.py
└── frontend/                # React app
    ├── src/
    │   ├── components/      # UI components
    │   ├── hooks/           # Custom React hooks
    │   ├── services/        # API client
    │   ├── store/           # Zustand state
    │   └── types/           # TypeScript types
    └── dist/                # Production build
```

**Note:** The `backend/data/` directory is gitignored and created automatically on first run. All project configurations and build outputs are stored here.

## Development

### Backend Development

```bash
# Start with debug output
make dev

# Or manually
cd backend
source .venv/bin/activate
FLASK_ENV=development python server.py
```

### Frontend Development

```bash
cd frontend
npm run dev
```

The frontend dev server runs on port 5173 with hot module replacement.

## API Reference

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Add existing project |
| POST | `/api/projects/clone` | Clone and add project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/platforms` | Get supported platforms |

### Apps

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:projectId/apps` | List project apps |
| POST | `/api/projects/:projectId/apps` | Create new app |
| GET | `/api/apps/:id` | Get app details |
| PUT | `/api/apps/:id` | Update app |
| DELETE | `/api/apps/:id` | Delete app |
| GET | `/api/apps/:id/assets` | Check app assets |

### Build

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/build/:appId` | Start build |
| POST | `/api/build/stop` | Stop current build |
| GET | `/api/build/:buildId/logs` | Get build logs |
| GET | `/api/build/status` | Get build status |

### Flutter Run

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flutter/devices` | List available devices |
| POST | `/api/flutter/run` | Start Flutter run |
| POST | `/api/flutter/stop` | Stop Flutter run |
| POST | `/api/flutter/hot-reload` | Trigger hot reload |
| POST | `/api/flutter/hot-restart` | Trigger hot restart |
| GET | `/api/flutter/status` | Get run status |
| GET | `/api/flutter/logs` | Get run logs |

### Build History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:projectId/apps/:appId/builds` | Get build history |
| DELETE | `/api/projects/:projectId/apps/:appId/builds/:buildId` | Delete build |

### Downloads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/download/:filename` | Download built artifact |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `build_log` | Server → Client | Real-time build log entry |
| `run_log` | Server → Client | Real-time Flutter run log |
| `run_status` | Server → Client | Flutter run status change |
| `join_build` | Client → Server | Subscribe to build logs |
| `join_flutter_run` | Client → Server | Subscribe to run logs |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `development` | Environment mode |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `5001` | Server port |
| `SECRET_KEY` | (auto) | Flask secret key |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
