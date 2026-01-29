from fastapi import FastAPI
from app.api.routes.calculator import router as calculator_router
from app.api.routes.simulation_route import router as simulation_router

app = FastAPI()

app.include_router(calculator_router, prefix="/api", tags=["calculator"])
app.include_router(simulation_router, prefix="/api", tags=["simulation"])

@app.get("/")
def root():
    return {"message": "FastAPI is running!"}

# if __name__ == "__main__":

#     uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)