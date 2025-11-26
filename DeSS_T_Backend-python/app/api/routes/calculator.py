from fastapi import APIRouter
# Mockup
from app.schemas.calculation import CalculationRequest, CalculationResponse
# Real
from app.schemas.calculation import DataModelDistRequest, DataFitResponse
from app.services.calculate import power_number, distribution_fitting

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