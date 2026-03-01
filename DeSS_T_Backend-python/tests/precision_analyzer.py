"""
Simulation Precision Analyzer - วิเคราะห์ความแม่นยำ (Precision) ของผลลัพธ์จากหลายรอบ

Usage:
    python -m tests.precision_analyzer --input tests/sample_input.json --runs 10

วัด precision โดยดูว่าค่าจากแต่ละรอบตรงกันกี่ตำแหน่งทศนิยม
"""

import argparse
import json
import math
import statistics
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.Simulation import SimulationRequest
from app.services.simulation_runner import run_simulation


def calculate_precision(values: List[float]) -> Dict[str, Any]:
    """
    คำนวณ precision ของค่าหลายๆ ค่า
    
    Returns:
        - decimal_precision: จำนวนตำแหน่งทศนิยมที่ตรงกันทุกค่า
        - significant_figures: จำนวน significant figures ที่เชื่อถือได้
        - agreement_ratio: สัดส่วนที่ค่าตรงกัน (0-1)
    """
    # กรองค่า default ออก
    filtered = [v for v in values if v != -99999.9 and v is not None and not math.isnan(v)]
    
    if len(filtered) < 2:
        return {
            "decimal_precision": None,
            "significant_figures": None,
            "agreement_ratio": None,
            "all_values": filtered,
            "note": "Not enough data"
        }
    
    # หา decimal precision - ตรงกันกี่ตำแหน่งทศนิยม
    decimal_precision = find_decimal_agreement(filtered)
    
    # หา significant figures ที่เชื่อถือได้
    sig_figs = find_significant_figures(filtered)
    
    # หา agreement ratio
    mean = statistics.mean(filtered)
    if mean != 0:
        relative_errors = [abs(v - mean) / abs(mean) for v in filtered]
        avg_error = statistics.mean(relative_errors)
        agreement = 1 - min(avg_error, 1)
    else:
        agreement = 1.0 if all(v == 0 for v in filtered) else 0.0
    
    return {
        "decimal_precision": decimal_precision,
        "significant_figures": sig_figs,
        "agreement_ratio": round(agreement, 4),
        "all_values": filtered,
        "mean": round(mean, 6),
        "stdev": round(statistics.stdev(filtered), 6) if len(filtered) > 1 else 0
    }


def find_decimal_agreement(values: List[float]) -> int:
    """หาว่าค่าตรงกันถึงทศนิยมตำแหน่งที่เท่าไร"""
    if not values:
        return 0
    
    for precision in range(10, -1, -1):
        rounded = [round(v, precision) for v in values]
        if len(set(rounded)) == 1:
            return precision
    
    # ถ้าไม่ตรงกันเลยแม้แต่จำนวนเต็ม ให้หาว่ามี order of magnitude เดียวกันไหม
    if values:
        orders = [int(math.log10(abs(v))) if v != 0 else 0 for v in values]
        if len(set(orders)) == 1:
            return -1  # same order of magnitude
    
    return -2  # ไม่ตรงกันเลย


def find_significant_figures(values: List[float]) -> int:
    """หา significant figures ที่เชื่อถือได้"""
    if len(values) < 2:
        return 0
    
    mean = statistics.mean(values)
    stdev = statistics.stdev(values)
    
    if mean == 0:
        return 0
    
    # คำนวณจากอัตราส่วน stdev/mean
    cv = abs(stdev / mean)
    
    if cv == 0:
        return 10  # ค่าเหมือนกันหมด
    
    # significant figures ≈ -log10(cv)
    sig_figs = max(0, int(-math.log10(cv)))
    
    return min(sig_figs, 10)


