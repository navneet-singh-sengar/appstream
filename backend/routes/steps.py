"""
Steps API endpoint.

Provides endpoint to list available workflow step types.
"""

from flask import Blueprint, jsonify

from services.workflows.steps import get_available_steps

bp = Blueprint('steps', __name__)


@bp.route('', methods=['GET'])
def list_available_steps():
    """Get all available step types."""
    try:
        steps = get_available_steps()
        return jsonify(steps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

