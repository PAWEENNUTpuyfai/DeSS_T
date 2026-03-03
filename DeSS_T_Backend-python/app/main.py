from fastapi import FastAPI
from app.api.routes.calculator import router as calculator_router
from app.api.routes.simulation_route import router as simulation_router
from app.api.routes.discrete_simulation_route import router as discrete_simulation_router
from app.api.routes.combined_simulation_route import router as combined_simulation_router

app = FastAPI()

app.include_router(calculator_router, prefix="/api", tags=["calculator"])
app.include_router(simulation_router, prefix="/api", tags=["simulation"])
app.include_router(discrete_simulation_router, prefix="/api", tags=["discrete_simulation"])
app.include_router(combined_simulation_router, prefix="/api", tags=["combined_simulation"])

@app.get("/")
def root():
    return {"message": "FastAPI is running!"}

# if __name__ == "__main__":

#     uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)