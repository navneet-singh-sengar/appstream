"""
Main routes - Static file serving, downloads, and system info.
"""

import platform
import subprocess
from importlib.metadata import version as pkg_version

import flask

from flask import Blueprint, current_app, send_file, jsonify

bp = Blueprint('main', __name__)

# App version - update this when releasing new versions
APP_VERSION = "1.0.0"


@bp.route('/')
@bp.route('/app/<path:path>')
@bp.route('/project/<path:path>')
def index(path=None):
    """
    Serve the main dashboard.
    
    This catch-all route handles client-side routing by serving index.html
    for all non-API routes, allowing React Router to handle the routing.
    """
    return current_app.send_static_file('index.html')


@bp.route('/api/download/<filename>')
def download_file(filename):
    """Download built APK/output file."""
    output_path = current_app.config['BUILD_OUTPUT_DIR'] / filename
    if output_path.exists():
        return send_file(output_path, as_attachment=True)
    return jsonify({"error": "File not found"}), 404


def _get_flutter_version():
    """Get Flutter version information by running flutter --version."""
    try:
        result = subprocess.run(
            ["flutter", "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            output = result.stdout
            # Parse Flutter version output
            flutter_version = None
            channel = None
            dart_version = None
            
            for line in output.split('\n'):
                line = line.strip()
                if line.startswith('Flutter'):
                    # "Flutter 3.x.x • channel stable • ..."
                    parts = line.split('•')
                    if parts:
                        flutter_version = parts[0].replace('Flutter', '').strip()
                        if len(parts) > 1:
                            channel = parts[1].replace('channel', '').strip()
                elif line.startswith('Tools'):
                    # "Tools • Dart 3.x.x • DevTools 2.x.x"
                    parts = line.split('•')
                    for part in parts:
                        part = part.strip()
                        if part.startswith('Dart'):
                            dart_version = part.replace('Dart', '').strip()
                            break
            
            return {
                "version": flutter_version,
                "channel": channel,
                "dart": dart_version,
            }
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass
    return None


def _get_package_version(package_name):
    """Safely get package version."""
    try:
        return pkg_version(package_name)
    except Exception:
        return "unknown"


@bp.route('/api/system-info', methods=['GET'])
def get_system_info():
    """
    Get system and version information.
    
    Returns app version, backend framework versions, Flutter version,
    and system information.
    """
    return jsonify({
        "app_version": APP_VERSION,
        "backend": {
            "python": platform.python_version(),
            "flask": flask.__version__,
            "socketio": _get_package_version("flask-socketio"),
        },
        "system": {
            "os": platform.system(),
            "os_version": platform.release(),
            "architecture": platform.machine(),
            "hostname": platform.node(),
        },
        "flutter": _get_flutter_version(),
    })
