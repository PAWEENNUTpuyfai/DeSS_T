"""
Accuracy Batch Analyzer - รัน simulation หลายรอบและวิเคราะห์ accuracy

Usage:
    python -m tests.accuracy_batch_analyzer --input tests/sample_input.json --actual tests/sample_actual_values.json --runs 10

โปรแกรมจะ:
1. รัน simulation N รอบ
2. วิเคราะห์ accuracy แต่ละรอบ
3. Aggregate และแสดงสถิติ (mean, stdev, min, max)
"""

import argparse
import json
import statistics
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.Simulation import SimulationRequest
from app.services.simulation_runner import run_simulation
from tests.accuracy_analyzer import AccuracyAnalyzer, load_actual_values


class AccuracyBatchAnalyzer:
    """รัน simulation หลายรอบและวิเคราะห์ accuracy แต่ละรอบ"""
    
    def __init__(
        self,
        input_file: str,
        actual_waiting_time: float,
        actual_utilization: float,
        num_runs: int = 10,
        output_dir: str = "test_results"
    ):
        self.input_file = input_file
        self.actual_waiting_time = actual_waiting_time
        self.actual_utilization = actual_utilization
        self.num_runs = num_runs
        self.output_dir = Path(output_dir)
        self.run_results: List[Dict[str, Any]] = []
    
    def load_input(self) -> SimulationRequest:
        """โหลด JSON input file"""
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return SimulationRequest(**data)
    
    def run_batch(self) -> List[Dict[str, Any]]:
        """รัน simulation หลายรอบและวิเคราะห์ accuracy"""
        print(f"🚀 Starting accuracy batch analysis: {self.num_runs} runs")
        print(f"📂 Input file: {self.input_file}")
        print(f"📊 Actual Values:")
        print(f"   • Waiting Time: {self.actual_waiting_time:.2f} min")
        print(f"   • Utilization: {self.actual_utilization:.2f}")
        print("-" * 70)
        
        request = self.load_input()
        
        for i in range(self.num_runs):
            print(f"▶️  Run {i + 1}/{self.num_runs}...", end=" ")
            
            try:
                start_time = datetime.now()
                result = run_simulation(request)
                end_time = datetime.now()
                
                # วิเคราะห์ accuracy
                analyzer = AccuracyAnalyzer(
                    actual_waiting_time=self.actual_waiting_time,
                    actual_utilization=self.actual_utilization
                )
                
                analysis = analyzer.analyze_simulation(result)
                
                run_result = {
                    "run_number": i + 1,
                    "timestamp": start_time.isoformat(),
                    "duration_seconds": (end_time - start_time).total_seconds(),
                    "status": "success",
                    "analysis": analysis
                }
                
                # สกัดค่าสำหรับสรุป
                if "waiting_time" in analysis["summary"]:
                    wt = analysis["summary"]["waiting_time"]
                    run_result["waiting_time_accuracy"] = wt["accuracy"]
                    run_result["waiting_time_error"] = wt["relative_error"]
                
                if "utilization" in analysis["summary"]:
                    util = analysis["summary"]["utilization"]
                    run_result["utilization_accuracy"] = util["accuracy"]
                    run_result["utilization_error"] = util["relative_error"]
                
                self.run_results.append(run_result)
                
                print(f"✅ Done ({run_result['duration_seconds']:.2f}s)")
                
            except Exception as e:
                run_result = {
                    "run_number": i + 1,
                    "timestamp": datetime.now().isoformat(),
                    "status": "failed",
                    "error": str(e)
                }
                self.run_results.append(run_result)
                print(f"❌ Failed: {e}")
        
        print("-" * 70)
        print(f"✅ Completed {len([r for r in self.run_results if r['status'] == 'success'])}/{self.num_runs} runs successfully\n")
        
        return self.run_results
    
    def calculate_statistics(self) -> Dict[str, Any]:
        """คำนวณสถิติรวมจากทั้ง batch"""
        successful_runs = [r for r in self.run_results if r["status"] == "success"]
        
        stats = {
            "total_runs": self.num_runs,
            "successful_runs": len(successful_runs),
            "failed_runs": self.num_runs - len(successful_runs),
            "waiting_time": {},
            "utilization": {}
        }
        
        if len(successful_runs) == 0:
            return stats
        
        # สถิติ Waiting Time
        wt_accuracies = [r["waiting_time_accuracy"] for r in successful_runs if "waiting_time_accuracy" in r]
        wt_errors = [r["waiting_time_error"] for r in successful_runs if "waiting_time_error" in r]
        
        if wt_accuracies:
            stats["waiting_time"] = {
                "accuracy_mean": round(statistics.mean(wt_accuracies), 2),
                "accuracy_median": round(statistics.median(wt_accuracies), 2),
                "accuracy_stdev": round(statistics.stdev(wt_accuracies), 2) if len(wt_accuracies) > 1 else 0,
                "accuracy_min": round(min(wt_accuracies), 2),
                "accuracy_max": round(max(wt_accuracies), 2),
                "error_mean": round(statistics.mean(wt_errors), 2),
                "error_stdev": round(statistics.stdev(wt_errors), 2) if len(wt_errors) > 1 else 0,
                "count": len(wt_accuracies)
            }
        
        # สถิติ Utilization
        util_accuracies = [r["utilization_accuracy"] for r in successful_runs if "utilization_accuracy" in r]
        util_errors = [r["utilization_error"] for r in successful_runs if "utilization_error" in r]
        
        if util_accuracies:
            stats["utilization"] = {
                "accuracy_mean": round(statistics.mean(util_accuracies), 2),
                "accuracy_median": round(statistics.median(util_accuracies), 2),
                "accuracy_stdev": round(statistics.stdev(util_accuracies), 2) if len(util_accuracies) > 1 else 0,
                "accuracy_min": round(min(util_accuracies), 2),
                "accuracy_max": round(max(util_accuracies), 2),
                "error_mean": round(statistics.mean(util_errors), 2),
                "error_stdev": round(statistics.stdev(util_errors), 2) if len(util_errors) > 1 else 0,
                "count": len(util_accuracies)
            }
        
        return stats
    
    def print_batch_report(self, stats: Dict[str, Any]):
        """พิมพ์รายงานรวมจาก batch"""
        print("\n" + "=" * 70)
        print("📊 ACCURACY BATCH ANALYSIS REPORT")
        print("=" * 70)
        
        print(f"\n📈 Batch Summary:")
        print(f"   Total Runs: {stats['total_runs']}")
        print(f"   Successful: {stats['successful_runs']}")
        print(f"   Failed: {stats['failed_runs']}")
        
        # Waiting Time Statistics
        if stats["waiting_time"]:
            wt = stats["waiting_time"]
            print(f"\n🕐 Waiting Time Accuracy (across {wt['count']} runs):")
            print(f"   ✓ Mean:    {wt['accuracy_mean']:.2f}%")
            print(f"   📊 Median: {wt['accuracy_median']:.2f}%")
            print(f"   📉 StDev:  {wt['accuracy_stdev']:.2f}%")
            print(f"   📊 Range:  {wt['accuracy_min']:.2f}% ~ {wt['accuracy_max']:.2f}%")
            print(f"   Error Mean: {wt['error_mean']:.2f}%")
            print(f"   Error StDev: {wt['error_stdev']:.2f}%")
        
        # Utilization Statistics
        if stats["utilization"]:
            util = stats["utilization"]
            print(f"\n📈 Utilization Accuracy (across {util['count']} runs):")
            print(f"   ✓ Mean:    {util['accuracy_mean']:.2f}%")
            print(f"   📊 Median: {util['accuracy_median']:.2f}%")
            print(f"   📉 StDev:  {util['accuracy_stdev']:.2f}%")
            print(f"   📊 Range:  {util['accuracy_min']:.2f}% ~ {util['accuracy_max']:.2f}%")
            print(f"   Error Mean: {util['error_mean']:.2f}%")
            print(f"   Error StDev: {util['error_stdev']:.2f}%")
        
        # Assessment
        print(f"\n✅ Assessment:")
        print("-" * 70)
        
        if stats["waiting_time"]:
            wt_accuracy = stats["waiting_time"]["accuracy_mean"]
            if wt_accuracy >= 95:
                status = "Excellent"
            elif wt_accuracy >= 90:
                status = "Very Good"
            elif wt_accuracy >= 85:
                status = "Good"
            elif wt_accuracy >= 75:
                status = "Acceptable"
            else:
                status = "Poor"
            print(f"   Waiting Time: {status} ({wt_accuracy:.2f}% accuracy)")
        
        if stats["utilization"]:
            util_accuracy = stats["utilization"]["accuracy_mean"]
            if util_accuracy >= 95:
                status = "Excellent"
            elif util_accuracy >= 90:
                status = "Very Good"
            elif util_accuracy >= 85:
                status = "Good"
            elif util_accuracy >= 75:
                status = "Acceptable"
            else:
                status = "Poor"
            print(f"   Utilization: {status} ({util_accuracy:.2f}% accuracy)")
        
        print("\n" + "=" * 70)
    
    def print_detailed_runs(self):
        """พิมพ์รายละเอียดแต่ละรอบ"""
        print("\n" + "=" * 70)
        print("📋 DETAILED RUN RESULTS")
        print("=" * 70)
        
        for result in self.run_results:
            print(f"\nRun {result['run_number']}: {result['status'].upper()}", end="")
            
            if result['status'] == 'success':
                acc_wt = result.get('waiting_time_accuracy', 'N/A')
                err_wt = result.get('waiting_time_error', 'N/A')
                acc_util = result.get('utilization_accuracy', 'N/A')
                err_util = result.get('utilization_error', 'N/A')
                
                print(f" | Duration: {result['duration_seconds']:.2f}s")
                print(f"   🕐 Waiting Time: {acc_wt:.2f}% accuracy (error: {err_wt:.2f}%)")
                print(f"   📈 Utilization:  {acc_util:.2f}% accuracy (error: {err_util:.2f}%)")
            else:
                print(f" | Error: {result.get('error', 'Unknown error')}")
        
        print("\n" + "=" * 70)
    
    def save_results(self) -> str:
        """บันทึกผลลัพธ์ทั้งหมดเป็น JSON"""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = self.output_dir / f"accuracy_batch_{timestamp}.json"
        
        # สรุป run results
        summary_results = []
        for r in self.run_results:
            if r['status'] == 'success':
                summary_results.append({
                    "run_number": r["run_number"],
                    "waiting_time_accuracy": r.get("waiting_time_accuracy"),
                    "waiting_time_error": r.get("waiting_time_error"),
                    "utilization_accuracy": r.get("utilization_accuracy"),
                    "utilization_error": r.get("utilization_error"),
                    "duration_seconds": r["duration_seconds"]
                })
            else:
                summary_results.append({
                    "run_number": r["run_number"],
                    "status": "failed",
                    "error": r.get("error")
                })
        
        stats = self.calculate_statistics()
        
        output_data = {
            "metadata": {
                "input_file": str(self.input_file),
                "num_runs": self.num_runs,
                "timestamp": datetime.now().isoformat(),
                "actual_waiting_time": self.actual_waiting_time,
                "actual_utilization": self.actual_utilization
            },
            "statistics": stats,
            "runs": summary_results
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        return str(output_file)


def main():
    parser = argparse.ArgumentParser(
        description="รัน simulation หลายรอบและวิเคราะห์ accuracy"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to simulation input JSON file"
    )
    parser.add_argument(
        "--actual", "-a",
        required=True,
        help="Path to actual values JSON file"
    )
    parser.add_argument(
        "--runs", "-r",
        type=int,
        default=10,
        help="Number of simulation runs (default: 10)"
    )
    parser.add_argument(
        "--output", "-o",
        default="test_results",
        help="Output directory for results (default: test_results)"
    )
    parser.add_argument(
        "--detailed",
        action="store_true",
        help="Show detailed results for each run"
    )
    
    args = parser.parse_args()
    
    # โหลดค่าจริง
    print(f"📂 Loading actual values from: {args.actual}")
    actual_values = load_actual_values(args.actual)
    
    # สร้าง batch analyzer
    analyzer = AccuracyBatchAnalyzer(
        input_file=args.input,
        actual_waiting_time=actual_values.get("waiting_time"),
        actual_utilization=actual_values.get("utilization"),
        num_runs=args.runs,
        output_dir=args.output
    )
    
    # รัน batch
    analyzer.run_batch()
    
    # คำนวณสถิติ
    stats = analyzer.calculate_statistics()
    
    # พิมพ์รายงาน
    analyzer.print_batch_report(stats)
    
    if args.detailed:
        analyzer.print_detailed_runs()
    
    # บันทึกผลลัพธ์
    output_file = analyzer.save_results()
    print(f"\n💾 Results saved to: {output_file}")


if __name__ == "__main__":
    main()
