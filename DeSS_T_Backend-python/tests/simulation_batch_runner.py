"""
Simulation Batch Runner - รัน simulation หลายรอบและเก็บผลลัพธ์เพื่อเปรียบเทียบ

Usage:
    python -m tests.simulation_batch_runner --input sample_input.json --runs 10 --output results/

Options:
    --input     Path to JSON input file for simulation
    --runs      Number of simulation runs (default: 5)
    --output    Output directory for results (default: test_results/)
    --compare   Compare results and generate statistics report
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
import statistics

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.Simulation import SimulationRequest
from app.services.simulation_runner import run_simulation


class SimulationBatchRunner:
    """รัน simulation หลายรอบและเก็บผลลัพธ์"""
    
    def __init__(self, input_file: str, num_runs: int = 5, output_dir: str = "test_results"):
        self.input_file = input_file
        self.num_runs = num_runs
        self.output_dir = Path(output_dir)
        self.results: List[Dict[str, Any]] = []
        self.run_metadata: Dict[str, Any] = {}
        
    def load_input(self) -> SimulationRequest:
        """โหลด JSON input file"""
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return SimulationRequest(**data)
    
    def run_batch(self) -> List[Dict[str, Any]]:
        """รัน simulation หลายรอบ"""
        print(f"🚀 Starting batch simulation: {self.num_runs} runs")
        print(f"📂 Input file: {self.input_file}")
        print("-" * 50)
        
        request = self.load_input()
        
        for i in range(self.num_runs):
            print(f"▶️  Running simulation {i + 1}/{self.num_runs}...", end=" ")
            
            try:
                start_time = datetime.now()
                result = run_simulation(request)
                end_time = datetime.now()
                
                run_result = {
                    "run_number": i + 1,
                    "timestamp": start_time.isoformat(),
                    "duration_seconds": (end_time - start_time).total_seconds(),
                    "status": "success",
                    "summary": result.simulation_result.result_summary.model_dump(),
                    "slot_results": [slot.model_dump() for slot in result.simulation_result.slot_results],
                    "log_count": len(result.logs)
                }
                
                self.results.append(run_result)
                print(f"✅ Done ({run_result['duration_seconds']:.2f}s)")
                
            except Exception as e:
                run_result = {
                    "run_number": i + 1,
                    "timestamp": datetime.now().isoformat(),
                    "status": "failed",
                    "error": str(e)
                }
                self.results.append(run_result)
                print(f"❌ Failed: {e}")
        
        print("-" * 50)
        print(f"✅ Completed {len([r for r in self.results if r['status'] == 'success'])}/{self.num_runs} runs successfully")
        
        return self.results
    
    def save_results(self) -> str:
        """บันทึกผลลัพธ์ทั้งหมดเป็น JSON"""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = self.output_dir / f"batch_results_{timestamp}.json"
        
        output_data = {
            "metadata": {
                "input_file": str(self.input_file),
                "num_runs": self.num_runs,
                "timestamp": datetime.now().isoformat(),
                "successful_runs": len([r for r in self.results if r["status"] == "success"]),
                "failed_runs": len([r for r in self.results if r["status"] == "failed"])
            },
            "results": self.results,
            "comparison": self.generate_comparison()
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Results saved to: {output_file}")
        return str(output_file)
    
    def generate_comparison(self) -> Dict[str, Any]:
        """สร้างรายงานเปรียบเทียบผลลัพธ์แต่ละรอบ"""
        successful_results = [r for r in self.results if r["status"] == "success"]
        
        if len(successful_results) < 2:
            return {"message": "Need at least 2 successful runs for comparison"}
        
        # เก็บค่า summary metrics จากทุกรอบ
        metrics = {
            "average_waiting_time": [],
            "average_queue_length": [],
            "average_utilization": [],
            "average_travel_time": [],
            "average_travel_distance": []
        }
        
        for result in successful_results:
            summary = result["summary"]
            for key in metrics:
                value = summary.get(key, -99999.9)
                if value != -99999.9:  # ไม่รวมค่า default
                    metrics[key].append(value)
        
        # คำนวณ statistics สำหรับแต่ละ metric
        comparison = {
            "summary_metrics": {},
            "slot_comparison": {},
            "consistency_analysis": {}
        }
        
        for metric, values in metrics.items():
            if len(values) >= 2:
                comparison["summary_metrics"][metric] = {
                    "values": values,
                    "mean": statistics.mean(values),
                    "median": statistics.median(values),
                    "stdev": statistics.stdev(values) if len(values) > 1 else 0,
                    "min": min(values),
                    "max": max(values),
                    "range": max(values) - min(values),
                    "cv": (statistics.stdev(values) / statistics.mean(values) * 100) if statistics.mean(values) != 0 and len(values) > 1 else 0
                }
        
        # วิเคราะห์ความสม่ำเสมอ (Consistency Analysis)
        for metric, stats in comparison["summary_metrics"].items():
            cv = stats.get("cv", 0)
            if cv < 5:
                consistency = "Very Consistent"
            elif cv < 15:
                consistency = "Consistent"
            elif cv < 30:
                consistency = "Moderately Consistent"
            else:
                consistency = "High Variability"
            
            comparison["consistency_analysis"][metric] = {
                "coefficient_of_variation": cv,
                "assessment": consistency
            }
        
        # เปรียบเทียบ slot results
        slot_data = {}
        for result in successful_results:
            for slot in result.get("slot_results", []):
                slot_name = slot["slot_name"]
                if slot_name not in slot_data:
                    slot_data[slot_name] = {
                        "waiting_times": [],
                        "queue_lengths": []
                    }
                
                total_station = slot.get("result_total_station", {})
                wait = total_station.get("average_waiting_time", -99999.9)
                queue = total_station.get("average_queue_length", -99999.9)
                
                if wait != -99999.9:
                    slot_data[slot_name]["waiting_times"].append(wait)
                if queue != -99999.9:
                    slot_data[slot_name]["queue_lengths"].append(queue)
        
        for slot_name, data in slot_data.items():
            comparison["slot_comparison"][slot_name] = {}
            
            if len(data["waiting_times"]) >= 2:
                comparison["slot_comparison"][slot_name]["waiting_time"] = {
                    "mean": statistics.mean(data["waiting_times"]),
                    "stdev": statistics.stdev(data["waiting_times"]),
                    "min": min(data["waiting_times"]),
                    "max": max(data["waiting_times"])
                }
            
            if len(data["queue_lengths"]) >= 2:
                comparison["slot_comparison"][slot_name]["queue_length"] = {
                    "mean": statistics.mean(data["queue_lengths"]),
                    "stdev": statistics.stdev(data["queue_lengths"]),
                    "min": min(data["queue_lengths"]),
                    "max": max(data["queue_lengths"])
                }
        
        return comparison
    
    def print_comparison_report(self):
        """แสดงรายงานเปรียบเทียบแบบสรุป"""
        comparison = self.generate_comparison()
        
        if "message" in comparison:
            print(f"\n⚠️  {comparison['message']}")
            return
        
        print("\n" + "=" * 60)
        print("📊 COMPARISON REPORT")
        print("=" * 60)
        
        print("\n📈 Summary Metrics Statistics:")
        print("-" * 40)
        
        for metric, stats in comparison.get("summary_metrics", {}).items():
            print(f"\n  {metric}:")
            print(f"    Mean:   {stats['mean']:.4f}")
            print(f"    Median: {stats['median']:.4f}")
            print(f"    StDev:  {stats['stdev']:.4f}")
            print(f"    Range:  [{stats['min']:.4f} - {stats['max']:.4f}]")
            print(f"    CV:     {stats['cv']:.2f}%")
        
        print("\n\n🔍 Consistency Analysis:")
        print("-" * 40)
        
        for metric, analysis in comparison.get("consistency_analysis", {}).items():
            print(f"  {metric}: {analysis['assessment']} (CV={analysis['coefficient_of_variation']:.2f}%)")
        
        print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Run simulation multiple times and compare results"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to JSON input file for simulation"
    )
    parser.add_argument(
        "--runs", "-r",
        type=int,
        default=5,
        help="Number of simulation runs (default: 5)"
    )
    parser.add_argument(
        "--output", "-o",
        default="test_results",
        help="Output directory for results (default: test_results/)"
    )
    
    args = parser.parse_args()
    
    runner = SimulationBatchRunner(
        input_file=args.input,
        num_runs=args.runs,
        output_dir=args.output
    )
    
    # รัน simulation หลายรอบ
    runner.run_batch()
    
    # แสดงรายงานเปรียบเทียบ
    runner.print_comparison_report()
    
    # บันทึกผลลัพธ์
    runner.save_results()


if __name__ == "__main__":
    main()
