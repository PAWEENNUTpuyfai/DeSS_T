from typing import List, Dict
from scipy import stats
import numpy as np
from app.schemas.calculation import DataFitResponse, FitItem, RecordDistRequest, DataModelDistRequest

# ------------------------------
# 1. Alighting Distribution Fitting (Logic คำนวณ)
# ------------------------------
def fit_alighting_distribution(values: List[float]) -> Dict:
    """
    Fit distributions specifically for Alighting counts (Discrete data).
    """
    # --- Data Cleaning & Guard ---
    if not values:
        return {"name": "Constant", "params": (0.0,)}

    int_values = []
    for v in values:
        # แก้ปัญหาถ้า v เป็น tuple หรือ string
        val = v[0] if isinstance(v, (tuple, list)) else v
        try:
            # ต้องแปลงเป็น float ก่อน round และแปลงเป็น int
            int_values.append(int(round(float(val))))
        except (ValueError, TypeError, IndexError):
            continue

    if not int_values:
        return {"name": "Constant", "params": (0.0,)}

    # Guard: กรณีข้อมูลเท่ากันหมด หรือมีค่าเดียว
    if len(int_values) == 1 or all(v == int_values[0] for v in int_values):
        return {
            "name": "Constant",
            "params": (float(int_values[0]),)
        }

    best_name = None
    best_params = None
    best_aic = float("inf")

    # ---------- Poisson ----------
    try:
        lam = np.mean(int_values)
        logL = np.sum(stats.poisson.logpmf(int_values, mu=lam))
        aic = 2 * 1 - 2 * logL
        
        best_aic = aic
        best_name = "Poisson"
        best_params = (lam,)
    except Exception:
        pass

    # ---------- Discrete Uniform (IntUniform) ----------
    try:
        low = min(int_values)
        high = max(int_values)
        logL = np.sum(stats.randint.logpmf(int_values, low, high + 1))
        aic = 2 * 2 - 2 * logL

        if aic < best_aic:
            best_aic = aic
            best_name = "IntUniform"
            best_params = (low, high)
    except Exception:
        pass

    # Fallback
    if best_name is None:
        return {"name": "Constant", "params": (float(np.mean(int_values)),)}

    return {
        "name": best_name,
        "params": best_params
    }

# ------------------------------
# 2. Convert params to text (Format การแสดงผล)
# ------------------------------
def alighting_params_to_string(dist_name: str, params) -> str:
    params = list(params)

    if dist_name == "Constant":
        return f"value={params[0]:.4f}"

    if dist_name == "Poisson":
        return f"lambda={params[0]:.4f}"

    if dist_name == "IntUniform":
        low, high = params
        return f"min={int(low)}, max={int(high)}"

    return str(params)

# ------------------------------
# 3. Main Function (ตัวที่ Route เรียกใช้)
# ------------------------------
def alighting_distribution_fitting(request: DataModelDistRequest) -> DataFitResponse:
    results: List[FitItem] = []

    for item in request.Data:
        # ดึง NumericValue จาก Records
        values = [rec.NumericValue for rec in item.Records]

        # เรียกฟังก์ชันคำนวณ
        fit_result = fit_alighting_distribution(values)

        # แปลงเป็น String
        argument_list = alighting_params_to_string(
            fit_result["name"],
            fit_result["params"]
        )

        # สร้าง Object FitItem ให้ตรงตาม Schema (Station, Time_Range, Distribution, ArgumentList)
        fit_item = FitItem(
            Station=item.Station,
            Time_Range=item.TimeRange,
            Distribution=fit_result["name"],
            ArgumentList=argument_list
        )

        results.append(fit_item)

    # ส่งกลับในรูปแบบ DataFitResponse(DataFitResponse=[...]) เพื่อแก้ Validation Error
    return DataFitResponse(DataFitResponse=results)