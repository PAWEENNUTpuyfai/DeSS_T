# InterArrival Data Persistence - Testing & Examples

## Quick Test: Load Saved InterArrival Data

### 1. Test Python Service Directly

```python
# File: test_interarrival_loader.py
from app.services.interarrival_loader_service import InterArrivalLoaderService, load_interarrival_data

# Test 1: Load all data
print("🔍 Test 1: Load all interarrival data")
data = load_interarrival_data()
if data:
    print(f"✅ Loaded {len(data)} station records")
    for record in data:
        print(f"  - {record.get('station_name')}: {record.get('Distribution')}")
else:
    print("⚠️  No interarrival data file found")

# Test 2: Get stations
print("\n🔍 Test 2: Get all stations")
stations = InterArrivalLoaderService.get_all_stations()
print(f"✅ Found {len(stations)} stations:")
for station in stations:
    print(f"  - {station}")

# Test 3: Get distribution for specific station
print("\n🔍 Test 3: Get distribution for specific station")
station_name = "Station 1" if stations else None
if station_name:
    dist = InterArrivalLoaderService.get_distribution_for_station(station_name)
    if dist:
        print(f"✅ Distribution for {station_name}:")
        print(f"  Type: {dist['Distribution']}")
        print(f"  Args: {dist['ArgumentList']}")
    else:
        print(f"❌ No data found for {station_name}")

# Test 4: Check if data exists
print("\n🔍 Test 4: Check if data exists")
has_data = InterArrivalLoaderService.has_interarrival_data()
print(f"Has interarrival data: {has_data}")

# Test 5: File path info
print("\n🔍 Test 5: File location")
file_path = InterArrivalLoaderService.get_data_file_path()
print(f"File path: {file_path}")
print(f"Exists: {file_path.exists()}")
```

Run the test:

```bash
cd D:\DeSS_T\DeSS_T_Backend-python
python -m pytest tests/test_interarrival_loader.py -v
# Or run directly:
python -c "from app.services.interarrival_loader_service import *; print(load_interarrival_data())"
```

### 2. Example: Using in Combined Simulation

**Option A: Fallback to File if Not in Request**

```python
# File: app/services/combined_simulation_runner.py
from app.services.interarrival_loader_service import InterArrivalLoaderService

def run_combined(request: CombinedSimulationRequest):
    print("[🚀 DEBUG] Running combined simulation")

    # Check request for InterArrival data
    interarrival_data = None
    if request.discrete_simulation and request.discrete_simulation.get("InterArrivalData"):
        interarrival_data = request.discrete_simulation["InterArrivalData"]
        print(f"[✅ DEBUG] Using InterArrival data from request ({len(interarrival_data)} stations)")

    # Otherwise load from saved file
    if not interarrival_data:
        interarrival_data = InterArrivalLoaderService.load_interarrival_data()
        if interarrival_data:
            print(f"[✅ DEBUG] Using saved InterArrival data from file ({len(interarrival_data)} stations)")
        else:
            print("[⚠️  DEBUG] No InterArrival data found (using defaults)")

    # Continue with simulation using interarrival_data...
```

**Option B: Prefer Saved File (for consistent behavior)**

```python
def run_combined(request: CombinedSimulationRequest):
    print("[🚀 DEBUG] Running combined simulation")

    # Always try to load from file first (most recent config)
    interarrival_data = InterArrivalLoaderService.load_interarrival_data()

    if not interarrival_data and request.discrete_simulation:
        # Fall back to request data if file not available
        interarrival_data = request.discrete_simulation.get("InterArrivalData")
        if interarrival_data:
            print(f"[✅ DEBUG] Using request InterArrival data ({len(interarrival_data)} stations)")

    if interarrival_data:
        print(f"[✅ DEBUG] Using {len(interarrival_data)} station records")
    else:
        print("[⚠️  DEBUG] No InterArrival data available")
```

### 3. Integration with Discrete Simulation

```python
# File: app/services/discrete_simulation_runner.py or similar

from app.services.interarrival_loader_service import InterArrivalLoaderService

def create_discrete_simulation(request, language="en"):
    """Create discrete event simulation using Salabim"""

    print("[🚀 DEBUG] Creating discrete simulation")

    # Load saved configuration
    saved_config = InterArrivalLoaderService.load_interarrival_data()

    if saved_config:
        print(f"[✅ DEBUG] Loaded {len(saved_config)} station configurations from file")

        # Build station configurations from saved data
        stations_config = {}
        for record in saved_config:
            station_name = record.get("station_name", "Unknown")
            stations_config[station_name] = {
                "distribution": record.get("Distribution", "Poisson"),
                "args": record.get("ArgumentList", "5")
            }

        print(f"[✅ DEBUG] Building stations: {list(stations_config.keys())}")
    else:
        print("[⚠️  DEBUG] No saved config, using defaults")
        stations_config = {}

    # Continue creating simulation...
    return simulation_object
```

### 4. Frontend Integration Test (cURL/PowerShell)

**Step 1: Save Configuration**

```powershell
# PowerShell script: test_save_config.ps1

$config = @{
    ConfigurationDetail = @{
        NetworkModel = @{
            name = "Test Network 1"
        }
        InterArrivalData = @(
            @{
                station_name = "Station 1"
                Distribution = "Poisson"
                ArgumentList = "5"
            },
            @{
                station_name = "Station 2"
                Distribution = "Exponential"
                ArgumentList = "3.5"
            }
        )
    }
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/config/save-configuration" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $config

Write-Host "✅ Configuration saved successfully"
$response | ConvertTo-Json -Depth 10 | Write-Host
```

**Step 2: Verify File Was Created**

