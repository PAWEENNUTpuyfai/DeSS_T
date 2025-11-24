from pydantic import BaseModel

class CalculationRequest(BaseModel):
    number: int

class CalculationResponse(BaseModel):
    result: int
