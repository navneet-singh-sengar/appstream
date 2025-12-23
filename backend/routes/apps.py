"""
App API endpoints.
"""

import json
from flask import Blueprint, request, jsonify

from services import get_app_service

bp = Blueprint('apps', __name__)


@bp.route('', methods=['GET'])
def get_all():
    """Get all apps."""
    service = get_app_service()
    apps = service.get_all()
    return jsonify(apps)


@bp.route('', methods=['POST'])
def create():
    """Add a new app."""
    try:
        service = get_app_service()
        
        app_name = request.form.get('appName', '').strip()
        package_id = request.form.get('packageId', '').strip()
        platforms_json = request.form.get('platforms', '["android"]')
        logo_url = request.form.get('logoUrl', '').strip()
        
        if not app_name or not package_id:
            return jsonify({'error': 'App name and package ID are required'}), 400
        
        try:
            platforms = json.loads(platforms_json)
            if not platforms:
                platforms = ['android']
        except json.JSONDecodeError:
            platforms = ['android']
        
        app_data = {
            'appName': app_name,
            'packageId': package_id,
            'platforms': platforms
        }
        
        # Add logo URL if provided
        if logo_url:
            app_data['logoUrl'] = logo_url
            
        # Parse build settings
        build_settings_json = request.form.get('buildSettings')
        if build_settings_json:
            try:
                build_settings = json.loads(build_settings_json)
                app_data['buildSettings'] = build_settings
            except json.JSONDecodeError:
                pass
        
        app_id = service.add(app_data)
        
        # Handle Android app icon upload
        if 'androidAppIcon' in request.files:
            file = request.files['androidAppIcon']
            if file and file.filename:
                app_dir = service.get_app_dir(app_id)
                if app_dir:
                    icon_dir = app_dir / "android" / "app_icon"
                    icon_dir.mkdir(parents=True, exist_ok=True)
                    file.save(icon_dir / "res.zip")
        
        return jsonify({'id': app_id, 'message': 'App added successfully'}), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to add app: {str(e)}'}), 500


@bp.route('/<app_id>', methods=['GET'])
def get_one(app_id):
    """Get a specific app."""
    service = get_app_service()
    app = service.get(app_id)
    if app:
        return jsonify(app)
    return jsonify({"error": "App not found"}), 404


@bp.route('/<app_id>', methods=['PUT'])
def update(app_id):
    """Update an app."""
    try:
        service = get_app_service()
        
        # Handle both JSON and FormData
        if request.content_type and 'application/json' in request.content_type:
            app_data = request.json
        else:
            # Parse FormData
            app_data = {}
            
            if request.form.get('appName'):
                app_data['appName'] = request.form.get('appName', '').strip()
            if request.form.get('packageId'):
                app_data['packageId'] = request.form.get('packageId', '').strip()
            if request.form.get('logoUrl'):
                app_data['logoUrl'] = request.form.get('logoUrl', '').strip()
            
            # Parse platforms from JSON string
            platforms_str = request.form.get('platforms')
            if platforms_str:
                try:
                    app_data['platforms'] = json.loads(platforms_str)
                except json.JSONDecodeError:
                    pass
            
            # Parse build settings from JSON string
            build_settings_str = request.form.get('buildSettings')
            if build_settings_str:
                try:
                    app_data['buildSettings'] = json.loads(build_settings_str)
                except json.JSONDecodeError:
                    pass
        
        if not service.update(app_id, app_data):
            return jsonify({"error": "App not found"}), 404
        
        # Handle Android app icon upload
        if 'androidAppIcon' in request.files:
            file = request.files['androidAppIcon']
            if file and file.filename:
                app_dir = service.get_app_dir(app_id)
                if app_dir:
                    icon_dir = app_dir / "android" / "app_icon"
                    icon_dir.mkdir(parents=True, exist_ok=True)
                    file.save(icon_dir / "res.zip")
        
        return jsonify({"message": "App updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/<app_id>', methods=['DELETE'])
def delete(app_id):
    """Delete an app."""
    service = get_app_service()
    if service.delete(app_id):
        return jsonify({"message": "App deleted successfully"})
    return jsonify({"error": "App not found"}), 404


@bp.route('/<app_id>/assets', methods=['GET'])
def check_assets(app_id):
    """Check what assets exist for an app."""
    try:
        service = get_app_service()
        app_dir = service.get_app_dir(app_id)
        
        if not app_dir or not app_dir.exists():
            return jsonify({"error": "App not found"}), 404
        
        # Check for res.zip
        res_zip_path = app_dir / "android" / "app_icon" / "res.zip"
        has_res_zip = res_zip_path.exists()
        
        return jsonify({
            "hasResZip": has_res_zip,
            "resZipPath": str(res_zip_path) if has_res_zip else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/<app_id>/assets', methods=['POST'])
def upload_assets(app_id):
    """Upload assets for an app."""
    try:
        if 'files' not in request.files:
            return jsonify({"error": "No files provided"}), 400
        
        service = get_app_service()
        app_dir = service.get_app_dir(app_id)
        
        if not app_dir or not app_dir.exists():
            return jsonify({"error": "App not found"}), 404
        
        uploaded_files = []
        for file in request.files.getlist('files'):
            if file.filename:
                if file.filename.lower().endswith('.zip') and 'res.zip' in file.filename.lower():
                    upload_dir = app_dir / "android" / "app_icon"
                    upload_dir.mkdir(parents=True, exist_ok=True)
                    file_path = upload_dir / file.filename
                    file.save(file_path)
                    uploaded_files.append(str(file_path))
        
        return jsonify({
            "message": f"Uploaded {len(uploaded_files)} files",
            "files": uploaded_files
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

