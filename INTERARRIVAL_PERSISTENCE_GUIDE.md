# InterArrival Data Persistence Guide

## Overview

มีการบันทึก **InterArrival Data** เป็นไฟล์ JSON ที่แชร์ร่วมกันທั່วทั้งระบบ (ไม่ต้อง user_id)

## Architecture

```
┌─────────────────────┐
│   Frontend (UI)     │
│  Save Configuration │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│        Go Backend (Fiber)                    │
│  POST /api/config/save-configuration        │
│  (SaveUserConfiguration)                     │
└──────────┬───────────────────────────────────┘
           │
           ├─────────────────────────────────┐
           │                                 │
           ▼                                 ▼
    ┌─────────────┐            ┌─────────────────────────┐
    │   MySQL DB  │            │  uploads/interarrival_  │
    │ (GORM ORM)  │            │   data.json (Shared)    │
    └─────────────┘            └────────┬────────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │   Python Service         │
                          │ (Load when needed)       │
                          │ For Simulations          │
                          └──────────────────────────┘
```

## File Storage

**Location:** `uploads/interarrival_data.json`  
**Ownership:** Shared across all users/sessions  
**Behavior:** Overwrites on each configuration save

## Go Backend Implementation

### 1. Save (In SaveUserConfiguration)

```go
// user_confiig_service.go

func SaveInterArrivalData(interArrivalData []model_database.InterArrivalData) error {
    uploadsDir := "uploads"
    dataFile := filepath.Join(uploadsDir, "interarrival_data.json")

    // Create uploads dir if needed
    os.MkdirAll(uploadsDir, 0755)

    // Save JSON (overwrites existing)
    jsonData, _ := json.MarshalIndent(interArrivalData, "", "  ")
    ioutil.WriteFile(dataFile, jsonData, 0644)
}

func SaveUserConfiguration(input *model_database.UserConfiguration) {
    // ... transaction code ...

    // After successful transaction:
    if input.ConfigurationDetail != nil &&
       len(input.ConfigurationDetail.InterArrivalData) > 0 {
        SaveInterArrivalData(input.ConfigurationDetail.InterArrivalData)
    }
}
```

### 2. Load (Go Backend)

```go
func LoadInterArrivalData() ([]model_database.InterArrivalData, error) {
    dataFile := filepath.Join("uploads", "interarrival_data.json")

    if !fileExists(dataFile) {
        return nil, nil // File not yet created
    }

    data, _ := ioutil.ReadFile(dataFile)
    var result []model_database.InterArrivalData
    json.Unmarshal(data, &result)
    return result, nil
}
```

## Python Backend Integration

### Using InterArrivalLoaderService

```python
from app.services.interarrival_loader_service import InterArrivalLoaderService

# Load all data
data = InterArrivalLoaderService.load_interarrival_data()

# Get distribution for specific station
dist = InterArrivalLoaderService.get_distribution_for_station("Station 1")
# Returns: {"Distribution": "Poisson", "ArgumentList": "5"}

# Get all stations with data
stations = InterArrivalLoaderService.get_all_stations()

# Check if data exists
has_data = InterArrivalLoaderService.has_interarrival_data()
```

### In Combined Simulation

```python
from app.services.interarrival_loader_service import InterArrivalLoaderService

def run_combined(request: CombinedSimulationRequest):
    # Load saved interarrival data if available
    interarrival_data = InterArrivalLoaderService.load_interarrival_data()

    if interarrival_data:
        print(f"Using saved InterArrival data for {len(interarrival_data)} stations")

        for station_data in interarrival_data:
            # Use station_data["Distribution"] and station_data["ArgumentList"]
            pass
```

## File Format

```json
[
  {
    "id": 1,
    "station_name": "Station 1",
    "Distribution": "Poisson",
    "ArgumentList": "5",
    "description": "Inter-arrival time distribution"
  },
  {
    "id": 2,
    "station_name": "Station 2",
    "Distribution": "Exponential",
    "ArgumentList": "3.5",
    "description": "Inter-arrival time distribution"
  }
]
```

## Workflow

### 1. Frontend Saves Configuration

- User configures InterArrival data in UI
- Clicks "Save Configuration"
- Frontend sends to: `POST /api/config/save-configuration`