class PrecisionAnalyzer:
    """วิเคราะห์ความแม่นยำของ simulation"""
    
    def __init__(self, input_file: str, num_runs: int = 5):
        self.input_file = input_file
        self.num_runs = num_runs
        self.results: List[Dict[str, Any]] = []
    
    def load_input(self) -> SimulationRequest:
        input_path = Path(self.input_file)
        if not input_path.exists():
            print(f"❌ Error: Input file not found: {self.input_file}")
            print(f"   Please provide a valid JSON input file.")
            print(f"   Example: python -m tests.precision_analyzer -i tests/sample_input.json -r 10")
            sys.exit(1)
        
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return SimulationRequest(**data)
    
    def run_simulations(self):
        """รัน simulation หลายรอบ"""
        print(f"🔬 Running {self.num_runs} simulations for precision analysis...")
        print("-" * 50)
        
        request = self.load_input()
        
        for i in range(self.num_runs):
            print(f"  Run {i+1}/{self.num_runs}...", end=" ")
            try:
                result = run_simulation(request)
                self.results.append({
                    "run": i + 1,
                    "status": "success",
                    "summary": result.simulation_result.result_summary.model_dump(),
                    "slot_results": [s.model_dump() for s in result.simulation_result.slot_results]
                })
                print("✓")
            except Exception as e:
                self.results.append({"run": i + 1, "status": "failed", "error": str(e)})
                print(f"✗ ({e})")
        
        print("-" * 50)
    
    def analyze_precision(self) -> Dict[str, Any]:
        """วิเคราะห์ precision ของทุก metric"""
        successful = [r for r in self.results if r["status"] == "success"]
        
        if len(successful) < 2:
            return {"error": "Need at least 2 successful runs"}
        
        # รวบรวมค่าจากทุกรอบ
        metrics = {
            "average_waiting_time": [],
            "average_queue_length": [],
            "average_utilization": [],
            "average_travel_time": [],
            "average_travel_distance": []
        }
        
        for r in successful:
            summary = r["summary"]
            for metric in metrics:
                val = summary.get(metric)
                if val is not None:
                    metrics[metric].append(val)
        
        # วิเคราะห์ precision แต่ละ metric
        precision_report = {}
        for metric, values in metrics.items():
            precision_report[metric] = calculate_precision(values)
        
        return precision_report
    
    def print_report(self):
        """แสดงรายงาน precision"""
        report = self.analyze_precision()
        
        if "error" in report:
            print(f"❌ {report['error']}")
            return
        
        print("\n" + "=" * 70)
        print("📊 PRECISION ANALYSIS REPORT")
        print(f"   Runs: {self.num_runs}")
        print("=" * 70)
        
        print(f"\n{'Metric':<30} {'Decimal':<10} {'Sig.Figs':<10} {'Agreement':<12} {'Values'}")
        print("-" * 70)
        
        for metric, data in report.items():
            decimal = data.get("decimal_precision")
            sig_figs = data.get("significant_figures")
            agreement = data.get("agreement_ratio")
            values = data.get("all_values", [])
            
            # Format decimal precision
            if decimal is None:
                dec_str = "N/A"
            elif decimal == -2:
                dec_str = "None"
            elif decimal == -1:
                dec_str = "~Order"
            else:
                dec_str = f"{decimal} dp"
            
            # Format sig figs
            sig_str = f"{sig_figs} sf" if sig_figs is not None else "N/A"
            
            # Format agreement
            agr_str = f"{agreement*100:.1f}%" if agreement is not None else "N/A"
            
            # Format values (show first 3)
            if len(values) <= 3:
                val_str = ", ".join(f"{v:.4f}" for v in values)
            else:
                val_str = ", ".join(f"{v:.4f}" for v in values[:3]) + f" ... ({len(values)} total)"
            
            print(f"{metric:<30} {dec_str:<10} {sig_str:<10} {agr_str:<12} {val_str}")
        
        # Summary
        print("\n" + "-" * 70)
        print("📋 Summary:")
        
        all_agreements = [d["agreement_ratio"] for d in report.values() if d.get("agreement_ratio") is not None]
        if all_agreements:
            avg_agreement = statistics.mean(all_agreements)
            print(f"   Average Agreement: {avg_agreement*100:.1f}%")
            
            if avg_agreement >= 0.99:
                print("   ✅ Excellent precision - results are highly consistent")
            elif avg_agreement >= 0.95:
                print("   ✅ Good precision - results are consistent")
            elif avg_agreement >= 0.90:
                print("   ⚠️  Moderate precision - some variation in results")
            else:
                print("   ❌ Low precision - significant variation in results")
        
        print("=" * 70)
    
    def save_report(self, output_file: str):
        """บันทึกรายงานเป็น JSON"""
        report = {
            "metadata": {
                "input_file": self.input_file,
                "num_runs": self.num_runs,
                "timestamp": datetime.now().isoformat(),
                "successful_runs": len([r for r in self.results if r["status"] == "success"])
            },
            "precision_analysis": self.analyze_precision(),
            "raw_results": self.results
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Report saved to: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze precision of simulation results across multiple runs"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to JSON input file"
    )
    parser.add_argument(
        "--runs", "-r",
        type=int,
        default=5,
        help="Number of simulation runs (default: 5)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file for report (optional)"
    )
    
    args = parser.parse_args()
    
    analyzer = PrecisionAnalyzer(
        input_file=args.input,
        num_runs=args.runs
    )
    
    analyzer.run_simulations()
    analyzer.print_report()
    
    if args.output:
        analyzer.save_report(args.output)


if __name__ == "__main__":
    main()
