# Testing Combined Simulation API

This guide provides instructions for testing the combined simulation endpoint using both bash (Linux/macOS) and PowerShell (Windows).

## Prerequisites

1. **Python Backend Running**

   ```powershell
   # Windows PowerShell - from DeSS_T_Backend-python directory
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

   # OR if you have configured your Python environment
   # (from repository root)
   python -m uvicorn DeSS_T_Backend-python.app.main:app --reload --port 8000
   ```

2. **API Available at**
   - Default: `http://localhost:8000`
   - Check docs at: `http://localhost:8000/docs` (Swagger UI)

## Testing on Windows (PowerShell)

### Quick Start

```powershell
# From DeSS_T_Backend-python directory
.\test_combined_sim.ps1
```

### With Custom Options

```powershell
# Specify custom base URL
.\test_combined_sim.ps1 -BaseUrl "http://localhost:8001"

# Specify output file location
.\test_combined_sim.ps1 -OutputFile "my_response.json"

# Both options
.\test_combined_sim.ps1 -BaseUrl "http://localhost:8001" -OutputFile "my_test_response.json"
```

### What the Script Tests

1. **Request Creation**: Builds complete combined simulation request with:
   - Day template with 9 passenger arrivals
   - Configuration data with 3 stations and 3 route pairs
   - Scenario data with 2 routes and bus information
   - Output filename for discrete results

2. **API Call**: POST to `/api/simulate-combined`

3. **Response Analysis**:
   - Parses regular simulation results
   - Parses discrete simulation results
   - Displays metrics comparison (waiting time, utilization)
   - Shows saved file information

4. **File Output**: Saves complete response to JSON file (default: `test_response.json`)

### Expected Output

```
==================================================
Combined Simulation API Test (PowerShell)
==================================================

Testing API endpoint: http://localhost:8000/api/simulate-combined

Sending request...

✅ Request successful! (Status: 200)

==================================================
RESPONSE SUMMARY
==================================================

📊 Regular Simulation Results:
  Avg Waiting Time: 5.32 min
  Avg Queue Length: 2.45
  Avg Utilization:  78.50%
  Avg Travel Time:  25.40 min

📊 Discrete Simulation Results:
  Total Passengers: 9
  Avg Waiting Time: 4.87 min
  Min/Max Waiting:  0.00/12.50 min
  Avg Queue Length: 1.82
  Avg Utilization:  72.30%

📁 Saved File:
  Filename: test_run_20250106_143022.json
  Path: uploads/simulations/test_run_20250106_143022.json
  Size: 8542 bytes

==================================================
METRICS COMPARISON
==================================================

Waiting Time:
  Regular: 5.32 min
  Discrete: 4.87 min
  Difference: -0.45 min (-8.5%)

Utilization:
  Regular: 78.50%
  Discrete: 72.30%
  Difference: -6.20%

==================================================
✅ Test completed successfully!
Full response saved to: test_response.json
==================================================
```

## Testing on Linux/macOS (Bash)

### Quick Start

```bash
# From DeSS_T_Backend-python directory
bash test_combined_sim.sh
```

### With Custom Options

```bash
# Specify custom base URL
./test_combined_sim.sh http://localhost:8001

# Specify output file
./test_combined_sim.sh http://localhost:8000 my_response.json
```

### Features (Same as PowerShell)

- Sends complete combined simulation request
- Displays metrics comparison
- Saves full response to JSON file
- Color-coded output (if terminal supports it)

## Manual Testing with curl

### Basic Request

```powershell
# PowerShell
$Body = @{
    time_period = "08:00-12:00"
    time_slot = 60
    day_template = @{
        arrivals = @(
            @{station_name = "Central Station"; arrival_time = "08:00:00"}
        )
    }
    configuration_data = @{...}
    scenario_data = @(...)
} | ConvertTo-Json -Depth 10

Invoke-WebRequest `
    -Uri "http://localhost:8000/api/simulate-combined" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $Body
```

### Using curl (PowerShell/Git Bash)

```bash
curl -X POST http://localhost:8000/api/simulate-combined \
  -H "Content-Type: application/json" \
  -d @- < request.json
```

## Testing with Python

### Direct Integration

```python
# From DeSS_T_Backend-python directory
python tests/example_combined_simulation.py
```

This runs the complete working example with all data builders.

## Troubleshooting

### Script Execution Policy Error (PowerShell)

If you get "cannot be loaded because running scripts is disabled":

```powershell
# Temporary - for current session only
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Then run the script
.\test_combined_sim.ps1
```

### Port Already in Use

```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Use different port when starting backend
python -m uvicorn app.main:app --port 8001

# Test against new port
.\test_combined_sim.ps1 -BaseUrl "http://localhost:8001"
```

### Connection Refused

1. Verify backend is running: `http://localhost:8000/docs`
2. Check backend logs for errors
3. Verify firewall allows localhost:8000

### Timeout Issues

Backend might be slow on first request (cold start). Wait a moment and retry.

## API Documentation

For complete API details, visit:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

Or read the documentation files:

- [COMBINED_SIMULATION_GUIDE.md](./COMBINED_SIMULATION_GUIDE.md) - Complete API specification
- [COMBINED_SIMULATION_FRONTEND_GUIDE.md](./COMBINED_SIMULATION_FRONTEND_GUIDE.md) - Frontend integration examples
- [README_COMBINED_SIMULATION.md](./README_COMBINED_SIMULATION.md) - Feature overview

## Performance Notes

- **First Request**: 5-30 seconds (simulation runs)
- **Subsequent Requests**: Similar time (each request runs fresh simulations)
- **File Saving**: Included in response time (< 1 second additional)

## Response Structure

```json
{
  "result": "success",
  "regular_simulation": {
    "result_summary": {...},
    "route_summary": {...}
  },
  "discrete_simulation": {
    "result_summary": {...},
    "station_summary": {...}
  },
  "saved_file": {
    "filename": "test_run_20250106_143022.json",
    "path": "uploads/simulations/test_run_20250106_143022.json",
    "size": 8542,
    "created_at": "2025-01-06T14:30:22.123456"
  },
  "logs": [...]
}
```

## Next Steps

After successful test:

1. **Review Results**: Check `test_response.json` for detailed metrics
2. **Compare Simulations**: Analyze differences between regular and discrete results
3. **Download Results**: Use `saved_file.path` for discrete simulation JSON
4. **Frontend Integration**: Follow [COMBINED_SIMULATION_FRONTEND_GUIDE.md](./COMBINED_SIMULATION_FRONTEND_GUIDE.md)
