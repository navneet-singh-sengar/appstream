"""
Flask extensions initialization.

Extensions are instantiated here without binding to an app,
then initialized with the app in the factory function.
"""

from flask_cors import CORS
from flask_socketio import SocketIO

# Initialize extensions without app binding
cors = CORS()
socketio = SocketIO()


def init_extensions(app):
    """Initialize all Flask extensions with the app instance."""
    cors.init_app(app)
    socketio.init_app(
        app,
        cors_allowed_origins=app.config.get('CORS_ORIGINS', '*'),
        async_mode=app.config.get('SOCKETIO_ASYNC_MODE', 'threading')
    )

