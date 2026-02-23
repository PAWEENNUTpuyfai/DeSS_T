from fastapi import APIRouter
# Mockup
from app.schemas.calculation import CalculationRequest, CalculationResponse
# Real
from app.schemas.calculation import DataModelDistRequest, DataFitResponse
from app.services.calculate import power_number, distribution_fitting
from app.services.calculateAlighting import fit_alighting_distribution as alighting_distribution_fitting
# from app.services.simulation import run_simulation
# from app.schemas.Simulation import SimulationResponse, SimulationRequest
# from app.services.simulation_runner import run_simulation
router = APIRouter()

@router.post("/power", response_model=CalculationResponse)
def calculate_power(data: CalculationRequest):
    result = power_number(data.number)
    return CalculationResponse(result=result)

@router.post("/distribution_fit",response_model=DataFitResponse)
def fit_distribution(data: DataModelDistRequest):
    # Mockup implementation
    result = distribution_fitting(data)
    return result

@router.post("/alighting_distribution_fit",response_model=DataFitResponse)
def fit_alighting_distribution(data: DataModelDistRequest):
    # Mockup implementation
    result = alighting_distribution_fitting(data)
    return result

# @router.get("/simulate")
# def run_simulation_route():
#     result = run_simulation()
#     return result
# @router.post("/simulate", response_model=SimulationResponse)
# def simulate(req: SimulationRequest):
#     try:
#         logs = run_simulation(req)
#         return {"result": "success", "logs": logs}
#     except Exception as e:
#         return {"result": "error", "logs": [str(e)]}