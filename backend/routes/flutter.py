"""
Flutter Run API endpoints.
"""

from flask import Blueprint, request, jsonify

from services import get_flutter_run_service

bp = Blueprint('flutter', __name__)


@bp.route('/devices', methods=['GET'])
def get_devices():
    """Get list of available Flutter devices."""
    try:
        service = get_flutter_run_service()
        project_id = request.args.get('project_id')
        devices = service.get_devices(project_id)
        return jsonify(devices)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/run', methods=['POST'])
def start_run():
    """Start Flutter run on a device."""
    try:
        service = get_flutter_run_service()
        data = request.json or {}
        device_id = data.get('device')
        project_id = data.get('project_id')
        app_id = data.get('app_id')  # Optional: for run settings
        run_mode = data.get('run_mode', 'debug')  # debug, profile, or release
        
        if not device_id:
            return jsonify({"error": "Device ID is required"}), 400
        
        if not project_id:
            return jsonify({"error": "Project ID is required"}), 400
        
        # Validate run_mode
        if run_mode not in ('debug', 'profile', 'release'):
            run_mode = 'debug'
        
        result = service.start(device_id, project_id, app_id, run_mode)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/stop', methods=['POST'])
def stop_run():
    """Stop Flutter run."""
    try:
        service = get_flutter_run_service()
        result = service.stop()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/hot-reload', methods=['POST'])
def hot_reload():
    """Trigger hot reload."""
    try:
        service = get_flutter_run_service()
        result = service.hot_reload()
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/hot-restart', methods=['POST'])
def hot_restart():
    """Trigger hot restart."""
    try:
        service = get_flutter_run_service()
        result = service.hot_restart()
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/status', methods=['GET'])
def get_status():
    """Get Flutter run status."""
    try:
        service = get_flutter_run_service()
        status = service.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/logs', methods=['GET'])
def get_logs():
    """Get Flutter run logs."""
    try:
        service = get_flutter_run_service()
        logs = service.get_logs()
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/clean', methods=['POST'])
def clean_project():
    """Run flutter clean on a project."""
    try:
        service = get_flutter_run_service()
        data = request.json or {}
        project_id = data.get('project_id')
        
        if not project_id:
            return jsonify({"error": "Project ID is required"}), 400
        
        result = service.clean_project(project_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/project-info', methods=['GET'])
def get_project_info():
    """Get detailed information about a Flutter project."""
    try:
        service = get_flutter_run_service()
        project_id = request.args.get('project_id')
        
        if not project_id:
            return jsonify({"error": "Project ID is required"}), 400
        
        info = service.get_project_info(project_id)
        return jsonify(info)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/clean-batch', methods=['POST'])
def clean_projects_batch():
    """Run flutter clean on multiple projects."""
    try:
        service = get_flutter_run_service()
        data = request.json or {}
        project_ids = data.get('project_ids', [])
        
        if not project_ids or not isinstance(project_ids, list):
            return jsonify({"error": "project_ids array is required"}), 400
        
        if len(project_ids) == 0:
            return jsonify({"error": "At least one project ID is required"}), 400
        
        results = service.clean_projects(project_ids)
        return jsonify({"results": results})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
