"""
Build API endpoints.
"""

from flask import Blueprint, request, jsonify

from services import get_build_service

bp = Blueprint('build', __name__)


@bp.route('/<app_id>', methods=['POST'])
def build_app(app_id):
    """Build for an app."""
    try:
        service = get_build_service()
        data = request.json or {}
        platform = data.get('platform', 'android')
        build_type = data.get('build_type', 'release')
        output_type = data.get('output_type', 'apk')
        
        result = service.build(app_id, platform, build_type, output_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/stop', methods=['POST'])
def stop_build():
    """Stop the current build."""
    try:
        service = get_build_service()
        result = service.stop_build()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/<build_id>/logs', methods=['GET'])
def get_logs(build_id):
    """Get build logs."""
    service = get_build_service()
    logs = service.get_logs(build_id)
    return jsonify(logs)


@bp.route('/status', methods=['GET'])
def get_status():
    """Get current build status."""
    service = get_build_service()
    return jsonify(service.get_status())
