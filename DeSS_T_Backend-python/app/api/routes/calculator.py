from fastapi import APIRouter
from app.schemas.calculation import CalculationRequest, CalculationResponse
from app.services.calculate import power_number

router = APIRouter()

@router.post("/power", response_model=CalculationResponse)
def calculate_power(data: CalculationRequest):
    result = power_number(data.number)
    return CalculationResponse(result=result)
