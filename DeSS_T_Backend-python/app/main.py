# # app.py
# from flask import Flask
# from app.routes.calculate_route import calc_bp
# from app.routes.compute_route import compute_bp
# app = Flask(__name__)

# # Register blueprint
# app.register_blueprint(calc_bp, url_prefix="/api")
# app.register_blueprint(compute_bp, url_prefix="/api")

# if __name__ == "__main__":
#     app.run(host="localhost", port=5000, debug=True)
from fastapi import FastAPI
import uvicorn
from app.api.routes.calculator import router as calculator_router

app = FastAPI()

app.include_router(calculator_router, prefix="/api", tags=["calculator"])

@app.get("/")
def root():
    return {"message": "FastAPI is running!"}


if __name__ == "__main__":
    # กำหนด port ที่คุณต้องการ 
    uvicorn.run(app, host="127.0.0.1", port=5000, reload=True)
