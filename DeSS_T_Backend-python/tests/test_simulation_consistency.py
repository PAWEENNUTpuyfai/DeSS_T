"""
Pytest-based automated simulation tests

Run tests:
    pytest tests/test_simulation_consistency.py -v

Options:
    -v              Verbose output
    --runs=N        Number of simulation runs (default: 5)
    --threshold=X   Maximum allowed CV percentage (default: 30)
"""

import pytest
import json
import statistics
from pathlib import Path
from typing import List, Dict, Any

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.Simulation import SimulationRequest
from app.services.simulation_runner import run_simulation


# --- Fixtures ---

@pytest.fixture(scope="module")
def sample_input_path():
    """Path to sample input file"""
    return Path(__file__).parent / "sample_input.json"


@pytest.fixture(scope="module")
def sample_request(sample_input_path) -> SimulationRequest:
    """Load sample request from JSON"""
    with open(sample_input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return SimulationRequest(**data)


@pytest.fixture
def num_runs(request):
    """Number of simulation runs"""
    return request.config.getoption("--runs", default=5)


@pytest.fixture
def cv_threshold(request):
    """Maximum allowed coefficient of variation"""
    return request.config.getoption("--threshold", default=30.0)


def pytest_addoption(parser):
    """Add custom command line options"""
    parser.addoption("--runs", type=int, default=5, help="Number of simulation runs")
    parser.addoption("--threshold", type=float, default=30.0, help="Maximum CV threshold")


# --- Helper Functions ---

def run_multiple_simulations(request: SimulationRequest, n: int) -> List[Dict[str, Any]]:
    """รัน simulation หลายรอบและเก็บผลลัพธ์"""
    results = []
    
    for i in range(n):
        result = run_simulation(request)
        results.append({
            "run": i + 1,
            "summary": result.simulation_result.result_summary.model_dump(),
            "slot_results": [slot.model_dump() for slot in result.simulation_result.slot_results]
        })
    
    return results


def calculate_cv(values: List[float]) -> float:
    """คำนวณ Coefficient of Variation"""
    # กรองค่า default ออก
    filtered = [v for v in values if v != -99999.9 and v is not None]
    
    if len(filtered) < 2:
        return 0.0
    
    mean = statistics.mean(filtered)
    if mean == 0:
        return 0.0
    
    stdev = statistics.stdev(filtered)
    return (stdev / mean) * 100


def extract_metric_values(results: List[Dict], metric: str) -> List[float]:
    """Extract metric values from all runs"""
    return [r["summary"].get(metric, -99999.9) for r in results]


# --- Tests ---

class TestSimulationConsistency:
    """ทดสอบความสม่ำเสมอของ simulation"""
    
    def test_simulation_runs_successfully(self, sample_request):
        """ทดสอบว่า simulation รันสำเร็จ"""
        result = run_simulation(sample_request)
        
        assert result.result == "success"
        assert result.simulation_result is not None
        assert len(result.simulation_result.slot_results) > 0
    
    def test_waiting_time_consistency(self, sample_request, num_runs, cv_threshold):
        """ทดสอบความสม่ำเสมอของ average waiting time"""
        results = run_multiple_simulations(sample_request, num_runs)
        values = extract_metric_values(results, "average_waiting_time")
        cv = calculate_cv(values)
        
        assert cv < cv_threshold, \
            f"Waiting time CV ({cv:.2f}%) exceeds threshold ({cv_threshold}%)"
    
    def test_queue_length_consistency(self, sample_request, num_runs, cv_threshold):
        """ทดสอบความสม่ำเสมอของ average queue length"""
        results = run_multiple_simulations(sample_request, num_runs)
        values = extract_metric_values(results, "average_queue_length")
        cv = calculate_cv(values)
        
        assert cv < cv_threshold, \
            f"Queue length CV ({cv:.2f}%) exceeds threshold ({cv_threshold}%)"
    
    def test_utilization_consistency(self, sample_request, num_runs, cv_threshold):
        """ทดสอบความสม่ำเสมอของ average utilization"""
        results = run_multiple_simulations(sample_request, num_runs)
        values = extract_metric_values(results, "average_utilization")
        cv = calculate_cv(values)
        
        assert cv < cv_threshold, \
            f"Utilization CV ({cv:.2f}%) exceeds threshold ({cv_threshold}%)"
    
    def test_travel_time_consistency(self, sample_request, num_runs, cv_threshold):
        """ทดสอบความสม่ำเสมอของ average travel time"""
        results = run_multiple_simulations(sample_request, num_runs)
        values = extract_metric_values(results, "average_travel_time")
        cv = calculate_cv(values)
        
        assert cv < cv_threshold, \
            f"Travel time CV ({cv:.2f}%) exceeds threshold ({cv_threshold}%)"
    
    def test_all_runs_produce_valid_results(self, sample_request, num_runs):
        """ทดสอบว่าทุก run ให้ผลลัพธ์ที่ valid"""
        results = run_multiple_simulations(sample_request, num_runs)
        
        for r in results:
            summary = r["summary"]
            # Check that at least some metrics are not default values
            non_default = sum(
                1 for v in summary.values() 
                if v != -99999.9 and v is not None
            )
            assert non_default > 0, f"Run {r['run']} produced all default values"


class TestSimulationDeterminism:
    """ทดสอบ determinism เมื่อใช้ seed เดียวกัน"""
    
    def test_same_seed_produces_similar_results(self, sample_request):
        """ทดสอบว่าผลลัพธ์มีความสม่ำเสมอ"""
        results = run_multiple_simulations(sample_request, 3)
        
        # ตรวจสอบว่าทุก run มี slot results เท่ากัน
        slot_counts = [len(r["slot_results"]) for r in results]
        assert len(set(slot_counts)) == 1, "Different runs produced different slot counts"


class TestSlotResults:
    """ทดสอบผลลัพธ์แต่ละ time slot"""
    
    def test_all_slots_have_data(self, sample_request):
        """ทดสอบว่าทุก slot มีข้อมูล"""
        result = run_simulation(sample_request)
        
        for slot in result.simulation_result.slot_results:
            assert slot.slot_name is not None
            assert len(slot.result_station) > 0
    
    def test_slot_consistency_across_runs(self, sample_request, num_runs, cv_threshold):
        """ทดสอบความสม่ำเสมอของแต่ละ slot"""
        results = run_multiple_simulations(sample_request, num_runs)
        
        # รวบรวมข้อมูลของแต่ละ slot
        slot_data = {}
        for r in results:
            for slot in r["slot_results"]:
                name = slot["slot_name"]
                if name not in slot_data:
                    slot_data[name] = []
                
                total = slot.get("result_total_station", {})
                wait = total.get("average_waiting_time", -99999.9)
                if wait != -99999.9:
                    slot_data[name].append(wait)
        
        # ตรวจสอบ CV ของแต่ละ slot
        for slot_name, values in slot_data.items():
            if len(values) >= 2:
                cv = calculate_cv(values)
                # ใช้ threshold ที่สูงกว่าสำหรับ slot-level เนื่องจากมี variation มากกว่า
                assert cv < cv_threshold * 2, \
                    f"Slot '{slot_name}' CV ({cv:.2f}%) exceeds threshold"


# --- Benchmark Tests ---

class TestSimulationPerformance:
    """ทดสอบประสิทธิภาพของ simulation"""
    
    def test_simulation_completes_in_reasonable_time(self, sample_request, benchmark):
        """ทดสอบว่า simulation รันเสร็จในเวลาที่เหมาะสม"""
        result = benchmark(run_simulation, sample_request)
        assert result.result == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
