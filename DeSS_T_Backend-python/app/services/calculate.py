from typing import List, Dict
from scipy import stats
import numpy as np
from app.schemas.calculation import DataFitResponse, FitItem , RecordDistRequest , DataModelDistRequest


# def power_number(n: int) -> int:
#     return (n * n)  # ยกกำลัง 2



# ------------------------------
# Distribution fitting function
# ------------------------------
def fit_best_distribution(values: List[float]) -> Dict:
    """
    Fit multiple distributions and choose the best by lowest AIC.
    """

    # ---------- Guard: all values are zero ----------
    if values and all(v == 0 for v in values):
        return {
            "name": "No Arrival",  # เปลี่ยนชื่อเพื่อให้จัดการง่ายขึ้น
            "params": (float('inf'),) # หรือ 999999.0
        }

    # กำหนดค่าเฉลี่ยของข้อมูลเพื่อใช้เป็นตัวอ้างอิง
    avg_val = np.mean(values) if values else 0

    distributions = {
        "Exponential": stats.expon,
        "Weibull": stats.weibull_min,
        "Gamma": stats.gamma,
        "Uniform": stats.uniform,
    }

    best_name = "Exponential" # เริ่มต้นด้วย Exponential มักจะปลอดภัยสุด
    best_params = stats.expon.fit(values)
    best_aic = float("inf")

    for name, dist in distributions.items():
        try:
            params = dist.fit(values)
            
            # --- กฎเหล็ก: ถ้า Weibull/Gamma หางยาวเกินไป (shape < 0.2) ให้ข้ามไป ---
            if name in ["Weibull", "Gamma"]:
                shape = params[0]
                if shape < 0.2: # ค่า 0.0193 ของคุณจะติดลบที่นี่และถูกข้ามไป
                    continue 

            logL = np.sum(dist.logpdf(values, *params))
            # --- แก้ไขจุดนี้: ป้องกัน Extreme Parameters ---
            if name == "Weibull":
                shape, loc, scale = params
                # ถ้า shape ต่ำกว่า 0.1 มันจะเริ่มสุ่มได้เลขระดับ 1,000+ บ่อยครั้ง
                # เราสามารถ "ลงโทษ" (Penalty) AIC ของมันเพื่อให้ระบบไปเลือกตัวอื่นแทน
                if shape < 0.2: 
                    continue # ไม่ใช้ Weibull ถ้าหางมันยาวเกินไป

            if name == "Gamma":
                shape, loc, scale = params
                if shape < 0.2:
                    continue

            logL = np.sum(dist.logpdf(values, *params))
            k = len(params)
            aic = 2 * k - 2 * logL

            if aic < best_aic:
                best_aic = aic
                best_name = name
                best_params = params

        except Exception:
            continue

    # ---------- Poisson ----------
    try:
        lam = np.mean(values)
        logL = np.sum(stats.poisson.logpmf(values, mu=lam))
        aic = 2 * 1 - 2 * logL

        if aic < best_aic:
            best_name = "Poisson"
            best_params = (lam,)

    except Exception:
        pass

    return {
        "name": best_name,
        "params": best_params
    }



# ------------------------------
# Convert params to text
# ------------------------------
def params_to_string(dist_name: str, params) -> str:
    params = list(params)

    if dist_name == "No Arrival":
        # ส่งค่าที่สูงมากๆ ไปยัง Simulation เพื่อไม่ให้เกิดการสร้าง Passenger
        return f"value=999999.0"
    
    if dist_name == "Constant":
        return f"value={params[0]:.4f}"

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

    if dist_name == "Uniform":
        loc, scale = params
        return f"min={loc:.4f}, max={(loc + scale):.4f}"

    if dist_name == "Poisson":
        (lam,) = params
        return f"lambda={lam:.4f}"

    return str(params)



# ------------------------------
# Main Function
# ------------------------------
def distribution_fitting(request: DataModelDistRequest) -> DataFitResponse:
    results: List[FitItem] = []

    for item in request.Data:
        raw_values = [rec.NumericValue for rec in item.Records]
        
        # --- กรอง Outliers (ใช้ Percentile 95 หรือ 99) ---
        # ตัดค่าที่โด่งเกินไปออกก่อนฟิต เพื่อให้ได้ Distribution ที่เป็นตัวแทนของคนส่วนใหญ่
        if len(raw_values) > 10:
            upper_limit = np.percentile(raw_values, 99) 
            values = [v for v in raw_values if v <= upper_limit]
        else:
            values = raw_values

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