"""
Directory browser API endpoint.
"""

import os
from pathlib import Path
from flask import Blueprint, request, jsonify

bp = Blueprint('browse', __name__)

# Allowed root directories for browsing (security)
ALLOWED_ROOTS = [
    Path.home(),  # User's home directory
    Path('/'),    # Allow root for absolute paths (with restrictions)
]

# Directories to hide from listing
HIDDEN_DIRS = {
    '.git', '.svn', '.hg', '__pycache__', 'node_modules',
    '.idea', '.vscode', '.cache', '.npm', '.yarn',
}

# System directories to block
BLOCKED_DIRS = {
    '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/etc',
    '/var', '/tmp', '/proc', '/sys', '/dev',
}


def is_path_allowed(path: Path) -> bool:
    """Check if the path is allowed for browsing."""
    resolved = path.resolve()
    
    # Block system directories
    path_str = str(resolved)
    for blocked in BLOCKED_DIRS:
        if path_str.startswith(blocked):
            return False
    
    # Must be under an allowed root
    for root in ALLOWED_ROOTS:
        try:
            resolved.relative_to(root)
            return True
        except ValueError:
            continue
    
    return False


def is_flutter_project(path: Path) -> bool:
    """Check if the path contains a Flutter project."""
    pubspec = path / 'pubspec.yaml'
    return pubspec.exists() and pubspec.is_file()


@bp.route('', methods=['GET'])
def browse_directory():
    """
    Browse directories on the server.
    
    Query params:
        path: Directory path to browse (defaults to home directory)
    
    Returns:
        {
            "current_path": "/path/to/dir",
            "parent_path": "/path/to" or null,
            "is_flutter_project": true/false,
            "directories": [
                {"name": "subdir", "path": "/path/to/dir/subdir", "is_flutter_project": true/false}
            ]
        }
    """
    try:
        # Get requested path, default to home directory
        requested_path = request.args.get('path', str(Path.home()))
        current_path = Path(requested_path).resolve()
        
        # Security check
        if not is_path_allowed(current_path):
            return jsonify({"error": "Access denied"}), 403
        
        # Ensure path exists and is a directory
        if not current_path.exists():
            return jsonify({"error": "Path does not exist"}), 404
        
        if not current_path.is_dir():
            return jsonify({"error": "Path is not a directory"}), 400
        
        # Get parent path
        parent_path = None
        if current_path != Path.home() and current_path.parent != current_path:
            parent = current_path.parent
            if is_path_allowed(parent):
                parent_path = str(parent)
        
        # List subdirectories
        directories = []
        try:
            for item in sorted(current_path.iterdir()):
                # Skip hidden files and blocked directories
                if item.name.startswith('.') or item.name in HIDDEN_DIRS:
                    continue
                
                if item.is_dir():
                    try:
                        # Check if accessible
                        list(item.iterdir())
                        directories.append({
                            "name": item.name,
                            "path": str(item),
                            "is_flutter_project": is_flutter_project(item)
                        })
                    except PermissionError:
                        # Skip directories we can't access
                        continue
        except PermissionError:
            return jsonify({"error": "Permission denied"}), 403
        
        return jsonify({
            "current_path": str(current_path),
            "parent_path": parent_path,
            "is_flutter_project": is_flutter_project(current_path),
            "directories": directories
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

