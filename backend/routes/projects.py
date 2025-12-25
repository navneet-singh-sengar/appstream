"""
Project API endpoints.
"""

from pathlib import Path
from flask import Blueprint, request, jsonify

from services import get_project_service, get_app_service, get_build_history_service

bp = Blueprint('projects', __name__)


@bp.route('', methods=['GET'])
def get_projects():
    """Get all projects."""
    service = get_project_service()
    projects = service.get_all()
    return jsonify(projects)


@bp.route('', methods=['POST'])
def add_project():
    """Add a new Flutter project."""
    try:
        service = get_project_service()
        data = request.json or {}
        
        project_id = service.add(data)
        project = service.get(project_id)
        
        return jsonify({
            "id": project_id,
            "message": "Project added successfully",
            "project": project
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/clone', methods=['POST'])
def clone_project():
    """Clone a Git repository and add it as a new Flutter project."""
    try:
        service = get_project_service()
        data = request.json or {}
        
        project_id = service.clone_and_add(data)
        project = service.get(project_id)
        
        return jsonify({
            "id": project_id,
            "message": "Repository cloned and project added successfully",
            "project": project
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get a specific project."""
    service = get_project_service()
    project = service.get(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    return jsonify(project)


@bp.route('/<project_id>', methods=['PUT'])
def update_project(project_id):
    """Update project configuration."""
    try:
        service = get_project_service()
        data = request.json or {}
        
        if not service.update(project_id, data):
            return jsonify({"error": "Project not found"}), 404
        
        return jsonify({"message": "Project updated successfully"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project.
    
    Query Parameters:
        delete_folder: If 'true', also delete the project folder from disk.
                      For cloned projects, the folder is always deleted.
    """
    service = get_project_service()
    
    # Check if we should delete the project folder
    delete_folder = request.args.get('delete_folder', 'false').lower() == 'true'
    
    if not service.delete(project_id, delete_project_folder=delete_folder):
        return jsonify({"error": "Project not found"}), 404
    
    message = "Project deleted successfully" if delete_folder else "Project removed from workspace"
    return jsonify({"message": message})


@bp.route('/<project_id>/platforms', methods=['GET'])
def get_project_platforms(project_id):
    """
    Detect supported platforms for a Flutter project.
    
    Checks for existence of platform directories (android/, ios/, web/, etc.)
    in the project root.
    """
    service = get_project_service()
    project = service.get(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    project_path = Path(project['path'])
    
    # Platform directory mapping
    platform_dirs = {
        'android': 'android',
        'ios': 'ios',
        'web': 'web',
        'macos': 'macos',
        'windows': 'windows',
        'linux': 'linux',
    }
    
    # Check which platform directories exist
    platforms = []
    for platform, dir_name in platform_dirs.items():
        platform_path = project_path / dir_name
        if platform_path.exists() and platform_path.is_dir():
            platforms.append(platform)
    
    return jsonify({
        "project_id": project_id,
        "platforms": platforms
    })


# App routes scoped to project
@bp.route('/<project_id>/apps', methods=['GET'])
def get_project_apps(project_id):
    """Get all apps for a project."""
    project_service = get_project_service()
    
    if not project_service.get(project_id):
        return jsonify({"error": "Project not found"}), 404
    
    app_service = get_app_service()
    apps = app_service.get_all_for_project(project_id)
    return jsonify(apps)


@bp.route('/<project_id>/apps', methods=['POST'])
def add_project_app(project_id):
    """Add a new app to a project."""
    try:
        project_service = get_project_service()
        
        if not project_service.get(project_id):
            return jsonify({"error": "Project not found"}), 404
        
        app_service = get_app_service()
        
        # Handle both JSON and FormData
        if request.content_type and 'application/json' in request.content_type:
            data = request.json or {}
        else:
            import json
            data = {
                'appName': request.form.get('appName', ''),
                'packageId': request.form.get('packageId', ''),
            }
            # Parse platforms from JSON string
            platforms_str = request.form.get('platforms', '[]')
            try:
                data['platforms'] = json.loads(platforms_str)
            except json.JSONDecodeError:
                data['platforms'] = ['android']
            
            # Handle logo URL
            if request.form.get('logoUrl'):
                data['logoUrl'] = request.form.get('logoUrl')
            
            # Parse build settings from JSON string
            build_settings_str = request.form.get('buildSettings')
            if build_settings_str:
                try:
                    data['buildSettings'] = json.loads(build_settings_str)
                except json.JSONDecodeError:
                    pass
        
        data['project_id'] = project_id
        
        app_id = app_service.add(data)
        
        # Handle file uploads if present
        if 'androidAppIcon' in request.files:
            file = request.files['androidAppIcon']
            if file and file.filename:
                # Save the file to the app's assets directory
                app_dir = app_service.get_app_dir(app_id, project_id)
                if app_dir:
                    icon_dir = app_dir / "android" / "app_icon"
                    icon_dir.mkdir(parents=True, exist_ok=True)
                    file.save(icon_dir / "res.zip")
        
        return jsonify({
            "id": app_id,
            "message": "App added successfully"
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Build history routes
@bp.route('/<project_id>/apps/<app_id>/builds', methods=['GET'])
def get_build_history(project_id, app_id):
    """Get build history for an app."""
    project_service = get_project_service()
    
    if not project_service.get(project_id):
        return jsonify({"error": "Project not found"}), 404
    
    app_service = get_app_service()
    if not app_service.get(app_id, project_id):
        return jsonify({"error": "App not found"}), 404
    
    # Get optional limit parameter
    limit = request.args.get('limit', 20, type=int)
    
    history_service = get_build_history_service()
    history = history_service.get_history(project_id, app_id, limit=limit)
    
    return jsonify(history)


@bp.route('/<project_id>/apps/<app_id>/builds/<build_id>', methods=['DELETE'])
def delete_build(project_id, app_id, build_id):
    """Delete a build record and its output file."""
    project_service = get_project_service()
    
    if not project_service.get(project_id):
        return jsonify({"error": "Project not found"}), 404
    
    app_service = get_app_service()
    if not app_service.get(app_id, project_id):
        return jsonify({"error": "App not found"}), 404
    
    # Check if we should delete the file too
    delete_file = request.args.get('delete_file', 'true').lower() == 'true'
    
    history_service = get_build_history_service()
    if history_service.delete_record(project_id, app_id, build_id, delete_file=delete_file):
        return jsonify({"message": "Build record deleted successfully"})
    
    return jsonify({"error": "Build record not found"}), 404
