"""
Summary Precision Analyzer - วิเคราะห์ความแม่นยำเฉพาะ Summary Metrics

Usage:
    python -m tests.summary_precision --input tests/sample_input.json --runs 10

วัด precision ของ 5 ค่า summary:
- average_waiting_time
- average_queue_length  
- average_utilization
- average_travel_time
- average_travel_distance
"""

import argparse
import json
import math
import statistics
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.Simulation import SimulationRequest
from app.services.simulation_runner import run_simulation


def analyze_precision(values: List[float], name: str) -> Dict[str, Any]:
    """วิเคราะห์ precision ของค่าหลายๆ ค่า"""
    # กรองค่า default ออก
    filtered = [v for v in values if v != -99999.9 and v is not None and not math.isnan(v)]
    
    if len(filtered) < 2:
        return {
            "metric": name,
            "count": len(filtered),
            "decimal_precision": None,
            "significant_figures": None,
            "agreement_percent": None,
            "values": filtered,
            "note": "Not enough data"
        }
    
    mean = statistics.mean(filtered)
    stdev = statistics.stdev(filtered)
    
    # Decimal precision - ตรงกันกี่ตำแหน่งทศนิยม
    decimal_prec = 0
    for prec in range(10, -1, -1):
        rounded = [round(v, prec) for v in filtered]
        if len(set(rounded)) == 1:
            decimal_prec = prec
            break
    
    # Significant figures
    if mean != 0 and stdev != 0:
        cv = abs(stdev / mean)
        sig_figs = max(0, int(-math.log10(cv))) if cv > 0 else 10
    else:
        sig_figs = 10 if stdev == 0 else 0
    
    # Agreement ratio
    if mean != 0:
        relative_errors = [abs(v - mean) / abs(mean) for v in filtered]
        agreement = (1 - min(statistics.mean(relative_errors), 1)) * 100
    else:
        agreement = 100.0 if all(v == 0 for v in filtered) else 0.0
    
    return {
        "metric": name,
        "count": len(filtered),
        "decimal_precision": decimal_prec,
        "significant_figures": min(sig_figs, 10),
        "agreement_percent": round(agreement, 2),
        "mean": round(mean, 6),
        "stdev": round(stdev, 6),
        "min": round(min(filtered), 6),
        "max": round(max(filtered), 6),
        "values": [round(v, 6) for v in filtered]
    }


def run_and_analyze(input_file: str, num_runs: int) -> Dict[str, Any]:
    """รัน simulation และวิเคราะห์ precision"""
    
    # Check input file
    if not Path(input_file).exists():
        print(f"❌ Error: Input file not found: {input_file}")
        print(f"   Example: python -m tests.summary_precision -i tests/sample_input.json -r 10")
        sys.exit(1)
    
    # Load input
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    request = SimulationRequest(**data)
    
    print(f"🔬 Running {num_runs} simulations...")
    print("-" * 60)
    
    # Collect summary values
    summaries = {
        "average_waiting_time": [],
        "average_queue_length": [],
        "average_utilization": [],
        "average_travel_time": [],
        "average_travel_distance": []
    }
    
    successful = 0
    for i in range(num_runs):
        print(f"  Run {i+1}/{num_runs}...", end=" ", flush=True)
        try:
            result = run_simulation(request)
            summary = result.simulation_result.result_summary.model_dump()
            
            for key in summaries:
                val = summary.get(key)
                if val is not None:
                    summaries[key].append(val)
            
            successful += 1
            print("✓")
        except Exception as e:
            print(f"✗ ({e})")
    
    print("-" * 60)
    print(f"✅ Completed: {successful}/{num_runs} runs\n")
    
    # Analyze each metric
    results = {}
    for metric, values in summaries.items():
        results[metric] = analyze_precision(values, metric)
    
    return {
        "metadata": {
            "input_file": input_file,
            "total_runs": num_runs,
            "successful_runs": successful,
            "timestamp": datetime.now().isoformat()
        },
        "precision": results
    }


def print_report(analysis: Dict[str, Any]):
    """แสดงรายงาน precision"""
    print("=" * 70)
    print("📊 SUMMARY PRECISION REPORT")
    print("=" * 70)
    
    print(f"\n{'Metric':<28} {'Decimal':<10} {'Sig.Figs':<10} {'Agreement':<12} {'Mean':<15}")
    print("-" * 70)
    
    for metric, data in analysis["precision"].items():
        if data.get("note"):
            print(f"{metric:<28} {'N/A':<10} {'N/A':<10} {'N/A':<12} {data.get('note')}")
            continue
        
        dec = f"{data['decimal_precision']} dp" if data['decimal_precision'] is not None else "N/A"
        sig = f"{data['significant_figures']} sf" if data['significant_figures'] is not None else "N/A"
        agr = f"{data['agreement_percent']:.1f}%" if data['agreement_percent'] is not None else "N/A"
        mean = f"{data['mean']:.4f}" if data.get('mean') is not None else "N/A"
        
        print(f"{metric:<28} {dec:<10} {sig:<10} {agr:<12} {mean:<15}")
    
    # Summary
    agreements = [d['agreement_percent'] for d in analysis["precision"].values() 
                  if d.get('agreement_percent') is not None]
    
    if agreements:
        avg = statistics.mean(agreements)
        print("\n" + "-" * 70)
        print(f"📋 Overall Agreement: {avg:.1f}%")
        
        if avg >= 99:
            print("   ✅ Excellent - ค่าตรงกันมาก")
        elif avg >= 95:
            print("   ✅ Good - ค่าค่อนข้างตรงกัน")
        elif avg >= 90:
            print("   ⚠️  Moderate - มีความแตกต่างบ้าง")
        else:
            print("   ❌ Low - ค่าแตกต่างกันมาก")
    
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Analyze precision of summary metrics")
    parser.add_argument("--input", "-i", required=True, help="Path to JSON input file")
    parser.add_argument("--runs", "-r", type=int, default=5, help="Number of runs (default: 5)")
    parser.add_argument("--output", "-o", help="Output JSON file (optional)")
    
    args = parser.parse_args()
    
    analysis = run_and_analyze(args.input, args.runs)
    print_report(analysis)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Saved to: {args.output}")


if __name__ == "__main__":
    main()
