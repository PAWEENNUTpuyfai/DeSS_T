# routes/calculate_route.py
from flask import Blueprint, request, jsonify
from services.calculator import multiply_by_two, add_numbers

calc_bp = Blueprint("calc_bp", __name__)

@calc_bp.route("/calculate", methods=["POST"])
def calculate():
    data = request.get_json()
    num = data.get("number")

    if num is None:
        return jsonify({"error": "Missing 'number'"}), 400

    result = multiply_by_two(num)
    return jsonify({"result": result})
