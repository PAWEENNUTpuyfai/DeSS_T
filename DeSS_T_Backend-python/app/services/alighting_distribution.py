from typing import List, Dict
from scipy import stats
import numpy as np
import warnings
from app.schemas.calculation import DataFitResponse, FitItem, DataModelDistRequest

# Suppress scipy warnings during distribution fitting
warnings.filterwarnings('ignore', category=RuntimeWarning, module='scipy')

# ------------------------------
# Distribution fitting function
# ------------------------------
def fit_best_distribution_alighting(values: List[float]) -> Dict:
    """
    Fit distributions specifically optimized for alighting (discrete/count data).
    Handles edge cases to avoid scipy numerical warnings.
    """
    if not values:
        return {"name": "No Alighting", "params": (0,)}

    data = np.array(values, dtype=float)
    n = len(data)
    
    # 1. กรณีข้อมูลเป็น 0 ทั้งหมด หรือเกือบทั้งหมด
    if np.all(data == 0) or (np.mean(data) < 0.01):
        return {"name": "Constant", "params": (0.0,)}

    # 2. กรณีข้อมูลมีค่าเดียวซ้ำๆ (เช่น ทุกคนลง 5 คนเสมอ)
    if np.unique(data).size == 1:
        return {"name": "Constant", "params": (data[0],)}

    best_name = None
    best_params = None
    best_aic = float("inf")

    # --- Group A: Discrete Distributions (Priority for Alighting) ---
    # Poisson (mu = mean)
    lam = np.mean(data)
    logL_poisson = np.sum(stats.poisson.logpmf(data, mu=lam))
    aic_poisson = 2 * 1 - 2 * logL_poisson
    
    best_name, best_params, best_aic = "Poisson", (lam,), aic_poisson

    # --- Group B: Continuous Distributions (For high volume/spread) ---
    # เราจะลอง Continuous เฉพาะเมื่อข้อมูลมีค่าหลากหลายพอ
    # Check for sufficient variance before trying continuous distributions
    data_std = np.std(data)
    data_mean = np.mean(data)
    
    # Only fit continuous distributions if variance is sufficient (CV > 10%)
    if np.unique(data).size > 3 and data_std > 0 and (data_std / max(data_mean, 1e-10)) > 0.1:
        cont_distributions = {
            "Exponential": stats.expon,
            "Gamma": stats.gamma,
            "Normal": stats.norm,
            "Uniform": stats.uniform
        }

        for name, dist in cont_distributions.items():
            try:
                params = dist.fit(data)
                
                # Validate parameters are sensible (not NaN or infinite)
                if any(np.isnan(params)) or any(np.isinf(params)):
                    continue
                    
                logL = np.sum(dist.logpdf(data, *params))
                
                # Check if logL is valid
                if np.isnan(logL) or np.isinf(logL):
                    continue
                    
                k = len(params)
                aic = 2 * k - 2 * logL
                
                if aic < best_aic and not np.isnan(aic) and not np.isinf(aic):
                    best_aic = aic
                    best_name = name
                    best_params = params
            except Exception:
                # Silently skip distributions that fail to fit
                continue

    return {
        "name": best_name,
        "params": best_params
    }

# ------------------------------
# Convert params to text (Updated for Simulation engine)
# ------------------------------
def params_to_string_alighting(dist_name: str, params) -> str:
    if dist_name == "No Alighting" or dist_name == "Constant":
        return f"value={params[0]:.4f}"

    if dist_name == "Poisson":
        return f"lambda={params[0]:.4f}"

    if dist_name == "Exponential":
        loc, scale = params
        return f"rate={1.0/scale:.4f}, loc={loc:.4f}"

    if dist_name == "Normal":
        mean, std = params
        return f"mean={mean:.4f}, std={std:.4f}"

    if dist_name == "Gamma":
        shape, loc, scale = params
        return f"shape={shape:.4f}, loc={loc:.4f}, scale={scale:.4f}"

    if dist_name == "Uniform":
        loc, scale = params
        return f"min={loc:.4f}, max={(loc + scale):.4f}"

    return f"params={str(params)}"

# ------------------------------
# Main Function
# ------------------------------
def distribution_fitting_alighting(request: DataModelDistRequest) -> DataFitResponse:
    results: List[FitItem] = []

    for item in request.Data:
        values = [rec.NumericValue for rec in item.Records if rec.NumericValue is not None]
        
        # Fit logic
        fit_result = fit_best_distribution_alighting(values)
        
        # Format string
        argument_list = params_to_string_alighting(
            fit_result["name"],
            fit_result["params"]
        )

        results.append(FitItem(
            Station=item.Station,
            Time_Range=item.TimeRange,
            Distribution=fit_result["name"],
            ArgumentList=argument_list
        ))

    return DataFitResponse(DataFitResponse=results)