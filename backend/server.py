#!/usr/bin/env python3
"""
AppStream Server - Entry point.

Usage:
    python server.py                    # Development mode
    FLASK_ENV=production python server.py  # Production mode
"""

import os
from app import create_app
from extensions import socketio

# Create application instance
app = create_app()


if __name__ == '__main__':
    # Get configuration
    debug = app.config.get('DEBUG', True)
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5001))
    
    print(f"Starting AppStream Server...")
    print(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"Debug: {debug}")
    print(f"Project Root: {app.config['PROJECT_ROOT']}")
    print(f"Projects Directory: {app.config['PROJECTS_DIR']}")
    print(f"Build Output Directory: {app.config['BUILD_OUTPUT_DIR']}")
    print(f"Server: http://{host}:{port}")
    
    socketio.run(
        app,
        debug=debug,
        host=host,
        port=port,
        allow_unsafe_werkzeug=True
    )