### 2. Go Backend Receives Save

```
Request arrives with ConfigurationDetail containing InterArrivalData array
│
├─ Validate data
├─ Save to MySQL (GORM transaction)
│
└─ After successful transaction:
   └─ Call SaveInterArrivalData()
      └─ Write to uploads/interarrival_data.json (overwrite)
      └─ Log success/failure
```

### 3. Python Backend Loads on Demand

```
When running simulation:
│
├─ Check request for explicit InterArrival data
│
├─ If not provided:
│  └─ Load from uploaded file
│     └─ InterArrivalLoaderService.load_interarrival_data()
│
└─ Use data in simulation configuration
```

## Testing

### Manual Test via cURL

```bash
# 1. Save configuration with InterArrival data
curl -X POST http://localhost:8000/api/config/save-configuration \
  -H "Content-Type: application/json" \
  -d '{
    "ConfigurationDetail": {
      "InterArrivalData": [
        {
          "station_name": "TestStation",
          "Distribution": "Poisson",
          "ArgumentList": "5"
        }
      ]
    }
  }'

# 2. Check that file exists
ls -la uploads/interarrival_data.json

# 3. View file content
cat uploads/interarrival_data.json
```

### Python Testing

```python
import json
from pathlib import Path

# Check file
file_path = Path("uploads/interarrival_data.json")
if file_path.exists():
    with open(file_path) as f:
        data = json.load(f)
    print(f"Found {len(data)} station records")
    for record in data:
        print(f"  - {record['station_name']}: {record['Distribution']}")
```

## Error Handling

### File Doesn't Exist

- Go backend: Creates it on first save
- Python service: Returns `None` gracefully
- Simulation: Uses request-provided data as fallback

### File I/O Errors

- Go backend: Logs warning, doesn't fail transaction
- Python service: Logs error, returns `None`
- Simulation: Falls back to request data

### Invalid JSON

- Go backend: IOUtil handles, logs error
- Python service: Catches exception, logs error

## Debugging

### Check if file was created

```bash
dir uploads\interarrival_data.json  # Windows
ls -la uploads/interarrival_data.json  # Unix
```

### View file content

```bash
type uploads\interarrival_data.json  # Windows
cat uploads/interarrival_data.json  # Unix
```

### View formatted JSON

```bash
# PowerShell
(Get-Content uploads\interarrival_data.json) | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Check Go logs

```bash
# Should see:
# ✅ SAVED: InterArrival data saved to uploads/interarrival_data.json (2 records)
```

## Key Differences from day_template

| Feature               | day_template                           | interarrival_data                        |
| --------------------- | -------------------------------------- | ---------------------------------------- |
| Per-user?             | Yes (`uploads/user_data/{user_id}/`)   | No (shared)                              |
| File path             | Dynamic                                | Fixed (`uploads/interarrival_data.json`) |
| Created when?         | First combined simulation with user_id | First config save with InterArrival data |
| Overwrite behavior    | Overwrites per-user file               | Overwrites shared file                   |
| Loaded automatically? | Yes (if user_id provided)              | Must request explicitly                  |

## Integration Checklist

- [x] Go backend: SaveInterArrivalData() function
- [x] Go backend: LoadInterArrivalData() function
- [x] Go backend: Integration in SaveUserConfiguration()
- [x] Python service: InterArrivalLoaderService class
- [ ] Python combined simulation: Use InterArrivalLoaderService
- [ ] Frontend: Test save configuration
- [ ] Frontend: Verify uploads/interarrival_data.json created
- [ ] Python simulation: Test loading saved data

## Next Steps

1. **Test from Frontend**
   - Save a configuration from the UI
   - Verify `uploads/interarrival_data.json` is created
   - Check file content matches what was sent

2. **Integrate into Combined Simulation**
   - Modify combined_simulation_runner.py to load InterArrival data from file
   - Use saved data if not provided in request

3. **Optional: Load Endpoint**
   - Create GET endpoint to retrieve saved InterArrival data
   - Allow frontend to display "Last saved configuration"

4. **Optional: Reset Function**
   - Create endpoint to clear saved InterArrival data
   - Delete uploads/interarrival_data.json
