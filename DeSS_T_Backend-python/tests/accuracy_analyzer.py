"""
Accuracy Analyzer - วิเคราะห์ความแม่นยำ (Accuracy) ของผลลัพธ์โดยเทียบกับค่าจริง

คำนวณความแม่นยำของ waiting time และ utilization โดยเทียบกับค่าจริง

Usage:
    python -m tests.accuracy_analyzer --input sample_input.json --actual actual_values.json
    
    หรือใช้ในโค้ด:
    analyzer = AccuracyAnalyzer(actual_waiting_time=5.2, actual_utilization=0.75)
    result = analyzer.analyze_simulation(simulation_result)
"""

import argparse
import json
import math
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.Simulation import SimulationRequest, SimulationResponse
from app.services.simulation_runner import run_simulation


class AccuracyAnalyzer:
    """วิเคราะห์ความแม่นยำของผลลัพธ์โดยเทียบกับค่าจริง"""
    
    def __init__(
        self,
        actual_waiting_time: Optional[float] = None,
        actual_utilization: Optional[float] = None,
        actual_station_waiting_times: Optional[Dict[str, float]] = None,
        actual_route_utilizations: Optional[Dict[str, float]] = None,
        actual_route_waiting_times: Optional[Dict[str, float]] = None
    ):
        """
        Parameters:
            actual_waiting_time: ค่าเฉลี่ย waiting time ที่เป็นจริง (นาที)
            actual_utilization: ค่าเฉลี่ย utilization ที่เป็นจริง (0-1)
            actual_station_waiting_times: Dict[station_name -> waiting_time]
            actual_route_utilizations: Dict[route_id -> utilization]
            actual_route_waiting_times: Dict[route_id -> waiting_time]
        """
        self.actual_waiting_time = actual_waiting_time
        self.actual_utilization = actual_utilization
        self.actual_station_waiting_times = actual_station_waiting_times or {}
        self.actual_route_utilizations = actual_route_utilizations or {}
        self.actual_route_waiting_times = actual_route_waiting_times or {}
    
    def calculate_metrics(self, actual: float, predicted: float) -> Dict[str, float]:
        """
        คำนวณ accuracy metrics สำหรับค่าหนึ่งๆ
        
        Returns:
            - absolute_error: ส่วนต่างสัมบูรณ์
            - relative_error: % ส่วนต่างเทียบกับค่าจริง
            - accuracy: ความแม่นยำ (100% - relative_error)
            - squared_error: ส่วนต่างกำลังสอง (สำหรับคำนวณ RMSE)
        """
        absolute_error = abs(predicted - actual)
        
        if actual != 0:
            relative_error = (absolute_error / abs(actual)) * 100
            accuracy = max(0, 100 - relative_error)
        else:
            # ถ้าค่าจริงเป็น 0 แล้ว predicted ก็เป็น 0 ถือว่าถูกต้อง 100%
            if predicted == 0:
                relative_error = 0
                accuracy = 100
            else:
                relative_error = float('inf')
                accuracy = 0
        
        squared_error = (predicted - actual) ** 2
        
        return {
            "actual": round(actual, 4),
            "predicted": round(predicted, 4),
            "absolute_error": round(absolute_error, 4),
            "relative_error": round(relative_error, 2),
            "accuracy": round(accuracy, 2),
            "squared_error": round(squared_error, 4)
        }
    
    def analyze_summary(self, result_summary: Dict[str, Any]) -> Dict[str, Any]:
        """วิเคราะห์ความแม่นยำของ summary results"""
        analysis = {}
        
        # วิเคราะห์ waiting time
        if self.actual_waiting_time is not None:
            predicted_waiting = result_summary.get("average_waiting_time")
            if predicted_waiting is not None:
                analysis["waiting_time"] = self.calculate_metrics(
                    self.actual_waiting_time,
                    predicted_waiting
                )
        
        # วิเคราะห์ utilization
        if self.actual_utilization is not None:
            predicted_util = result_summary.get("average_utilization")
            if predicted_util is not None:
                analysis["utilization"] = self.calculate_metrics(
                    self.actual_utilization,
                    predicted_util
                )
        
        return analysis
    
    def analyze_stations(self, result_stations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """วิเคราะห์ความแม่นยำของแต่ละสถานี"""
        station_analysis = {}
        
        for station in result_stations:
            station_name = station.get("station_name")
            if station_name in self.actual_station_waiting_times:
                actual_wt = self.actual_station_waiting_times[station_name]
                predicted_wt = station.get("average_waiting_time")
                
                if predicted_wt is not None:
                    station_analysis[station_name] = self.calculate_metrics(
                        actual_wt,
                        predicted_wt
                    )
        
        return station_analysis
    
    def analyze_routes(self, result_routes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """วิเคราะห์ความแม่นยำของแต่ละเส้นทาง"""
        route_analysis = {
            "utilization": {},
            "waiting_time": {}
        }
        
        for route in result_routes:
            route_id = route.get("route_id")
            
            # วิเคราะห์ utilization
            if route_id in self.actual_route_utilizations:
                actual_util = self.actual_route_utilizations[route_id]
                predicted_util = route.get("average_utilization")
                
                if predicted_util is not None:
                    route_analysis["utilization"][route_id] = self.calculate_metrics(
                        actual_util,
                        predicted_util
                    )
            
            # วิเคราะห์ waiting time
            if route_id in self.actual_route_waiting_times:
                actual_wt = self.actual_route_waiting_times[route_id]
                predicted_wt = route.get("average_waiting_time")
                
                if predicted_wt is not None:
                    route_analysis["waiting_time"][route_id] = self.calculate_metrics(
                        actual_wt,
                        predicted_wt
                    )
        
        return route_analysis
    
    def analyze_simulation(self, simulation_result: SimulationResponse) -> Dict[str, Any]:
        """วิเคราะห์ความแม่นยำของผลลัพธ์ simulation ทั้งหมด"""
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "summary": {},
            "slots": []
        }
        
        # วิเคราะห์ overall summary
        summary_dict = simulation_result.simulation_result.result_summary.model_dump()
        analysis["summary"] = self.analyze_summary(summary_dict)
        
        # วิเคราะห์แต่ละ time slot
        for slot_result in simulation_result.simulation_result.slot_results:
            slot_dict = slot_result.model_dump()
            
            slot_analysis = {
                "slot_name": slot_dict["slot_name"],
                "stations": {},
                "routes": {}
            }
            
            # วิเคราะห์สถานี
            if slot_dict.get("result_station"):
                slot_analysis["stations"] = self.analyze_stations(
                    slot_dict["result_station"]
                )
            
            # วิเคราะห์เส้นทาง
            if slot_dict.get("result_route"):
                slot_analysis["routes"] = self.analyze_routes(
                    slot_dict["result_route"]
                )
            
            analysis["slots"].append(slot_analysis)
        
        # คำนวณ aggregate metrics
        analysis["aggregate_metrics"] = self.calculate_aggregate_metrics(analysis)
        
        return analysis
    
    def calculate_aggregate_metrics(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """คำนวณ aggregate metrics ทั้งหมด (MAPE, RMSE, etc.)"""
        metrics = {
            "waiting_time": {},
            "utilization": {}
        }
        
        # รวบรวมค่า errors ทั้งหมดสำหรับ waiting time
        wt_errors = []
        wt_squared_errors = []
        
        # จาก summary
        if "waiting_time" in analysis["summary"]:
            wt_errors.append(analysis["summary"]["waiting_time"]["relative_error"])
            wt_squared_errors.append(analysis["summary"]["waiting_time"]["squared_error"])
        
        # จาก stations
        for slot in analysis["slots"]:
            for station_data in slot["stations"].values():
                wt_errors.append(station_data["relative_error"])
                wt_squared_errors.append(station_data["squared_error"])
            
            # จาก routes
            if "waiting_time" in slot["routes"]:
                for route_data in slot["routes"]["waiting_time"].values():
                    wt_errors.append(route_data["relative_error"])
                    wt_squared_errors.append(route_data["squared_error"])
        
        # คำนวณ metrics สำหรับ waiting time
        if wt_errors:
            # กรอง inf ออก
            valid_errors = [e for e in wt_errors if e != float('inf')]
            
            if valid_errors:
                metrics["waiting_time"] = {
                    "MAPE": round(sum(valid_errors) / len(valid_errors), 2),  # Mean Absolute Percentage Error
                    "RMSE": round(math.sqrt(sum(wt_squared_errors) / len(wt_squared_errors)), 4),  # Root Mean Square Error
                    "count": len(valid_errors),
                    "overall_accuracy": round(100 - (sum(valid_errors) / len(valid_errors)), 2)
                }
        
        # รวบรวมค่า errors สำหรับ utilization
        util_errors = []
        util_squared_errors = []
        
        # จาก summary
        if "utilization" in analysis["summary"]:
            util_errors.append(analysis["summary"]["utilization"]["relative_error"])
            util_squared_errors.append(analysis["summary"]["utilization"]["squared_error"])
        
        # จาก routes
        for slot in analysis["slots"]:
            if "utilization" in slot["routes"]:
                for route_data in slot["routes"]["utilization"].values():
                    util_errors.append(route_data["relative_error"])
                    util_squared_errors.append(route_data["squared_error"])
        
        # คำนวณ metrics สำหรับ utilization
        if util_errors:
            valid_errors = [e for e in util_errors if e != float('inf')]
            
            if valid_errors:
                metrics["utilization"] = {
                    "MAPE": round(sum(valid_errors) / len(valid_errors), 2),
                    "RMSE": round(math.sqrt(sum(util_squared_errors) / len(util_squared_errors)), 4),
                    "count": len(valid_errors),
                    "overall_accuracy": round(100 - (sum(valid_errors) / len(valid_errors)), 2)
                }
        
        return metrics
    
    def print_report(self, analysis: Dict[str, Any]):
        """พิมพ์รายงานความแม่นยำ"""
        print("\n" + "=" * 70)
        print("📊 ACCURACY ANALYSIS REPORT")
        print("=" * 70)
        
        # Summary metrics
        if analysis["summary"]:
            print("\n🎯 OVERALL SUMMARY:")
            print("-" * 70)
            
            if "waiting_time" in analysis["summary"]:
                wt = analysis["summary"]["waiting_time"]
                print(f"  🕐 Waiting Time:")
                print(f"     Actual: {wt['actual']:.2f} min")
                print(f"     Predicted: {wt['predicted']:.2f} min")
                print(f"     Error: {wt['absolute_error']:.2f} min ({wt['relative_error']:.2f}%)")
                print(f"     ✓ Accuracy: {wt['accuracy']:.2f}%")
            
            if "utilization" in analysis["summary"]:
                util = analysis["summary"]["utilization"]
                print(f"\n  📈 Utilization:")
                print(f"     Actual: {util['actual']:.2f}")
                print(f"     Predicted: {util['predicted']:.2f}")
                print(f"     Error: {util['absolute_error']:.4f} ({util['relative_error']:.2f}%)")
                print(f"     ✓ Accuracy: {util['accuracy']:.2f}%")
        
        # Aggregate metrics
        if analysis["aggregate_metrics"]:
            print("\n📈 AGGREGATE METRICS:")
            print("-" * 70)
            
            agg = analysis["aggregate_metrics"]
            
            if "waiting_time" in agg and agg["waiting_time"]:
                wt = agg["waiting_time"]
                print(f"  🕐 Waiting Time (across {wt['count']} measurements):")
                print(f"     MAPE (Mean Absolute % Error): {wt['MAPE']:.2f}%")
                print(f"     RMSE (Root Mean Square Error): {wt['RMSE']:.4f}")
                print(f"     ✓ Overall Accuracy: {wt['overall_accuracy']:.2f}%")
            
            if "utilization" in agg and agg["utilization"]:
                util = agg["utilization"]
                print(f"\n  📈 Utilization (across {util['count']} measurements):")
                print(f"     MAPE (Mean Absolute % Error): {util['MAPE']:.2f}%")
                print(f"     RMSE (Root Mean Square Error): {util['RMSE']:.4f}")
                print(f"     ✓ Overall Accuracy: {util['overall_accuracy']:.2f}%")
        
        # Detail by slots (if any stations/routes were analyzed)
        detailed_count = sum(
            len(slot["stations"]) + 
            len(slot["routes"].get("utilization", {})) + 
            len(slot["routes"].get("waiting_time", {}))
            for slot in analysis["slots"]
        )
        
        if detailed_count > 0:
            print("\n📍 DETAILED ANALYSIS BY LOCATION:")
            print("-" * 70)
            
            for slot in analysis["slots"]:
                if slot["stations"] or slot["routes"].get("utilization") or slot["routes"].get("waiting_time"):
                    print(f"\n  Time Slot: {slot['slot_name']}")
                    
                    # Stations
                    if slot["stations"]:
                        print(f"    🚉 Stations:")
                        for station_name, data in slot["stations"].items():
                            print(f"      • {station_name}: {data['accuracy']:.1f}% accuracy "
                                  f"(error: {data['absolute_error']:.2f} min)")
                    
                    # Routes - Utilization
                    if slot["routes"].get("utilization"):
                        print(f"    🚗 Route Utilization:")
                        for route_id, data in slot["routes"]["utilization"].items():
                            print(f"      • {route_id[:8]}...: {data['accuracy']:.1f}% accuracy "
                                  f"(error: {data['absolute_error']:.4f})")
                    
                    # Routes - Waiting Time
                    if slot["routes"].get("waiting_time"):
                        print(f"    ⏱️  Route Waiting Time:")
                        for route_id, data in slot["routes"]["waiting_time"].items():
                            print(f"      • {route_id[:8]}...: {data['accuracy']:.1f}% accuracy "
                                  f"(error: {data['absolute_error']:.2f} min)")
        
        print("\n" + "=" * 70)


def load_actual_values(json_file: str) -> Dict[str, Any]:
    """โหลดค่าจริงจาก JSON file
    
    Format:
    {
        "waiting_time": 5.2,
        "utilization": 0.75,
        "stations": {
            "หอพักหญิง 6": 3.5,
            "คณะวิศวกรรมศาสตร์": 4.2
        },
        "routes": {
            "utilization": {
                "route_id_1": 0.80,
                "route_id_2": 0.65
            },
            "waiting_time": {
                "route_id_1": 5.5,
                "route_id_2": 4.8
            }
        }
    }
    """
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(
        description="วิเคราะห์ความแม่นยำของ simulation โดยเทียบกับค่าจริง"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to simulation input JSON file"
    )
    parser.add_argument(
        "--actual",
        required=True,
        help="Path to actual values JSON file"
    )
    parser.add_argument(
        "--output",
        help="Path to save analysis results (optional)"
    )
    
    args = parser.parse_args()
    
    # โหลดค่าจริง
    print(f"📂 Loading actual values from: {args.actual}")
    actual_values = load_actual_values(args.actual)
    
    # สร้าง analyzer
    analyzer = AccuracyAnalyzer(
        actual_waiting_time=actual_values.get("waiting_time"),
        actual_utilization=actual_values.get("utilization"),
        actual_station_waiting_times=actual_values.get("stations", {}),
        actual_route_utilizations=actual_values.get("routes", {}).get("utilization", {}),
        actual_route_waiting_times=actual_values.get("routes", {}).get("waiting_time", {})
    )
    
    # โหลดและรัน simulation
    print(f"🚀 Running simulation from: {args.input}")
    with open(args.input, 'r', encoding='utf-8') as f:
        input_data = json.load(f)
    
    request = SimulationRequest(**input_data)
    result = run_simulation(request)
    
    # วิเคราะห์ความแม่นยำ
    print("📊 Analyzing accuracy...")
    analysis = analyzer.analyze_simulation(result)
    
    # พิมพ์รายงาน
    analyzer.print_report(analysis)
    
    # บันทึกผลลัพธ์
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Results saved to: {args.output}")


if __name__ == "__main__":
    main()
