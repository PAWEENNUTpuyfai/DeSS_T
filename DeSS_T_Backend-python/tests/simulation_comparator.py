"""
Simulation Result Comparator - วิเคราะห์และเปรียบเทียบผลลัพธ์จากหลาย batch runs

Usage:
    python -m tests.simulation_comparator --files results1.json results2.json
    python -m tests.simulation_comparator --dir test_results/

Features:
    - เปรียบเทียบผลลัพธ์ระหว่าง runs ต่างๆ
    - ตรวจสอบความสม่ำเสมอของ simulation
    - หาค่า outliers และความผิดปกติ
    - สร้าง summary report
"""

import argparse
import json
import os
import statistics
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass
class MetricAnalysis:
    """ผลการวิเคราะห์ของแต่ละ metric"""
    name: str
    values: List[float]
    mean: float
    median: float
    stdev: float
    min_val: float
    max_val: float
    cv: float  # Coefficient of Variation
    outliers: List[Tuple[int, float]]  # (run_number, value)
    consistency: str


class SimulationComparator:
    """เปรียบเทียบและวิเคราะห์ผลลัพธ์ simulation"""
    
    def __init__(self):
        self.batch_results: List[Dict[str, Any]] = []
        
    def load_batch_file(self, filepath: str) -> Dict[str, Any]:
        """โหลดไฟล์ผลลัพธ์ batch"""
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def load_multiple_files(self, filepaths: List[str]):
        """โหลดหลายไฟล์"""
        for fp in filepaths:
            data = self.load_batch_file(fp)
            data["source_file"] = fp
            self.batch_results.append(data)
        print(f"📁 Loaded {len(self.batch_results)} batch result files")
    
    def load_from_directory(self, directory: str):
        """โหลดทุกไฟล์ JSON จาก directory"""
        dir_path = Path(directory)
        json_files = sorted(dir_path.glob("batch_results_*.json"))
        
        if not json_files:
            print(f"⚠️  No batch result files found in {directory}")
            return
        
        self.load_multiple_files([str(f) for f in json_files])
    
    def extract_all_runs(self) -> List[Dict[str, Any]]:
        """รวบรวม run results ทั้งหมดจากทุก batch"""
        all_runs = []
        for batch in self.batch_results:
            source = batch.get("source_file", "unknown")
            for result in batch.get("results", []):
                if result.get("status") == "success":
                    result["source_batch"] = source
                    all_runs.append(result)
        return all_runs
    
    def analyze_metric(self, values: List[float], name: str) -> MetricAnalysis:
        """วิเคราะห์ metric ตัวเดียว"""
        # กรองค่า default ออก
        filtered = [v for v in values if v != -99999.9 and v is not None]
        
        if len(filtered) < 2:
            return MetricAnalysis(
                name=name,
                values=filtered,
                mean=filtered[0] if filtered else 0,
                median=filtered[0] if filtered else 0,
                stdev=0,
                min_val=filtered[0] if filtered else 0,
                max_val=filtered[0] if filtered else 0,
                cv=0,
                outliers=[],
                consistency="Insufficient Data"
            )
        
        mean = statistics.mean(filtered)
        stdev = statistics.stdev(filtered)
        median = statistics.median(filtered)
        cv = (stdev / mean * 100) if mean != 0 else 0
        
        # หา outliers (values ที่ห่างจาก mean มากกว่า 2 standard deviations)
        outliers = []
        for i, v in enumerate(filtered):
            if abs(v - mean) > 2 * stdev:
                outliers.append((i + 1, v))
        
        # ประเมินความสม่ำเสมอ
        if cv < 5:
            consistency = "Excellent"
        elif cv < 10:
            consistency = "Very Good"
        elif cv < 20:
            consistency = "Good"
        elif cv < 35:
            consistency = "Moderate"
        else:
            consistency = "Poor"
        
        return MetricAnalysis(
            name=name,
            values=filtered,
            mean=mean,
            median=median,
            stdev=stdev,
            min_val=min(filtered),
            max_val=max(filtered),
            cv=cv,
            outliers=outliers,
            consistency=consistency
        )
    
    def compare_summary_metrics(self) -> Dict[str, MetricAnalysis]:
        """เปรียบเทียบ summary metrics จากทุก run"""
        all_runs = self.extract_all_runs()
        
        metrics_data = {
            "average_waiting_time": [],
            "average_queue_length": [],
            "average_utilization": [],
            "average_travel_time": [],
            "average_travel_distance": []
        }
        
        for run in all_runs:
            summary = run.get("summary", {})
            for metric in metrics_data:
                value = summary.get(metric)
                if value is not None:
                    metrics_data[metric].append(value)
        
        results = {}
        for metric, values in metrics_data.items():
            results[metric] = self.analyze_metric(values, metric)
        
        return results
    
    def compare_slot_results(self) -> Dict[str, Dict[str, MetricAnalysis]]:
        """เปรียบเทียบผลลัพธ์แต่ละ slot"""
        all_runs = self.extract_all_runs()
        
        slot_data: Dict[str, Dict[str, List[float]]] = {}
        
        for run in all_runs:
            for slot in run.get("slot_results", []):
                slot_name = slot["slot_name"]
                if slot_name not in slot_data:
                    slot_data[slot_name] = {
                        "waiting_time": [],
                        "queue_length": []
                    }
                
                total = slot.get("result_total_station", {})
                slot_data[slot_name]["waiting_time"].append(
                    total.get("average_waiting_time", -99999.9)
                )
                slot_data[slot_name]["queue_length"].append(
                    total.get("average_queue_length", -99999.9)
                )
        
        results = {}
        for slot_name, metrics in slot_data.items():
            results[slot_name] = {
                "waiting_time": self.analyze_metric(metrics["waiting_time"], f"{slot_name}_waiting"),
                "queue_length": self.analyze_metric(metrics["queue_length"], f"{slot_name}_queue")
            }
        
        return results
    
    def compare_route_results(self) -> Dict[str, Dict[str, MetricAnalysis]]:
        """เปรียบเทียบผลลัพธ์แต่ละ route"""
        all_runs = self.extract_all_runs()
        
        route_data: Dict[str, Dict[str, List[float]]] = {}
        
        for run in all_runs:
            for slot in run.get("slot_results", []):
                for route in slot.get("result_route", []):
                    route_id = route["route_id"]
                    if route_id not in route_data:
                        route_data[route_id] = {
                            "utilization": [],
                            "travel_time": [],
                            "travel_distance": [],
                            "waiting_time": [],
                            "queue_length": [],
                            "customers_count": []
                        }
                    
                    route_data[route_id]["utilization"].append(route.get("average_utilization", -99999.9))
                    route_data[route_id]["travel_time"].append(route.get("average_travel_time", -99999.9))
                    route_data[route_id]["travel_distance"].append(route.get("average_travel_distance", -99999.9))
                    route_data[route_id]["waiting_time"].append(route.get("average_waiting_time", -99999.9))
                    route_data[route_id]["queue_length"].append(route.get("average_queue_length", -99999.9))
                    route_data[route_id]["customers_count"].append(route.get("customers_count", 0))
        
        results = {}
        for route_id, metrics in route_data.items():
            results[route_id] = {}
            for metric_name, values in metrics.items():
                results[route_id][metric_name] = self.analyze_metric(values, f"{route_id}_{metric_name}")
        
        return results
    
    def find_anomalies(self) -> List[Dict[str, Any]]:
        """ค้นหาความผิดปกติในผลลัพธ์"""
        anomalies = []
        all_runs = self.extract_all_runs()
        
        # ตรวจสอบ runs ที่ล้มเหลว
        for batch in self.batch_results:
            for result in batch.get("results", []):
                if result.get("status") == "failed":
                    anomalies.append({
                        "type": "failed_run",
                        "batch": batch.get("source_file"),
                        "run_number": result.get("run_number"),
                        "error": result.get("error")
                    })
        
        # ตรวจสอบ metric outliers
        summary_analysis = self.compare_summary_metrics()
        for metric, analysis in summary_analysis.items():
            for run_num, value in analysis.outliers:
                anomalies.append({
                    "type": "metric_outlier",
                    "metric": metric,
                    "run_number": run_num,
                    "value": value,
                    "mean": analysis.mean,
                    "stdev": analysis.stdev
                })
        
        return anomalies
    
    def generate_report(self) -> Dict[str, Any]:
        """สร้างรายงานการเปรียบเทียบทั้งหมด"""
        total_runs = len(self.extract_all_runs())
        total_batches = len(self.batch_results)
        
        failed_runs = sum(
            len([r for r in batch.get("results", []) if r.get("status") == "failed"])
            for batch in self.batch_results
        )
        
        summary_analysis = self.compare_summary_metrics()
        slot_analysis = self.compare_slot_results()
        anomalies = self.find_anomalies()
        
        return {
            "overview": {
                "total_batches": total_batches,
                "total_successful_runs": total_runs,
                "total_failed_runs": failed_runs,
                "anomalies_found": len(anomalies)
            },
            "summary_metrics": {
                metric: {
                    "mean": analysis.mean,
                    "median": analysis.median,
                    "stdev": analysis.stdev,
                    "min": analysis.min_val,
                    "max": analysis.max_val,
                    "cv_percent": analysis.cv,
                    "consistency": analysis.consistency,
                    "outlier_count": len(analysis.outliers)
                }
                for metric, analysis in summary_analysis.items()
            },
            "slot_analysis": {
                slot: {
                    "waiting_time": {
                        "mean": data["waiting_time"].mean,
                        "stdev": data["waiting_time"].stdev,
                        "consistency": data["waiting_time"].consistency
                    },
                    "queue_length": {
                        "mean": data["queue_length"].mean,
                        "stdev": data["queue_length"].stdev,
                        "consistency": data["queue_length"].consistency
                    }
                }
                for slot, data in slot_analysis.items()
            },
            "anomalies": anomalies
        }
    
    def print_report(self):
        """แสดงรายงานเปรียบเทียบ"""
        report = self.generate_report()
        
        print("\n" + "=" * 70)
        print("📊 SIMULATION COMPARISON REPORT")
        print("=" * 70)
        
        # Overview
        overview = report["overview"]
        print(f"\n📋 Overview:")
        print(f"   Total Batches:        {overview['total_batches']}")
        print(f"   Successful Runs:      {overview['total_successful_runs']}")
        print(f"   Failed Runs:          {overview['total_failed_runs']}")
        print(f"   Anomalies Found:      {overview['anomalies_found']}")
        
        # Summary Metrics
        print(f"\n📈 Summary Metrics Analysis:")
        print("-" * 70)
        print(f"{'Metric':<30} {'Mean':>10} {'StDev':>10} {'CV%':>8} {'Consistency':<15}")
        print("-" * 70)
        
        for metric, stats in report["summary_metrics"].items():
            print(f"{metric:<30} {stats['mean']:>10.4f} {stats['stdev']:>10.4f} "
                  f"{stats['cv_percent']:>7.2f}% {stats['consistency']:<15}")
        
        # Slot Analysis
        if report["slot_analysis"]:
            print(f"\n📅 Slot Analysis (Waiting Time):")
            print("-" * 50)
            
            for slot, data in report["slot_analysis"].items():
                wt = data["waiting_time"]
                print(f"   {slot}: Mean={wt['mean']:.4f}, StDev={wt['stdev']:.4f}, {wt['consistency']}")
        
        # Anomalies
        if report["anomalies"]:
            print(f"\n⚠️  Anomalies Detected:")
            print("-" * 50)
            
            for i, anomaly in enumerate(report["anomalies"][:10]):  # แสดง 10 รายการแรก
                if anomaly["type"] == "failed_run":
                    print(f"   {i+1}. Failed run #{anomaly['run_number']}: {anomaly['error'][:50]}")
                elif anomaly["type"] == "metric_outlier":
                    print(f"   {i+1}. Outlier in {anomaly['metric']}: "
                          f"value={anomaly['value']:.4f} (mean={anomaly['mean']:.4f})")
            
            if len(report["anomalies"]) > 10:
                print(f"   ... and {len(report['anomalies']) - 10} more")
        
        print("\n" + "=" * 70)
    
    def save_report(self, output_file: str):
        """บันทึกรายงานเป็น JSON"""
        report = self.generate_report()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Report saved to: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Compare and analyze simulation batch results"
    )
    parser.add_argument(
        "--files", "-f",
        nargs="+",
        help="Paths to batch result JSON files to compare"
    )
    parser.add_argument(
        "--dir", "-d",
        help="Directory containing batch result files"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file for comparison report"
    )
    
    args = parser.parse_args()
    
    comparator = SimulationComparator()
    
    if args.dir:
        comparator.load_from_directory(args.dir)
    elif args.files:
        comparator.load_multiple_files(args.files)
    else:
        parser.error("Please specify --files or --dir")
    
    comparator.print_report()
    
    if args.output:
        comparator.save_report(args.output)


if __name__ == "__main__":
    main()
