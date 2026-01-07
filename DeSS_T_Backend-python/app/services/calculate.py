
from typing import List, Dict
from scipy import stats
import numpy as np
from app.schemas.calculation import DataFitResponse, FitItem , RecordDistRequest , DataModelDistRequest


def power_number(n: int) -> int:
    return (n * n)  # ยกกำลัง 2


# # Mockup data for distribution fitting endpoint
# def distribution_fitting() -> DataFitResponse:
#     mock_items: List[FitItem] = [
#         FitItem(Station="StationA", Time_Range="00:00-01:00", Distribution="Normal", ArgumentList="mu=0,sigma=1"),
#         FitItem(Station="StationB", Time_Range="01:00-02:00", Distribution="Exponential", ArgumentList="lambda=1.5"),
#     ]

#     return DataFitResponse(DataFitResponse=mock_items)



# ------------------------------
# Distribution fitting function
# ------------------------------

def fit_best_distribution(values: List[float]) -> Dict:
    """
    Fit multiple distributions and choose the best by lowest SSE.
    """

    distributions = {
        "Exponential": stats.expon,
        "Weibull": stats.weibull_min,
        "Gamma": stats.gamma,
        # "Lognormal": stats.lognorm,
    }

    best_name = None
    best_params = None
    best_aic = float("inf")

    for name, dist in distributions.items():
        try:
            params = dist.fit(values)

            # AIC
            logL = np.sum(dist.logpdf(values, *params))
            k = len(params)
            aic = 2 * k - 2 * logL

            if aic < best_aic:
                best_aic = aic
                best_name = name
                best_params = params

        except Exception:
            continue

    return {
        "name": best_name,
        "params": best_params
    }


# ------------------------------
# Convert params to text
# ------------------------------
def params_to_string(dist_name: str, params) -> str:
    params = list(params)

    if dist_name == "Exponential":
        loc, scale = params
        rate = 1.0 / scale
        return f"rate={rate:.4f}, loc={loc:.4f}"

    if dist_name == "Weibull":
        shape, loc, scale = params
        return f"shape={shape:.4f}, loc={loc:.4f}, scale={scale:.4f}"

    if dist_name == "Gamma":
        shape, loc, scale = params
        return f"shape={shape:.4f}, loc={loc:.4f}, scale={scale:.4f}"

    # if dist_name == "Lognormal":
    #     shape, loc, scale = params
    #     return f"shape={shape:.4f}, loc={loc:.4f}, scale={scale:.4f}"

    return str(params)


# ------------------------------
# Main Function
# ------------------------------
def distribution_fitting(request: DataModelDistRequest) -> DataFitResponse:
    results: List[FitItem] = []

    for item in request.Data:
        values = [rec.NumericValue for rec in item.Records]

        fit_result = fit_best_distribution(values)

        argument_list = params_to_string(
            fit_result["name"],
            fit_result["params"]
        )

        fit_item = FitItem(
            Station=item.Station,
            Time_Range=item.TimeRange,
            Distribution=fit_result["name"],
            ArgumentList=argument_list
        )

        results.append(fit_item)

    return DataFitResponse(DataFitResponse=results)