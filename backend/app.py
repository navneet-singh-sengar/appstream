"""
Flask application factory.

This module provides the create_app factory function following Flask conventions.
"""

import os
from flask import Flask

from config import config
from extensions import init_extensions, socketio
from routes import register_blueprints
from services import init_services
from websocket import register_handlers


def create_app(config_name=None):
    """
    Application factory function.
    
    Args:
        config_name: Configuration name ('development', 'production', 'testing').
                    Defaults to FLASK_ENV environment variable or 'development'.
    
    Returns:
        Configured Flask application instance.
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    # Get configuration class
    config_class = config.get(config_name, config['default'])
    
    # Determine static folder
    static_folder = str(config_class.STATIC_FOLDER) if config_class.STATIC_FOLDER.exists() else '.'
    
    # Create Flask app
    app = Flask(
        __name__,
        static_folder=static_folder,
        static_url_path=''
    )
    
    # Load configuration
    app.config.from_object(config_class)
    
    # Initialize configuration (create directories, etc.)
    config_class.init_app(app)
    
    # Initialize extensions
    init_extensions(app)
    
    # Initialize services
    init_services(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register WebSocket handlers
    register_handlers(socketio, app)
    
    return app
