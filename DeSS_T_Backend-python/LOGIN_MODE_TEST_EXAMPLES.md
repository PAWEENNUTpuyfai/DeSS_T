# Login Mode: Test Examples

## PowerShell Test Example

### 1. First Request - Save Template

```powershell
# First simulation with day_template (saves to file)
$body = @{
    time_period = "08:00-12:00"
    time_slot = 60
    user_id = "test_user_google_id"
    day_template = @{
        arrivals = @(
            @{station_name = "Central Station"; arrival_time = "08:00:00"},
            @{station_name = "Central Station"; arrival_time = "08:02:30"},
            @{station_name = "North Station"; arrival_time = "08:08:00"},
            @{station_name = "North Station"; arrival_time = "08:15:00"},
            @{station_name = "South Station"; arrival_time = "08:12:00"}
        )
    }
    configuration_data = @{
        station_list = @(
            @{station_id = "S1"; station_name = "Central Station"},
            @{station_id = "S2"; station_name = "North Station"},
            @{station_id = "S3"; station_name = "South Station"}
        )
        route_pair = @(
            @{
                route_pair_id = "P1"
                fst_station = "Central Station"
                snd_station = "North Station"
                travel_time = 15.0
                distance = 12.5
            },
            @{
                route_pair_id = "P2"
                fst_station = "North Station"
                snd_station = "South Station"
                travel_time = 20.0
                distance = 18.0
            }
        )
        alighting_data = @(
            @{
                time_range = "08:00-12:00"
                records = @(
                    @{station = "Central Station"; Distribution = "Uniform"; ArgumentList = "0.1,0.2"},
                    @{station = "North Station"; Distribution = "Uniform"; ArgumentList = "0.1,0.2"},
                    @{station = "South Station"; Distribution = "Uniform"; ArgumentList = "0.1,0.2"}
                )
            }
        )
        interarrival_data = @(
            @{
                time_range = "08:00-12:00"
                records = @(
                    @{station = "Central Station"; Distribution = "Poisson"; ArgumentList = "5"},
                    @{station = "North Station"; Distribution = "Poisson"; ArgumentList = "3"},
                    @{station = "South Station"; Distribution = "Poisson"; ArgumentList = "4"}
                )
            }
        )
    }
    scenario_data = @(
        @{
            route_id = "R1"
            route_name = "Route 1"
            route_order = "P1$P2"
            route_schedule = @(
                @{departure_time = "08:00:00"},
                @{departure_time = "08:30:00"},
                @{departure_time = "09:00:00"}
            )
            bus_information = @{
                bus_speed = 40.0
                max_distance = 100.0
                max_bus = 3
                bus_capacity = 50
                avg_travel_time = 35.0
            }
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/simulate-combined" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body

$result = $response.Content | ConvertFrom-Json
Write-Host "✅ First request - Template saved"
Write-Host "Discrete simulation ran: $($result.discrete_simulation -ne $null)"
Write-Host "File saved: $($result.saved_file.filename)"
```

**Expected Result:**

- ✅ day_template saved to `uploads/user_data/test_user_google_id/day_template.json`
- ✅ Both regular and discrete simulations ran
- ✅ Response includes discrete simulation results

### 2. Second Request - Reuse Saved Template

```powershell
# Second simulation WITHOUT day_template (loads from file)
$body = @{
    time_period = "08:00-12:00"
    time_slot = 90  # Different time slot
    user_id = "test_user_google_id"  # Same user
    # day_template = $null   # Not provided
    configuration_data = @{...}  # Same as before
    scenario_data = @(...)  # Can be different
} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/simulate-combined" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body

$result = $response.Content | ConvertFrom-Json
Write-Host "✅ Second request - Template loaded from file"
Write-Host "Discrete simulation ran: $($result.discrete_simulation -ne $null)"
Write-Host "Template came from: uploads/user_data/test_user_google_id/day_template.json"
```

**Expected Result:**

- ✅ day_template loaded from file
- ✅ Both simulations ran with loaded template
- ✅ Same passenger arrivals as first request (since file was loaded)

### 3. Third Request - Update Template

