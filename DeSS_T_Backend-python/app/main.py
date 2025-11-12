# app.py
from flask import Flask
from app.routes.calculate_route import calc_bp
from app.routes.compute_route import compute_bp
app = Flask(__name__)

# Register blueprint
app.register_blueprint(calc_bp, url_prefix="/api")
app.register_blueprint(compute_bp, url_prefix="/api")

if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)
