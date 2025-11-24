from typing import List

from app.schemas.calculation import DataFitResponse, FitItem


def power_number(n: int) -> int:
    return (n * n)  # ยกกำลัง 2


# Mockup data for distribution fitting endpoint
def distribution_fitting() -> DataFitResponse:
    mock_items: List[FitItem] = [
        FitItem(Station="StationA", Time_Range="00:00-01:00", Distribution="Normal", ArgumentList="mu=0,sigma=1"),
        FitItem(Station="StationB", Time_Range="01:00-02:00", Distribution="Exponential", ArgumentList="lambda=1.5"),
    ]

    return DataFitResponse(DataFitResponse=mock_items)

