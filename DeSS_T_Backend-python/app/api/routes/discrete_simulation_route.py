from fastapi import APIRouter
from fastapi import HTTPException
from app.schemas.DiscreteSimulation import (
    DiscreteSimulationResponse,
    DiscreteSimulationRequest,
)
from app.services.discrete_simulation_runner import run_discrete_simulation

router = APIRouter()


@router.post(
    "/discrete-simulate",
    response_model=DiscreteSimulationResponse,
    summary="Run Discrete Event Simulation",
    description="Run a discrete event simulation with exact passenger arrival times (day template)"
)
def discrete_simulate(req: DiscreteSimulationRequest):
    """
    Run a discrete event simulation.
    
    This endpoint accepts specific passenger arrival times in a day template,
    along with bus schedules, and calculates:
    - Waiting times
    - Queue lengths
    - Bus utilization
    - Travel times
    - Travel distances
    
    Per station and per route.
    
    Args:
        req: DiscreteSimulationRequest with:
            - time_period: "HH:MM-HH:MM" (e.g., "08:00-20:00")
            - time_slot: slot duration in minutes
            - day_template: List of passenger arrivals with {station_name, arrival_time}
            - configuration_data: Stations, route pairs
            - scenario_data: Bus schedules and information
    
    Returns:
        DiscreteSimulationResponse with calculated metrics
    """
    try:
        result = run_discrete_simulation(req)
        return {
            "result": "success",
            "simulation_result": result.simulation_result,
            "logs": result.logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