```powershell
# Check if file exists
if (Test-Path ".\uploads\interarrival_data.json") {
    Write-Host "✅ File created at: $(Resolve-Path '.\uploads\interarrival_data.json')"

    # View content
    $content = Get-Content ".\uploads\interarrival_data.json" -Raw | ConvertFrom-Json
    Write-Host "📊 File contains $($content.Count) station records:"
    $content | ForEach-Object { Write-Host "  - $($_.station_name): $($_.Distribution)" }
} else {
    Write-Host "❌ File not found!"
}
```

**Step 3: Test Combined Simulation with Loaded Data**

```powershell
# test_combined_with_loaded_config.ps1

$simulationRequest = @{
    discrete_simulation = @{
        # Don't include InterArrivalData - let it load from file
        number_of_line = 1
        number_of_station = 2
    }
    user_id = "guest"
} | ConvertTo-Json

Write-Host "🚀 Running combined simulation (will load InterArrival data from file)"

$response = Invoke-RestMethod `
    -Uri "http://localhost:8001/api/compute/calculate_combined" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $simulationRequest

Write-Host "✅ Simulation completed"
Write-Host $response | ConvertTo-Json -Depth 10
```

### 5. Debug Checks

```python
# File: test_interarrival_debug.py

import json
from pathlib import Path

# Check 1: File existence
file_path = Path("uploads/interarrival_data.json")
print(f"[📁 CHECK] File exists: {file_path.exists()}")
print(f"[📁 CHECK] File path: {file_path.absolute()}")

if file_path.exists():
    # Check 2: File size
    size = file_path.stat().st_size
    print(f"[📁 CHECK] File size: {size} bytes")

    # Check 3: Content
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
        print(f"[✅ CHECK] Valid JSON with {len(data)} records")

        # Check 4: Each record
        for i, record in enumerate(data):
            print(f"  [{i}] {record.get('station_name')}: {record.get('Distribution')}")

    except json.JSONDecodeError as e:
        print(f"[❌ CHECK] Invalid JSON: {e}")

    except Exception as e:
        print(f"[❌ CHECK] Error reading file: {e}")
else:
    print("[⚠️  CHECK] File will be created on first config save")
```

### 6. Full Workflow Test

```bash
#!/bin/bash
# test_full_workflow.sh

echo "🧪 InterArrival Data Persistence Test"
echo "====================================="

# Start backend (if not running)
echo "✅ Assuming backends are running..."

# Step 1: Save configuration
echo ""
echo "Step 1️⃣  Saving configuration with InterArrival data..."
curl -X POST http://localhost:8000/api/config/save-configuration \
  -H "Content-Type: application/json" \
  -d '{
    "ConfigurationDetail": {
      "InterArrivalData": [
        {"station_name": "St1", "Distribution": "Poisson", "ArgumentList": "5"},
        {"station_name": "St2", "Distribution": "Exponential", "ArgumentList": "3"}
      ]
    }
  }' \
  | jq '.'

# Step 2: Check file
echo ""
echo "Step 2️⃣  Checking if file was created..."
if [ -f "uploads/interarrival_data.json" ]; then
    echo "✅ File exists!"
    echo "📊 Content:"
    cat uploads/interarrival_data.json | jq '.'
else
    echo "❌ File not found!"
fi

# Step 3: Run simulation (loads data from file)
echo ""
echo "Step 3️⃣  Running simulation (will load InterArrival data from file)..."
curl -X POST http://localhost:8001/api/compute/calculate_combined \
  -H "Content-Type: application/json" \
  -d '{
    "discrete_simulation": {
      "number_of_line": 1,
      "number_of_station": 2
    },
    "user_id": "test"
  }' \
  | jq '.discrete_results | keys'

echo ""
echo "✅ Test complete!"
```

## Expected Output

When everything works correctly:

```
[✅ SAVED] InterArrival data saved to uploads/interarrival_data.json (2 records)

[📡 ROUTE] POST /api/compute/calculate_combined received
[✅ DEBUG] Using saved InterArrival data from file (2 stations)
[✅ DEBUG] Discrete simulation created with stations: Station 1, Station 2
[✅ SAVED] Discrete simulation saved to uploads/simulations/discrete_simulation_*.json
```

## Troubleshooting

### File not created

```
❌ Symptoms: uploads/interarrival_data.json doesn't exist after saving config
✅ Fix: Check Go backend logs for SaveInterArrivalData() errors
✅ Fix: Verify InterArrivalData is being sent in config request
```

### File exists but Python can't read

```
❌ Symptoms: load_interarrival_data() returns None but file exists
✅ Fix: Check JSON validity: cat uploads/interarrival_data.json | python -m json.tool
✅ Fix: Check file permissions: chmod 644 uploads/interarrival_data.json
```

### Simulation not using saved data

```
❌ Symptoms: Simulation runs but ignores saved config
✅ Fix: Check Python logs for "Using saved InterArrival data"
✅ Fix: Verify combined_simulation_runner.py imports InterArrivalLoaderService
✅ Fix: Verify InterArrivalLoaderService.load_interarrival_data() is called
```

## Performance Note

The service loads file on each call. For repeated calls, consider caching:

```python
class CachedInterArrivalService:
    _cache = None
    _cache_time = None
    _cache_duration = 60  # seconds

    @classmethod
    def load_cached(cls):
        import time
        now = time.time()

        if cls._cache is not None and \
           cls._cache_time is not None and \
           (now - cls._cache_time) < cls._cache_duration:
            return cls._cache

        cls._cache = InterArrivalLoaderService.load_interarrival_data()
        cls._cache_time = now
        return cls._cache
```
