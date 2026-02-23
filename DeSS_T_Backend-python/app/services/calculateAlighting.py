from typing import List, Dict
from scipy import stats
import numpy as np
from app.schemas.calculation import DataFitResponse, FitItem, RecordDistRequest, DataModelDistRequest

# ------------------------------
# 1. Alighting Distribution Fitting
# ------------------------------
def fit_alighting_distribution(values: List[float]) -> Dict:
    """
    Fit distributions specifically for Alighting counts (Discrete data).
    Evaluates Poisson and Discrete Uniform, choosing the best by lowest AIC.
    """
    # Guard: ไม่มีข้อมูลเลย
    if not values:
        return {"name": "Constant", "params": (0.0,)}

    # ปัดเศษและแปลงเป็นจำนวนเต็ม (เพราะคนลงรถต้องเป็นจำนวนเต็ม แม้หน้าบ้านส่งมาเป็น 5.00)
    int_values = [int(round(v)) for v in values]

    # Guard: ข้อมูลมีแค่ตัวเดียว หรือ มีค่าเท่ากันทุกตัว (Variance = 0)
    if len(int_values) == 1 or all(v == int_values[0] for v in int_values):
        return {
            "name": "Constant",
            "params": (float(int_values[0]),)
        }

    best_name = None
    best_params = None
    best_aic = float("inf")

    # ---------- 1. Poisson Distribution ----------
    # เหมาะที่สุดสำหรับ "จำนวนเหตุการณ์" ที่เกิดขึ้น (เช่น จำนวนคนลงรถที่สถานี)
    try:
        lam = np.mean(int_values)
        # logpmf รับค่าเป็นจำนวนเต็ม
        logL_poisson = np.sum(stats.poisson.logpmf(int_values, mu=lam))
        k_poisson = 1 # parameter เดียวคือ lambda
        aic_poisson = 2 * k_poisson - 2 * logL_poisson

        if aic_poisson < best_aic:
            best_aic = aic_poisson
            best_name = "Poisson"
            best_params = (lam,)
    except Exception:
        pass

    # ---------- 2. Discrete Uniform (IntUniform) ----------
    # เผื่อกรณีที่คนลงรถสุ่มแบบกระจายเท่าๆ กัน ไม่กระจุกตัวที่ค่าเฉลี่ย
    try:
        low = min(int_values)
        high = max(int_values)
        
        # stats.randint ใน scipy ค่า high จะเป็น exclusive ดังนั้นต้อง +1
        logL_uniform = np.sum(stats.randint.logpmf(int_values, low, high + 1))
        k_uniform = 2 # parameter คือ low, high
        aic_uniform = 2 * k_uniform - 2 * logL_uniform

        if aic_uniform < best_aic:
            best_aic = aic_uniform
            best_name = "IntUniform"
            best_params = (low, high)
    except Exception:
        pass

    # Fallback กรณีคำนวณ Error ทั้งหมด (ซึ่งเกิดได้ยากมากในข้อมูลแจงนับ)
    if best_name is None:
        return {"name": "Constant", "params": (float(np.mean(int_values)),)}

    return {
        "name": best_name,
        "params": best_params
    }


# ------------------------------
# 2. Convert params to text
# ------------------------------
def alighting_params_to_string(dist_name: str, params) -> str:
    params = list(params)

    if dist_name == "Constant":
        return f"value={params[0]:.4f}"

    if dist_name == "Poisson":
        (lam,) = params
        return f"lambda={lam:.4f}"

    if dist_name == "IntUniform":
        low, high = params
        # แสดงผลเป็นจำนวนเต็ม เพราะเป็นข้อมูลนับคน
        return f"min={int(low)}, max={int(high)}"

    return str(params)


# ------------------------------
# 3. Main Function สำหรับ Route นี้
# ------------------------------
def alighting_distribution_fitting(request: DataModelDistRequest) -> DataFitResponse:
    results: List[FitItem] = []

    for item in request.Data:
        # รับค่า NumericValue (เช่น 5.00, 4.00) มาเป็น List[float]
        values = [rec.NumericValue for rec in item.Records]

        # โยนเข้าฟังก์ชันที่เขียนมาเพื่อคนลงรถโดยเฉพาะ
        fit_result = fit_alighting_distribution(values)

        argument_list = alighting_params_to_string(
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