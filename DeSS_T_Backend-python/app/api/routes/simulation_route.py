from fastapi import APIRouter
from fastapi import HTTPException
from app.schemas.Simulation import SimulationResponse, SimulationRequest
from app.services.simulation_runner import run_simulation
router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest):
    try:
        result = run_simulation(req)
        return {"result": "success", "simulation_result": result.simulation_result, "logs": result.logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))