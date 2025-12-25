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
        
        # Handle JSON request
        if request.content_type and 'application/json' in request.content_type:
            data = request.json
            app_name = data.get('appName', '').strip()
            package_id = data.get('packageId', '').strip()
            platforms = data.get('platforms', ['android'])
            logo_url = data.get('logoUrl', '').strip() if data.get('logoUrl') else None
            build_settings = data.get('buildSettings')
        else:
            # Legacy FormData support
            app_name = request.form.get('appName', '').strip()
            package_id = request.form.get('packageId', '').strip()
            platforms_json = request.form.get('platforms', '["android"]')
            logo_url = request.form.get('logoUrl', '').strip() or None
            
            try:
                platforms = json.loads(platforms_json)
                if not platforms:
                    platforms = ['android']
            except json.JSONDecodeError:
                platforms = ['android']
            
            build_settings_json = request.form.get('buildSettings')
            build_settings = None
            if build_settings_json:
                try:
                    build_settings = json.loads(build_settings_json)
                except json.JSONDecodeError:
                    pass
        
        if not app_name or not package_id:
            return jsonify({'error': 'App name and package ID are required'}), 400
        
        app_data = {
            'appName': app_name,
            'packageId': package_id,
            'platforms': platforms
        }
        
        if logo_url:
            app_data['logoUrl'] = logo_url
        
        if build_settings:
            app_data['buildSettings'] = build_settings
        
        app_id = service.add(app_data)
        
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
        
        # Handle JSON request
        if request.content_type and 'application/json' in request.content_type:
            app_data = request.json
        else:
            # Legacy FormData support
            app_data = {}
            
            if request.form.get('appName'):
                app_data['appName'] = request.form.get('appName', '').strip()
            if request.form.get('packageId'):
                app_data['packageId'] = request.form.get('packageId', '').strip()
            if request.form.get('logoUrl'):
                app_data['logoUrl'] = request.form.get('logoUrl', '').strip()
            
            platforms_str = request.form.get('platforms')
            if platforms_str:
                try:
                    app_data['platforms'] = json.loads(platforms_str)
                except json.JSONDecodeError:
                    pass
            
            build_settings_str = request.form.get('buildSettings')
            if build_settings_str:
                try:
                    app_data['buildSettings'] = json.loads(build_settings_str)
                except json.JSONDecodeError:
                    pass
        
        if not service.update(app_id, app_data):
            return jsonify({"error": "App not found"}), 404
        
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
        
        # Check for res.zip (still used by Android Setup step)
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
    """Upload assets for an app (e.g., res.zip for Android icons)."""
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
                # Handle res.zip for Android app icons
                if file.filename.lower().endswith('.zip') and 'res' in file.filename.lower():
                    upload_dir = app_dir / "android" / "app_icon"
                    upload_dir.mkdir(parents=True, exist_ok=True)
                    file_path = upload_dir / "res.zip"
                    file.save(file_path)
                    uploaded_files.append(str(file_path))
        
        return jsonify({
            "message": f"Uploaded {len(uploaded_files)} files",
            "files": uploaded_files
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
