from app.services.simulation_mapper import build_simulation_config
from app.services.simulation_engine import SimulationEngine
import threading
import time
from typing import Optional

class SimulationTimeoutError(Exception):
    """Exception raised when simulation exceeds timeout"""
    pass

def run_simulation(req, timeout: int = 300):
    """
    Run simulation with timeout protection
    
    Args:
        req: Simulation request object
        timeout: Maximum execution time in seconds (default 300s = 5 min)
    
    Returns:
        SimulationResponse object
    
    Raises:
        SimulationTimeoutError: If simulation exceeds timeout duration
    """
    result_container = {"result": None, "error": None}
    
    def simulation_worker():
        try:
            config = build_simulation_config(req)
            engine = SimulationEngine(config)
            result = engine.run()
            result_container["result"] = result
        except Exception as e:
            result_container["error"] = e
    
    # สร้าง thread สำหรับ simulation
    thread = threading.Thread(target=simulation_worker, daemon=False)
    thread.start()
    
    # รอ thread ให้เสร็จหรือจนกว่า timeout
    thread.join(timeout=timeout)
    
    # ตรวจสอบว่า thread ยังทำงานอยู่
    if thread.is_alive():
        raise SimulationTimeoutError(
            f"Simulation did not complete within {timeout} seconds. "
            f"Consider increasing SIMULATION_TIMEOUT environment variable."
        )
    
    # ตรวจสอบ error
    if result_container["error"] is not None:
        raise result_container["error"]
    
    return result_container["result"]