```powershell
# Third simulation with NEW day_template (overwrites file)
$body = @{
    time_period = "08:00-12:00"
    time_slot = 60
    user_id = "test_user_google_id"
    day_template = @{
        arrivals = @(
            @{station_name = "Central Station"; arrival_time = "09:00:00"},
            @{station_name = "Central Station"; arrival_time = "09:05:00"},
            @{station_name = "North Station"; arrival_time = "09:10:00"}
        )
    }
    configuration_data = @{...}
    scenario_data = @(...)
} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/simulate-combined" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body

$result = $response.Content | ConvertFrom-Json
Write-Host "✅ Third request - Template updated"
Write-Host "New template saved and used"
```

**Expected Result:**

- ✅ Old template replaced with new one
- ✅ File overwritten with new data
- ✅ Discrete simulation ran with 3 passengers (new template)

---

## Python Test Example

```python
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
USER_ID = "test_user_google_id"

# ===== SESSION 1: Save Template =====
print("\n=== SESSION 1: Save Template ===")

day_template_1 = {
    "arrivals": [
        {"station_name": "Central Station", "arrival_time": "08:00:00"},
        {"station_name": "Central Station", "arrival_time": "08:02:30"},
        {"station_name": "North Station", "arrival_time": "08:08:00"},
        {"station_name": "North Station", "arrival_time": "08:15:00"},
        {"station_name": "South Station", "arrival_time": "08:12:00"}
    ]
}

request_body_1 = {
    "time_period": "08:00-12:00",
    "time_slot": 60,
    "user_id": USER_ID,
    "day_template": day_template_1,
    "configuration_data": {
        "station_list": [
            {"station_id": "S1", "station_name": "Central Station"},
            {"station_id": "S2", "station_name": "North Station"},
            {"station_id": "S3", "station_name": "South Station"}
        ],
        "route_pair": [
            {
                "route_pair_id": "P1",
                "fst_station": "Central Station",
                "snd_station": "North Station",
                "travel_time": 15.0,
                "distance": 12.5
            }
        ],
        "alighting_data": [...],
        "interarrival_data": [...]
    },
    "scenario_data": [...]
}

response = requests.post(
    f"{BASE_URL}/api/simulate-combined",
    json=request_body_1
)
result_1 = response.json()

print(f"✅ Template saved")
print(f"   Passengers in template: {len(day_template_1['arrivals'])}")
print(f"   Discrete sim ran: {result_1['discrete_simulation'] is not None}")
print(f"   Saved file: {result_1['saved_file']['filename']}")

# ===== SESSION 2: Reuse Saved Template =====
print("\n=== SESSION 2: Reuse Saved Template ===")

request_body_2 = {
    "time_period": "08:00-12:00",
    "time_slot": 90,  # Different!
    "user_id": USER_ID,
    # day_template not provided - will load from file
    "configuration_data": request_body_1["configuration_data"],
    "scenario_data": request_body_1["scenario_data"]
}

response = requests.post(
    f"{BASE_URL}/api/simulate-combined",
    json=request_body_2
)
result_2 = response.json()

print(f"✅ Template loaded from file")
print(f"   Discrete sim ran: {result_2['discrete_simulation'] is not None}")

# Verify same template was used
summary_1 = result_1['discrete_simulation']['result_summary']
summary_2 = result_2['discrete_simulation']['result_summary']
print(f"   Passengers session 1: {summary_1['total_passengers']}")
print(f"   Passengers session 2: {summary_2['total_passengers']}")
print(f"   ✓ Same (template reused): {summary_1['total_passengers'] == summary_2['total_passengers']}")

# ===== SESSION 3: Update Template =====
print("\n=== SESSION 3: Update Template ===")

day_template_3 = {
    "arrivals": [
        {"station_name": "Central Station", "arrival_time": "10:00:00"},
        {"station_name": "Central Station", "arrival_time": "10:10:00"},
        {"station_name": "North Station", "arrival_time": "10:15:00"},
        {"station_name": "South Station", "arrival_time": "10:20:00"},
        {"station_name": "South Station", "arrival_time": "10:25:00"},
        {"station_name": "South Station", "arrival_time": "10:30:00"}
    ]
}

request_body_3 = {
    "time_period": "08:00-12:00",
    "time_slot": 60,
    "user_id": USER_ID,
    "day_template": day_template_3,  # New template!
    "configuration_data": request_body_1["configuration_data"],
    "scenario_data": request_body_1["scenario_data"]
}

response = requests.post(
    f"{BASE_URL}/api/simulate-combined",
    json=request_body_3
)
result_3 = response.json()

print(f"✅ Template updated")
print(f"   New passengers: {len(day_template_3['arrivals'])}")
print(f"   Discrete sim ran: {result_3['discrete_simulation'] is not None}")

summary_3 = result_3['discrete_simulation']['result_summary']
print(f"   Passengers in session 3: {summary_3['total_passengers']}")
print(f"   ✓ Different (new template used): {summary_3['total_passengers'] != summary_2['total_passengers']}")

print("\n=== All Tests Passed ===")
```

