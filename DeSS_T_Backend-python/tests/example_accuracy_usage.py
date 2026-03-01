"""
ตัวอย่างการใช้งาน Accuracy Analyzer ในโค้ด

แสดงวิธีใช้งาน AccuracyAnalyzer class ในโปรแกรม Python
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.accuracy_analyzer import AccuracyAnalyzer
from app.schemas.Simulation import SimulationRequest
from app.services.simulation_runner import run_simulation


def example_basic_usage():
    """ตัวอย่างพื้นฐาน - วิเคราะห์ waiting time และ utilization"""
    print("=" * 70)
    print("Example 1: Basic Usage - Overall Metrics Only")
    print("=" * 70)
    
    # สร้าง analyzer โดยกำหนดค่าจริง
    analyzer = AccuracyAnalyzer(
        actual_waiting_time=5.2,    # นาที
        actual_utilization=0.75      # 0-1
    )
    
    # โหลดและรัน simulation
    input_file = Path(__file__).parent / "sample_input.json"
    import json
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    request = SimulationRequest(**data)
    result = run_simulation(request)
    
    # วิเคราะห์
    analysis = analyzer.analyze_simulation(result)
    
    # พิมพ์รายงาน
    analyzer.print_report(analysis)


def example_detailed_analysis():
    """ตัวอย่างการวิเคราะห์แบบละเอียด - รวมถึงแต่ละสถานีและเส้นทาง"""
    print("\n\n")
    print("=" * 70)
    print("Example 2: Detailed Analysis - Stations and Routes")
    print("=" * 70)
    
    # สร้าง analyzer โดยกำหนดค่าจริงแบบละเอียด
    analyzer = AccuracyAnalyzer(
        actual_waiting_time=5.2,
        actual_utilization=0.75,
        
        # ค่าจริงของแต่ละสถานี
        actual_station_waiting_times={
            "หอพักหญิง 6": 3.5,
            "คณะวิศวกรรมศาสตร์": 4.2,
            "อ.มช.": 5.8
        },
        
        # ค่าจริงของแต่ละเส้นทาง
        actual_route_utilizations={
            "16842c47-2c3b-4da6-af41-790d93d5d85d": 0.80,
            "72c9791e-d930-4b79-89d4-8ca459f55cb6": 0.65
        },
        
        actual_route_waiting_times={
            "16842c47-2c3b-4da6-af41-790d93d5d85d": 5.5,
            "72c9791e-d930-4b79-89d4-8ca459f55cb6": 4.8
        }
    )
    
    # โหลดและรัน simulation
    input_file = Path(__file__).parent / "sample_input.json"
    import json
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    request = SimulationRequest(**data)
    result = run_simulation(request)
    
    # วิเคราะห์
    analysis = analyzer.analyze_simulation(result)
    
    # พิมพ์รายงาน
    analyzer.print_report(analysis)
    
    # บันทึกผลลัพธ์
    output_file = Path(__file__).parent / "accuracy_analysis_result.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Detailed results saved to: {output_file}")


def example_from_json():
    """ตัวอย่างการโหลดค่าจริงจาก JSON file"""
    print("\n\n")
    print("=" * 70)
    print("Example 3: Loading Actual Values from JSON")
    print("=" * 70)
    
    from tests.accuracy_analyzer import load_actual_values
    
    # โหลดค่าจริงจาก JSON
    actual_file = Path(__file__).parent / "sample_actual_values.json"
    actual_values = load_actual_values(str(actual_file))
    
    # สร้าง analyzer
    analyzer = AccuracyAnalyzer(
        actual_waiting_time=actual_values.get("waiting_time"),
        actual_utilization=actual_values.get("utilization"),
        actual_station_waiting_times=actual_values.get("stations", {}),
        actual_route_utilizations=actual_values.get("routes", {}).get("utilization", {}),
        actual_route_waiting_times=actual_values.get("routes", {}).get("waiting_time", {})
    )
    
    # รัน simulation
    input_file = Path(__file__).parent / "sample_input.json"
    import json
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    request = SimulationRequest(**data)
    result = run_simulation(request)
    
    # วิเคราะห์และพิมพ์รายงาน
    analysis = analyzer.analyze_simulation(result)
    analyzer.print_report(analysis)


def example_programmatic_access():
    """ตัวอย่างการเข้าถึงข้อมูลแบบ programmatic"""
    print("\n\n")
    print("=" * 70)
    print("Example 4: Programmatic Access to Metrics")
    print("=" * 70)
    
    analyzer = AccuracyAnalyzer(
        actual_waiting_time=5.2,
        actual_utilization=0.75
    )
    
    # รัน simulation
    input_file = Path(__file__).parent / "sample_input.json"
    import json
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    request = SimulationRequest(**data)
    result = run_simulation(request)
    
    # วิเคราะห์
    analysis = analyzer.analyze_simulation(result)
    
    # เข้าถึงข้อมูลแบบ programmatic
    print("\n📊 Accessing Metrics Programmatically:")
    print("-" * 70)
    
    if "waiting_time" in analysis["summary"]:
        wt = analysis["summary"]["waiting_time"]
        print(f"Waiting Time Accuracy: {wt['accuracy']:.2f}%")
        print(f"Absolute Error: {wt['absolute_error']:.2f} minutes")
    
    if "utilization" in analysis["summary"]:
        util = analysis["summary"]["utilization"]
        print(f"Utilization Accuracy: {util['accuracy']:.2f}%")
        print(f"Relative Error: {util['relative_error']:.2f}%")
    
    # Aggregate metrics
    agg = analysis["aggregate_metrics"]
    if "waiting_time" in agg and agg["waiting_time"]:
        print(f"\nOverall Waiting Time MAPE: {agg['waiting_time']['MAPE']:.2f}%")
        print(f"Overall Waiting Time RMSE: {agg['waiting_time']['RMSE']:.4f}")
    
    if "utilization" in agg and agg["utilization"]:
        print(f"Overall Utilization MAPE: {agg['utilization']['MAPE']:.2f}%")
        print(f"Overall Utilization RMSE: {agg['utilization']['RMSE']:.4f}")
    
    # ตัวอย่างการตรวจสอบ threshold
    print("\n✅ Threshold Checks:")
    print("-" * 70)
    
    if "waiting_time" in agg and agg["waiting_time"]:
        mape = agg["waiting_time"]["MAPE"]
        if mape < 5:
            print(f"✓ Waiting Time: Excellent (MAPE={mape:.2f}% < 5%)")
        elif mape < 10:
            print(f"✓ Waiting Time: Good (MAPE={mape:.2f}% < 10%)")
        elif mape < 20:
            print(f"⚠ Waiting Time: Acceptable (MAPE={mape:.2f}% < 20%)")
        else:
            print(f"✗ Waiting Time: Poor (MAPE={mape:.2f}% >= 20%)")


if __name__ == "__main__":
    # เรียก examples ตามต้องการ
    # ปิด comment บรรทัดที่ต้องการรัน
    
    example_basic_usage()
    # example_detailed_analysis()
    # example_from_json()
    # example_programmatic_access()
