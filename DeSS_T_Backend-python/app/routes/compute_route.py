from flask import Blueprint, request, jsonify
from app.services.compute_service import multiply_value

compute_bp = Blueprint('compute', __name__)

@compute_bp.route('/compute', methods=['POST'])
def compute():
    data = request.get_json()
    num = data.get("num")
    if num is None:
        return jsonify({"error": "Missing 'num'"}), 400

    result = multiply_value(num)
    return jsonify({"result": result})