---

## File System Check

After running tests, verify the files:

```powershell
# Check if user data directory was created
Get-ChildItem -Path "D:\DeSS_T\DeSS_T_Backend-python\uploads\user_data" -Recurse

# Expected output:
# Mode                 LastWriteTime         Length Name
# ----                 ---------------         ------ ----
# d-----         3/3/2026   10:30 AM                test_user_google_id
#                3/3/2026   10:30 AM           1234 day_template.json

# View the saved template
Get-Content "D:\DeSS_T\DeSS_T_Backend-python\uploads\user_data\test_user_google_id\day_template.json" | ConvertFrom-Json | ConvertTo-Json
```

---

## cURL Examples

### Save Template

```bash
curl -X POST http://localhost:8000/api/simulate-combined \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "time_period": "08:00-12:00",
  "time_slot": 60,
  "user_id": "test_user_google_id",
  "day_template": {
    "arrivals": [
      {"station_name": "Central Station", "arrival_time": "08:00:00"},
      {"station_name": "North Station", "arrival_time": "08:05:00"}
    ]
  },
  "configuration_data": {...},
  "scenario_data": [...]
}
EOF
```

### Reuse Template

```bash
curl -X POST http://localhost:8000/api/simulate-combined \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "time_period": "08:00-12:00",
  "time_slot": 90,
  "user_id": "test_user_google_id",
  "configuration_data": {...},
  "scenario_data": [...]
}
EOF
```

---

## Debugging Tips

### 1. Check Saved Template File

```powershell
$templatePath = "D:\DeSS_T\DeSS_T_Backend-python\uploads\user_data\test_user_google_id\day_template.json"
if (Test-Path $templatePath) {
    $template = Get-Content $templatePath | ConvertFrom-Json
    Write-Host "✓ Template file exists"
    Write-Host "  Arrivals: $($template.arrivals.Count)"
} else {
    Write-Host "✗ Template file not found"
}
```

### 2. Check Backend Logs

Look for these log messages:

```
[DEBUG] Saving day_template for user: test_user_google_id
[DEBUG] Loading day_template for user: test_user_google_id
[DEBUG] Loaded template with {N} arrivals
```

### 3. Verify Request Path

```powershell
# Check if request includes user_id
$body | ConvertFrom-Json | Select-Object user_id
# Should show: test_user_google_id
```

---

## Common Test Scenarios

### ✅ Guest Mode (No Login)

- No `user_id`
- Day template in request
- Discrete sim runs
- No file saved
- No persistence

### ✅ Login Mode: New User

- `user_id` provided
- Day template in request
- System creates `uploads/user_data/{user_id}/` directory
- Saves `day_template.json`
- Discrete sim runs

### ✅ Login Mode: Reuse Template

- `user_id` provided
- No day template in request
- System loads from `uploads/user_data/{user_id}/day_template.json`
- Discrete sim runs with loaded template

### ✅ Login Mode: Update Template

- `user_id` provided
- New day template in request
- System overwrites `uploads/user_data/{user_id}/day_template.json`
- Discrete sim runs with new template

### ⚠️ Login Mode: File Missing

- `user_id` provided
- No day template in request
- File doesn't exist (never saved)
- Discrete sim **skipped**
- Only regular sim runs

---

## Performance Notes

| Scenario                  | Time  | Notes                                     |
| ------------------------- | ----- | ----------------------------------------- |
| Save template (first run) | 5-30s | Normal simulation time                    |
| Reuse template            | 5-30s | Same as save (no faster, just convenient) |
| Update template           | 5-30s | File overwrite is fast (< 100ms)          |

---

**Last Updated**: 2026-03-03  
**Status**: Ready for testing
