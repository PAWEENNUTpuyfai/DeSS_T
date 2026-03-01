python -m tests.summary_precision -i tests/sample_input.json -r 50 -o summary_report.json

# Simulation Testing Tools

เครื่องมือสำหรับทดสอบ simulation อัตโนมัติ - รันหลายรอบและเปรียบเทียบผลลัพธ์

## 📁 ไฟล์ในโฟลเดอร์นี้

```
tests/
├── __init__.py
├── README.md                         # ไฟล์นี้
├── sample_input.json                 # ตัวอย่าง input สำหรับทดสอบ
├── precision_analyzer.py             # 🔬 วิเคราะห์ precision ของผลลัพธ์
├── simulation_batch_runner.py        # รัน simulation หลายรอบ
├── simulation_comparator.py          # เปรียบเทียบผลลัพธ์แบบละเอียด
└── test_simulation_consistency.py    # Pytest tests
```

## 🚀 วิธีใช้งาน

### 1. Batch Runner - รัน simulation หลายรอบ

```bash
cd DeSS_T_Backend-python

# รัน 10 รอบ พร้อมเก็บผลลัพธ์
python -m tests.simulation_batch_runner --input tests/sample_input.json --runs 10 --output test_results/

# รัน 5 รอบ (default)
python -m tests.simulation_batch_runner -i tests/sample_input.json
```

**Options:**

- `--input, -i` : Path ไปยังไฟล์ JSON input
- `--runs, -r` : จำนวนรอบที่ต้องการรัน (default: 5)
- `--output, -o` : Folder สำหรับเก็บผลลัพธ์ (default: test_results/)

**Output:**

- ไฟล์ JSON ที่มีผลลัพธ์ทุกรอบ
- รายงานเปรียบเทียบอัตโนมัติ
- Statistics (mean, stdev, CV%)

### 2. 🔬 Precision Analyzer - วิเคราะห์ความแม่นยำ (แนะนำ)

```bash
# วิเคราะห์ precision จาก 10 รอบ
python -m tests.precision_analyzer --input tests/sample_input.json --runs 10

# บันทึกผลลัพธ์
python -m tests.precision_analyzer -i tests/sample_input.json -r 10 -o precision_report.json
```

**Output:**

```
======================================================================
📊 PRECISION ANALYSIS REPORT
   Runs: 10
======================================================================

Metric                         Decimal    Sig.Figs   Agreement    Values
----------------------------------------------------------------------
average_waiting_time           2 dp       3 sf       98.5%        5.2341, 5.1892, 5.3012 ... (10 total)
average_queue_length           1 dp       2 sf       95.2%        2.1234, 2.0891, 2.2145 ... (10 total)
average_utilization            3 dp       4 sf       99.1%        0.7523, 0.7519, 0.7528 ... (10 total)
```

**คอลัมน์:**

- `Decimal` - จำนวนตำแหน่งทศนิยมที่ค่าตรงกันทุกรอบ
- `Sig.Figs` - Significant figures ที่เชื่อถือได้
- `Agreement` - สัดส่วนความตรงกันของค่า (0-100%)

### 3. Comparator - เปรียบเทียบผลลัพธ์หลาย batch

```bash
# เปรียบเทียบไฟล์เฉพาะ
python -m tests.simulation_comparator --files results1.json results2.json

# เปรียบเทียบทุกไฟล์ใน folder
python -m tests.simulation_comparator --dir test_results/

# บันทึก report
python -m tests.simulation_comparator --dir test_results/ --output report.json
```

**Features:**

- วิเคราะห์ความสม่ำเสมอ (Consistency Analysis)
- หา Outliers
- เปรียบเทียบ slot-by-slot
- รายงาน Route statistics

### 4. Pytest Tests - ทดสอบอัตโนมัติ

```bash
# รัน tests ทั้งหมด
pytest tests/test_simulation_consistency.py -v

# กำหนดจำนวนรอบและ threshold
pytest tests/ --runs=10 --threshold=25 -v

# รันเฉพาะ test class
pytest tests/test_simulation_consistency.py::TestSimulationConsistency -v
```

## 📊 ตัวอย่าง Output

### Batch Runner Output:

```
🚀 Starting batch simulation: 10 runs
📂 Input file: tests/sample_input.json
--------------------------------------------------
▶️  Running simulation 1/10... ✅ Done (2.34s)
▶️  Running simulation 2/10... ✅ Done (2.21s)
...

============================================================
📊 COMPARISON REPORT
============================================================

📈 Summary Metrics Statistics:
----------------------------------------

  average_waiting_time:
    Mean:   5.2341
    Median: 5.1892
    StDev:  0.4521
    Range:  [4.5123 - 6.0142]
    CV:     8.64%


🔍 Consistency Analysis:
----------------------------------------
  average_waiting_time: Very Good (CV=8.64%)
  average_queue_length: Good (CV=12.31%)
  average_utilization: Excellent (CV=3.21%)
```

### Comparator Report:

```
📊 SIMULATION COMPARISON REPORT
======================================================================

📋 Overview:
   Total Batches:        3
   Successful Runs:      30
   Failed Runs:          0
   Anomalies Found:      2

📈 Summary Metrics Analysis:
----------------------------------------------------------------------
Metric                         Mean      StDev       CV%  Consistency
----------------------------------------------------------------------
average_waiting_time          5.2341     0.4521     8.64% Very Good
average_queue_length          2.1234     0.2615    12.31% Good
average_utilization           0.7523     0.0242     3.21% Excellent
```

## 📝 การสร้าง Input File

Input file ต้องเป็น JSON ที่ตรงกับ `SimulationRequest` schema:

```json
{
  "time_period": "06.00-09.00",
  "time_slot": 30,
  "configuration_data": {
    "station_list": [...],
    "route_pair": [...],
    "interarrival_data": [...],
    "alighting_data": [...]
  },
  "scenario_data": [...]
}
```

ดูตัวอย่างเต็มได้ที่ `tests/sample_input.json`

## 🔍 Metrics ที่วิเคราะห์

### Summary Metrics:

- `average_waiting_time` - เวลารอเฉลี่ย
- `average_queue_length` - ความยาว queue เฉลี่ย
- `average_utilization` - อัตราการใช้งานรถ
- `average_travel_time` - เวลาเดินทางเฉลี่ย
- `average_travel_distance` - ระยะทางเฉลี่ย

### Consistency Assessment:

| CV%    | Assessment |
| ------ | ---------- |
| < 5%   | Excellent  |
| 5-10%  | Very Good  |
| 10-20% | Good       |
| 20-35% | Moderate   |
| > 35%  | Poor       |

## 🛠️ Dependencies

```
salabim
pydantic
pytest
pytest-benchmark  # optional, for performance tests
```

## 💡 Tips

1. **เริ่มต้นด้วย 5 รอบ** - ถ้า CV สูง ให้เพิ่มเป็น 10-20 รอบ
2. **ดู CV%** - ถ้า CV > 30% อาจมีปัญหากับ simulation หรือ input
3. **ตรวจสอบ Outliers** - ค่าที่อยู่ไกลจาก mean อาจบ่งบอกถึง edge cases
4. **ใช้ sample_input.json เป็น template** - แก้ไขตาม scenario ที่ต้องการ
