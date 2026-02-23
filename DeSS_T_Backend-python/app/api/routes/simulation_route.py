from fastapi import APIRouter
from fastapi import HTTPException
from app.schemas.Simulation import SimulationResponse, SimulationRequest
from app.services.simulation_runner import run_simulation
from app.core.config import settings
import signal
import traceback

router = APIRouter()

class TimeoutException(Exception):
    """Custom exception for simulation timeout"""
    pass

def timeout_handler(signum, frame):
    """Handle SIGALRM signal for timeout"""
    raise TimeoutException("Simulation execution timeout reached")

@router.post("/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest):
    # กำหนด timeout จาก environment variable (ค่าเริ่มต้น 300 วินาที = 5 นาที)
    simulation_timeout = getattr(settings, 'SIMULATION_TIMEOUT', 300)
    
    try:
        # เรียกใช้ simulation กับ timeout protection
        result = run_simulation(req, timeout=simulation_timeout)
        return {"result": "success", "simulation_result": result.simulation_result, "logs": result.logs}
    except TimeoutException as te:
        error_msg = f"Simulation timeout after {simulation_timeout}s: {str(te)}"
        raise HTTPException(status_code=504, detail=error_msg)
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}\n{tb}")