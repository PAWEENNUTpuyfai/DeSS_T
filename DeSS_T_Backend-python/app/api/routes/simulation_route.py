from fastapi import APIRouter
from fastapi import HTTPException
from app.schemas.Simulation import SimulationResponse, SimulationRequest
from app.services.simulation_runner import run_simulation
from app.services.discrete_simulation import DiscreteSimulationEngine
from app.schemas.DiscreteSimualtion import DiscreteSimulationRequest, DiscreteSimulationResponse
from app.services.mapper_discrete import build_discrete_simulation_config
router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest):
    try:
        result = run_simulation(req)
        return {"result": "success", "simulation_result": result.simulation_result, "logs": result.logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
from fastapi import HTTPException

@router.post("/discrete-simulate", response_model=DiscreteSimulationResponse)
def discrete_simulate(req: DiscreteSimulationRequest):
    try:
        # 1. แปลง Data เป็น Config
        config = build_discrete_simulation_config(req)
        
        # 2. รัน Simulation
        engine = DiscreteSimulationEngine(config)
        result_data = engine.run() 
        
        # 3. คืนค่าตามโครงสร้าง
        return result_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discrete Simulation Error: {str(e)}")