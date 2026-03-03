python -m tests.summary_precision -i tests/sample_input.json -r 50 -o summary_report.json

# Simulation Testing Tools

เครื่องมือสำหรับทดสอบ simulation อัตโนมัติ - รันหลายรอบและเปรียบเทียบผลลัพธ์

## 📁 ไฟล์ในโฟลเดอร์นี้

```
tests/
├── __init__.py
├── README.md                         # ไฟล์นี้
├── sample_input.json                 # ตัวอย่าง input สำหรับทดสอบ
├── sample_actual_values.json         # ตัวอย่างค่าจริงสำหรับ accuracy analyzer
├── accuracy_analyzer.py              # 🎯 วิเคราะห์ accuracy โดยเทียบกับค่าจริง (1 รอบ)
├── accuracy_batch_analyzer.py        # 🎯 รัน accuracy หลายรอบและแสดงสถิติ
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

### 2. 🎯 Accuracy Analyzer - วิเคราะห์ความแม่นยำโดยเทียบกับค่าจริง (แนะนำ)

```bash
# วิเคราะห์ accuracy โดยเทียบกับค่าจริง
python -m tests.accuracy_analyzer --input tests/sample_input.json --actual tests/sample_actual_values.json

# บันทึกผลลัพธ์
python -m tests.accuracy_analyzer -i tests/sample_input.json -a tests/sample_actual_values.json -o accuracy_report.json
```

**Format ของไฟล์ actual values (JSON):**

```json
{
  "waiting_time": 5.2, // ค่าเฉลี่ย waiting time ที่เป็นจริง (นาที)
  "utilization": 0.75, // ค่าเฉลี่ย utilization ที่เป็นจริง (0-1)
  "stations": {
    // waiting time แต่ละสถานี (ถ้ามี)
    "หอพักหญิง 6": 3.5,
    "คณะวิศวกรรมศาสตร์": 4.2
  },
  "routes": {
    "utilization": {
      // utilization แต่ละเส้นทาง (ถ้ามี)
      "route_id_1": 0.8
    },
    "waiting_time": {
      // waiting time แต่ละเส้นทาง (ถ้ามี)
      "route_id_1": 5.5
    }
  }
}
```

**Output:**

```
======================================================================
📊 ACCURACY ANALYSIS REPORT
======================================================================

🎯 OVERALL SUMMARY:
----------------------------------------------------------------------
  🕐 Waiting Time:
     Actual: 5.20 min
     Predicted: 5.35 min
     Error: 0.15 min (2.88%)
     ✓ Accuracy: 97.12%

  📈 Utilization:
     Actual: 0.75
     Predicted: 0.73
     Error: 0.0200 (2.67%)
     ✓ Accuracy: 97.33%

📈 AGGREGATE METRICS:
----------------------------------------------------------------------
  🕐 Waiting Time (across 15 measurements):
     MAPE (Mean Absolute % Error): 3.45%
     RMSE (Root Mean Square Error): 0.2341
     ✓ Overall Accuracy: 96.55%

  📈 Utilization (across 8 measurements):
     MAPE (Mean Absolute % Error): 2.87%
     RMSE (Root Mean Square Error): 0.0234
     ✓ Overall Accuracy: 97.13%
```

**Metrics ที่คำนวณ:**

- **Absolute Error** - ส่วนต่างสัมบูรณ์ระหว่างค่าจริงและค่าจาก simulation
- **Relative Error** - เปอร์เซ็นต์ความคลาดเคลื่อนเทียบกับค่าจริง
- **Accuracy** - ความแม่นยำ (100% - Relative Error)
- **MAPE** - Mean Absolute Percentage Error (ค่าเฉลี่ยของ % error)
- **RMSE** - Root Mean Square Error (วัดความแตกต่างโดยรวม)

### 2.5 🎯 Accuracy Batch Analyzer - รัน accuracy หลายรอบ

```bash
# รัน accuracy 10 รอบ แล้วแสดงสถิติ
python -m tests.accuracy_batch_analyzer --input tests/sample_input.json --actual tests/sample_actual_values.json --runs 10

# แสดงรายละเอียดแต่ละรอบ
python -m tests.accuracy_batch_analyzer -i tests/sample_input.json -a tests/sample_actual_values.json -r 10 --detailed

# บันทึกผลลัพธ์
python -m tests.accuracy_batch_analyzer -i tests/sample_input.json -a tests/sample_actual_values.json -r 10 -o test_results/
```

**Options:**

- `--input, -i` : Path ไปยังไฟล์ JSON input
- `--actual, -a` : Path ไปยังไฟล์ actual values
- `--runs, -r` : จำนวนรอบที่ต้องการรัน (default: 10)
- `--output, -o` : Folder สำหรับเก็บผลลัพธ์ (default: test_results)
- `--detailed` : แสดงรายละเอียดแต่ละรอบ

**Output:**

```
🚀 Starting accuracy batch analysis: 10 runs
...
▶️  Run 1/10... ✅ Done (2.34s)
▶️  Run 2/10... ✅ Done (2.21s)
...

