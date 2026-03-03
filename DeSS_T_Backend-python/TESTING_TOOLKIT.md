# Combined Simulation Testing Toolkit

Complete testing utilities for the combined simulation API across all platforms.

## 📋 Test Files Overview

### 1. **test_combined_sim.sh** (Bash/Shell Script)

- **Platform**: Linux, macOS, Windows Git Bash
- **Size**: ~2.4 KB
- **Features**:
  - Color-coded output
  - Pipe-friendly JSON parsing
  - Lightweight, minimal dependencies
  - Clean output formatting

**Usage**:

```bash
bash test_combined_sim.sh
bash test_combined_sim.sh http://localhost:8001
bash test_combined_sim.sh http://localhost:8000 custom_output.json
```

### 2. **test_combined_sim.ps1** (PowerShell Script)

- **Platform**: Windows PowerShell 5.1+, PowerShell Core
- **Size**: ~8.6 KB
- **Features**:
  - Parameter support for base URL and output file
  - Proper error handling with status codes
  - Helper functions for formatting
  - Detailed metrics comparison

**Usage**:

```powershell
.\test_combined_sim.ps1
.\test_combined_sim.ps1 -BaseUrl "http://localhost:8001"
.\test_combined_sim.ps1 -OutputFile "my_test_response.json"
.\test_combined_sim.ps1 -BaseUrl "http://localhost:8001" -OutputFile "test.json"
```

### 3. **tests/example_combined_simulation.py** (Python)

- **Platform**: All (requires Python 3.8+)
- **Size**: ~220 lines
- **Features**:
  - Integrated with project dependencies
  - Function-based approach (can be imported)
  - Data builders for all required structures
  - Real simulation execution

**Usage**:

```bash
python tests/example_combined_simulation.py
```

### 4. **curl/Invoke-WebRequest**

- **Platform**: All
- **Features**:
  - Direct API testing
  - Great for debugging
  - Can pipe results to files
  - No script files needed

**Usage**:

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:8000/api/simulate-combined" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body (Get-Content request.json | ConvertFrom-Json | ConvertTo-Json -Depth 10)
```

---

## 🎯 Quick Start by Platform

### Windows Users

```powershell
# Start backend (from repo root)
cd DeSS_T_Backend-python
python -m uvicorn app.main:app --reload --port 8000

# In new PowerShell window (from DeSS_T_Backend-python)
.\test_combined_sim.ps1
```

### macOS/Linux Users

```bash
# Start backend (from repo root)
cd DeSS_T_Backend-python
python -m uvicorn app.main:app --reload --port 8000

# In new terminal (from DeSS_T_Backend-python)
bash test_combined_sim.sh
```

### Any Platform (Python)

```bash
# Start backend
python -m uvicorn DeSS_T_Backend-python.app.main:app --reload

# Run test
python DeSS_T_Backend-python/tests/example_combined_simulation.py
```

---

## 📊 Test Coverage

All test utilities verify:

| Feature                | Bash | PowerShell | Python |
| ---------------------- | ---- | ---------- | ------ |
| Day template parsing   | ✅   | ✅         | ✅     |
| Configuration building | ✅   | ✅         | ✅     |
| Scenario creation      | ✅   | ✅         | ✅     |
| API request sending    | ✅   | ✅         | ✅     |
| Response parsing       | ✅   | ✅         | ✅     |
| Metrics extraction     | ✅   | ✅         | ✅     |
| Comparison calculation | ✅   | ✅         | ✅     |
| File output            | ✅   | ✅         | ✅     |
| Error handling         | ✅   | ✅         | ✅     |

---

## 🔍 Expected Results

All tests send identical request data:

```json
{
  "time_period": "08:00-12:00",
  "time_slot": 60,
  "day_template": {
    "arrivals": [9 passenger arrivals at 3 stations]
  },
  "configuration_data": {
    "station_list": [3 stations],
    "route_pair": [3 route pairs],
    "alighting_data": [...],
    "interarrival_data": [...]
  },
  "scenario_data": [2 routes with schedules],
  "output_filename": "test_run"
}
```

Expected response structure:

- `result`: "success"
- `regular_simulation`: Regular simulation results
- `discrete_simulation`: Discrete simulation results with 9 passengers
- `saved_file`: Metadata for discrete results JSON
- `logs`: Combined logs from both simulations

---

## 🛠️ Advanced Testing

### Test Different Data Sizes

**Small Dataset** (for quick testing):

```python
# Modify example_combined_simulation.py
arrivals = [
    ("Central Station", "08:00:00"),
    ("North Station", "08:05:00"),
    ("South Station", "08:10:00"),
]
```

**Large Dataset** (for stress testing):
Generate 100+ passenger arrivals with varied patterns.

### Test Different Time Periods

```powershell
# Modify test_combined_sim.ps1
time_period = "08:00-20:00"  # 12-hour period
time_slot = 120              # 2-hour time slots
```

### Test Error Handling

```powershell
# Missing required field
$RequestPayload.day_template = $null

