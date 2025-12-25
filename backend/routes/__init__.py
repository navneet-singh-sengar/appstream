"""
Routes package - API endpoint blueprints.

Each blueprint defines routes for a specific domain.
"""

from .projects import bp as projects_bp
from .apps import bp as apps_bp
from .build import bp as build_bp
from .flutter import bp as flutter_bp
from .browse import bp as browse_bp
from .main import bp as main_bp
from .steps import bp as steps_bp


def register_blueprints(app):
    """Register all blueprints with the Flask app."""
    app.register_blueprint(main_bp)
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(apps_bp, url_prefix='/api/apps')
    app.register_blueprint(build_bp, url_prefix='/api/build')
    app.register_blueprint(flutter_bp, url_prefix='/api/flutter')
    app.register_blueprint(browse_bp, url_prefix='/api/browse')
    app.register_blueprint(steps_bp, url_prefix='/api/steps')


__all__ = ['register_blueprints']
