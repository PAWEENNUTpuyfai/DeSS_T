from pydantic import BaseModel, Field
from typing import List


class CalculationRequest(BaseModel):
    number: int


class CalculationResponse(BaseModel):
    result: int


# Models for Distribution Fitting
class RecordDistRequest(BaseModel):
    RecordID: int = Field(..., alias="Record_ID")
    NumericValue: float = Field(..., alias="Numeric_Value")

    model_config = {
        "validate_by_name": True,
        "from_attributes": True,
    }


class ItemDistRequest(BaseModel):
    Station: str
    TimeRange: str = Field(..., alias="Time_Range")
    Records: List[RecordDistRequest]

    model_config = {
        "validate_by_name": True,
        "from_attributes": True,
    }


class DataModelDistRequest(BaseModel):
    Data: List[ItemDistRequest]

    model_config = {
        "validate_by_name": True,
        "from_attributes": True,
    }


class FitItem(BaseModel):
    Station: str
    Time_Range: str
    Distribution: str
    ArgumentList: str

    model_config = {
        "validate_by_name": True,
        "from_attributes": True,
    }


class DataFitResponse(BaseModel):
    DataFitResponse: List[FitItem]

    model_config = {
        "validate_by_name": True,
        "from_attributes": True,
    }

