# from flask import Blueprint, request, jsonify
# from app.services.compute_service import multiply_value, power_value

# compute_bp = Blueprint('compute', __name__)

# @compute_bp.route('/compute', methods=['POST'])
# def compute():
#     data = request.get_json()
#     num = data.get("num")
#     if num is None:
#         return jsonify({"error": "Missing 'num'"}), 400

#     result = multiply_value(num)
#     return jsonify({"result": result})

# @compute_bp.route('/power', methods=['POST'])
# def power():
#     data = request.get_json()
#     number = data.get("number")
#     if number is None:
#         return jsonify({"error": "Missing 'number'"}), 400

#     result = power_value(number)
#     return jsonify({"result": result})