======================================================================
📊 ACCURACY BATCH ANALYSIS REPORT
======================================================================

📈 Batch Summary:
   Total Runs: 10
   Successful: 10
   Failed: 0

🕐 Waiting Time Accuracy (across 10 runs):
   ✓ Mean:    97.12%
   📊 Median: 97.25%
   📉 StDev:  1.23%
   📊 Range:  94.56% ~ 99.12%
   Error Mean: 2.88%
   Error StDev: 1.23%

📈 Utilization Accuracy (across 10 runs):
   ✓ Mean:    97.33%
   📊 Median: 97.45%
   📉 StDev:  0.87%
   📊 Range:  95.67% ~ 98.92%
   Error Mean: 2.67%
   Error StDev: 0.87%

✅ Assessment:
   Waiting Time: Excellent (97.12% accuracy)
   Utilization: Excellent (97.33% accuracy)
```

**ได้ JSON file ที่บันทึก:**

- จำนวนรอบรวม, สำเร็จ, ล้มเหลว
- สถิติความแม่นยำ (mean, median, stdev, min, max)
- รายละเอียดแต่ละรอบ

### 3. 🔬 Precision Analyzer - วิเคราะห์ความแม่นยำ (แนะนำ)

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

### 4. Comparator - เปรียบเทียบผลลัพธ์หลาย batch

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

### 5. Pytest Tests - ทดสอบอัตโนมัติ

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

## 💡 Tips และการเลือกเครื่องมือ

### เข้าใจความต่างของเครื่องมือ:

| เครื่องมือ                     | ใช้เมื่อ                                     | ตัวอย่าง                                                                     |
| ------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------- |
| **accuracy_analyzer.py**       | ต้องการวิเคราะห์ 1 รอบ เทียบกับค่าจริง       | `python -m tests.accuracy_analyzer -i input.json -a actual.json`             |
| **accuracy_batch_analyzer.py** | รัน accuracy หลายรอบเพื่อดูสถิติ (มีค่าจริง) | `python -m tests.accuracy_batch_analyzer -i input.json -a actual.json -r 10` |
| **precision_analyzer.py**      | วิเคราะห์ความสม่ำเสมอ (ไม่รู้ค่าจริง)        | `python -m tests.precision_analyzer -i input.json -r 10`                     |
| **simulation_batch_runner.py** | เก็บผลลัพธ์หลายรอบ (ไม่วิเคราะห์อะไร)        | `python -m tests.simulation_batch_runner -i input.json -r 10`                |

**ความต่างหลัก:**

- **Accuracy** = เปรียบเทียบกับค่าจริง (ต้องรู้ค่าจริง)
  - 1 รอบ: ใช้ `accuracy_analyzer.py`
  - หลายรอบ: ใช้ `accuracy_batch_analyzer.py`
- **Precision** = วัดความสม่ำเสมอ (ไม่ต้องรู้ค่าจริง)
  - ใช้ `precision_analyzer.py` (ดู CV%, standard deviation)

**ตัวอย่าง:**

- ถ้า simulation ให้ผลลัพธ์ 5.2, 5.3, 5.1 (precision สูง) แต่ค่าจริงคือ 8.0 (accuracy ต่ำ)

### คำแนะนำการใช้งาน:

1. **ถ้ามีค่าจริง (Actual Values):**
   - **รัน 1 รอบ:** ใช้ `accuracy_analyzer.py` เพื่อดูว่าถูกต้องหรือไม่
   - **รัน 10+ รอบ:** ใช้ `accuracy_batch_analyzer.py` เพื่อดูความน่าเชื่อถือ (ทำให้ได้ผลประมาณเดิมไหม)

2. **ถ้าไม่มีค่าจริง:**
   - ใช้ `precision_analyzer.py` เพื่อดูว่าผลลัพธ์สม่ำเสมอหรือไม่ (CV%)
   - ค่อยรัน batch runner เพื่อเก็บผลลัพธ์ดู

3. **ตรวจสอบ Thresholds:**
   - **Accuracy MAPE > 20%** → อาจมีปัญหา
   - **Precision CV > 30%** → ผลลัพธ์ไม่สม่ำเสมอ
   - **Accuracy StDev > 3%** → ผลลัพธ์แกว่งไปมา (ต้อง debug)

4. **ตรวจสอบ Outliers** - ค่าที่อยู่ไกลจาก mean อาจบ่งบอกถึง edge cases

5. **ใช้ sample_input.json เป็น template** - แก้ไขตาม scenario ที่ต้องการ