# Invalid time format
$RequestPayload.day_template.arrivals[0].arrival_time = "25:00:00"

# Invalid station
$RequestPayload.day_template.arrivals[0].station_name = "Unknown Station"
```

---

## 📈 Performance Testing

Test suite performance metrics:

| Test              | Time            | Memory     | Notes                          |
| ----------------- | --------------- | ---------- | ------------------------------ |
| Bash script       | <2s (test only) | <50 MB     | Fast, minimal overhead         |
| PowerShell script | <2s (test only) | <100 MB    | Slightly more parsing overhead |
| Python script     | <2s (test only) | <200 MB    | Includes simulation time       |
| Actual simulation | 5-30s           | 200-500 MB | Varies with data size          |

---

## 🐛 Debugging Tips

### 1. Check Backend Status

```powershell
# Windows - verify API is running
Invoke-WebRequest http://localhost:8000/health -Method Get
Invoke-WebRequest http://localhost:8000/docs -Method Get
```

```bash
# Linux/macOS
curl -s http://localhost:8000/docs | head -20
```

### 2. Inspect Save Response

All scripts save the complete API response to JSON:

- Bash default: `test_response.json`
- PowerShell default: `test_response.json`
- Python output: printed to console + file

See saved file location in response:

```json
"saved_file": {
  "filename": "test_run_20250106_143022.json",
  "path": "uploads/simulations/test_run_20250106_143022.json"
}
```

### 3. View Saved Discrete Results

```bash
# After running test, view the saved file
cat uploads/simulations/test_run_20250106_143022.json | jq '.'
```

### 4. Increase Logging

```bash
# Add verbose logging to backend startup
python -m uvicorn app.main:app --reload --log-level debug
```

---

## 📝 Documentation Files

For more information, see:

| File                                                                             | Purpose                        |
| -------------------------------------------------------------------------------- | ------------------------------ |
| [COMBINED_SIMULATION_GUIDE.md](./COMBINED_SIMULATION_GUIDE.md)                   | Complete API specification     |
| [COMBINED_SIMULATION_FRONTEND_GUIDE.md](./COMBINED_SIMULATION_FRONTEND_GUIDE.md) | Frontend integration guide     |
| [README_COMBINED_SIMULATION.md](./README_COMBINED_SIMULATION.md)                 | Feature overview and use cases |
| [TEST_COMBINED_SIMULATION.md](./TEST_COMBINED_SIMULATION.md)                     | Detailed testing guide         |

---

## ✅ Checklist

Before considering combined simulation ready for production:

- [ ] Run `test_combined_sim.ps1` or `bash test_combined_sim.sh` ✅
- [ ] Verify all metrics display correctly
- [ ] Check saved JSON file is created at expected path
- [ ] Test with custom data (modify day_template)
- [ ] Verify error handling (try invalid station names)
- [ ] Test different time periods
- [ ] Review response structure matches API docs
- [ ] Check performance is acceptable (< 30 seconds)
- [ ] Verify discrete results are accurate
- [ ] Compare regular vs discrete metrics for consistency
- [ ] Frontend developer ready to integrate
- [ ] Documentation reviewed

---

## 🚀 Next Steps

1. **Run tests** using your platform's script
2. **Review results** in generated JSON file
3. **Check logs** in response for any warnings
4. **Verify metrics** match expected ranges
5. **Integrate frontend** using guide in [COMBINED_SIMULATION_FRONTEND_GUIDE.md](./COMBINED_SIMULATION_FRONTEND_GUIDE.md)
6. **Deploy** to staging/production

---

Created: 2025-01-06  
Last Updated: 2025-01-06  
Status: ✅ All testing utilities operational
