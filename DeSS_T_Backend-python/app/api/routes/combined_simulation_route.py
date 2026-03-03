from fastapi import APIRouter, HTTPException
from app.schemas.CombinedSimulation import (
    CombinedSimulationRequest,
    CombinedSimulationResponse,
)
from app.services.combined_simulation_runner import run_combined_simulation

router = APIRouter()


@router.post(
    "/simulate-combined",
    response_model=CombinedSimulationResponse,
    summary="Run Combined Simulation (Regular + Discrete)",
    description="Run both distribution-based and discrete event simulations. Supports guest mode and login mode with persistent day_template storage."
)
def simulate_combined(req: CombinedSimulationRequest):
    """
    Run combined simulation with both regular and discrete modes.
    
    **Modes:**
    - Guest Mode (no user_id): Uses day_template from request only
    - Login Mode (with user_id): 
      - If day_template provided: saves to file, then uses it
      - If day_template not provided: loads from saved file if exists
    
    **Behavior:**
    - Runs standard distribution-based simulation (always)
    - Runs discrete event simulation if day_template is available
    - In login mode: persists day_template for reuse across simulations
    - Saves discrete simulation results to JSON file
    - Returns results from both simulations
    
    Args:
        req: CombinedSimulationRequest with:
            - time_period: "HH:MM-HH:MM"
            - time_slot: slot duration in minutes
            - configuration_data: stations, routes
            - scenario_data: bus schedules
            - user_id: (optional) user google_id for login mode
            - day_template: (optional) exact passenger arrivals
            - output_filename: (optional) custom filename for discrete results
    
    Returns:
        CombinedSimulationResponse with:
            - regular_simulation: results from distribution-based sim
            - discrete_simulation: results from discrete sim (if available)
            - saved_file: info about saved JSON file
            - logs: combined logs from both simulations
    """
    try:
        result = run_combined_simulation(req)
        return {
            "result": result.result,
            "regular_simulation": result.regular_simulation,
            "discrete_simulation": result.discrete_simulation,
            "saved_file": result.saved_file,
            "logs": result.logs
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {str(e)}"
        )
