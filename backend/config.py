"""
Flask configuration classes following Flask conventions.
"""

import os
from pathlib import Path


class Config:
    """Base configuration class."""
    
    # Base paths
    BASE_DIR = Path(__file__).parent  # backend/
    APP_BUILDER_DIR = BASE_DIR.parent  # app_builder/
    PROJECT_ROOT = APP_BUILDER_DIR.parent  # Flutter project root (for builds)
    
    # Data storage (inside backend for portability)
    DATA_DIR = BASE_DIR / "data"
    PROJECTS_DIR = DATA_DIR / "projects"
    BUILD_OUTPUT_DIR = DATA_DIR / "builds"
    
    # React build directory for static files
    STATIC_FOLDER = APP_BUILDER_DIR / "frontend" / "dist"
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # CORS settings
    CORS_ORIGINS = "*"
    
    # SocketIO settings
    SOCKETIO_ASYNC_MODE = 'threading'
    
    @classmethod
    def init_app(cls, app):
        """Initialize application with this config."""
        # Ensure required directories exist
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.PROJECTS_DIR.mkdir(exist_ok=True)
        cls.BUILD_OUTPUT_DIR.mkdir(exist_ok=True)


class DevelopmentConfig(Config):
    """Development configuration."""
    
    DEBUG = True
    

class ProductionConfig(Config):
    """Production configuration."""
    
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Log to stderr in production
        import logging
        from logging import StreamHandler
        handler = StreamHandler()
        handler.setLevel(logging.INFO)
        app.logger.addHandler(handler)


class TestingConfig(Config):
    """Testing configuration."""
    
    TESTING = True
    

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
