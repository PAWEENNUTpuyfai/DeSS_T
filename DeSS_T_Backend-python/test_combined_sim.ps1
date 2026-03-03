# Combined Simulation Test Script (PowerShell)
# Usage: .\test_combined_sim.ps1
# Note: For Windows PowerShell 5.1+ and PowerShell Core

param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$OutputFile = "test_response.json"
)

Write-Host "=================================================="
Write-Host "Combined Simulation API Test (PowerShell)"
Write-Host "=================================================="
Write-Host ""

$ApiUrl = "$BaseUrl/api/simulate-combined"
Write-Host "Testing API endpoint: $ApiUrl"
Write-Host ""

# Build request payload
$RequestPayload = @{
    time_period = "08:00-12:00"
    time_slot = 60
    day_template = @{
        arrivals = @(
            @{station_name = "Central Station"; arrival_time = "08:00:00"},
            @{station_name = "Central Station"; arrival_time = "08:02:30"},
            @{station_name = "Central Station"; arrival_time = "08:05:00"},
            @{station_name = "North Station"; arrival_time = "08:08:00"},
            @{station_name = "North Station"; arrival_time = "08:15:00"},
            @{station_name = "South Station"; arrival_time = "08:12:00"},
            @{station_name = "Central Station"; arrival_time = "09:00:00"},
            @{station_name = "North Station"; arrival_time = "09:05:00"},
            @{station_name = "South Station"; arrival_time = "09:10:00"}
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
            },
            @{
                route_pair_id = "P3"
                fst_station = "South Station"
                snd_station = "Central Station"
                travel_time = 18.0
                distance = 15.5
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
            route_name = "Route 1 (Central-North-South)"
            route_order = "P1$P2"
            route_schedule = @(
                @{departure_time = "08:00:00"},
                @{departure_time = "08:30:00"},
                @{departure_time = "09:00:00"},
                @{departure_time = "09:30:00"}
            )
            bus_information = @{
                bus_speed = 40.0
                max_distance = 100.0
                max_bus = 3
                bus_capacity = 50
                avg_travel_time = 35.0
            }
        },
        @{
            route_id = "R2"
            route_name = "Route 2 (South-Central-North)"
            route_order = "P3$P1"
            route_schedule = @(
                @{departure_time = "08:15:00"},
                @{departure_time = "08:45:00"},
                @{departure_time = "09:15:00"}
            )
            bus_information = @{
                bus_speed = 40.0
                max_distance = 100.0
                max_bus = 2
                bus_capacity = 45
                avg_travel_time = 33.0
            }
        }
    )
    output_filename = "test_run"
} | ConvertTo-Json -Depth 10

Write-Host "Sending request..."
Write-Host ""

try {
    # Send request
    $Response = Invoke-WebRequest `
        -Uri $ApiUrl `
        -Method Post `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $RequestPayload `
        -ErrorAction Stop

    Write-Host "✅ Request successful! (Status: $($Response.StatusCode))"
    Write-Host ""

    # Parse response
    $Result = $Response.Content | ConvertFrom-Json

    # Save raw response
    $Response.Content | Out-File -FilePath $OutputFile -Encoding UTF8

    # Display summary
    Write-Host "=================================================="
    Write-Host "RESPONSE SUMMARY"
    Write-Host "=================================================="
    Write-Host ""

    Write-Host "📊 Regular Simulation Results:"
    $regularSummary = $Result.regular_simulation.result_summary
    Write-Host "  Avg Waiting Time: $($regularSummary.average_waiting_time | FormatFloat) min"
    Write-Host "  Avg Queue Length: $($regularSummary.average_queue_length | FormatFloat)"
    Write-Host "  Avg Utilization:  $($regularSummary.average_utilization | FormatPercent)"
    Write-Host "  Avg Travel Time:  $($regularSummary.average_travel_time | FormatFloat) min"
    Write-Host ""

    Write-Host "📊 Discrete Simulation Results:"
    $discreteSummary = $Result.discrete_simulation.result_summary
    Write-Host "  Total Passengers: $($discreteSummary.total_passengers)"
    Write-Host "  Avg Waiting Time: $($discreteSummary.average_waiting_time | FormatFloat) min"
    Write-Host "  Min/Max Waiting:  $($discreteSummary.min_waiting_time | FormatFloat)/$($discreteSummary.max_waiting_time | FormatFloat) min"
    Write-Host "  Avg Queue Length: $($discreteSummary.average_queue_length | FormatFloat)"
    Write-Host "  Avg Utilization:  $($discreteSummary.average_utilization | FormatPercent)"
    Write-Host ""

    Write-Host "📁 Saved File:"
    Write-Host "  Filename: $($Result.saved_file.filename)"
    Write-Host "  Path: $($Result.saved_file.path)"
    Write-Host "  Size: $($Result.saved_file.size) bytes"
    Write-Host ""

    # Calculate differences
    $waitDiff = $discreteSummary.average_waiting_time - $regularSummary.average_waiting_time
    $utilDiff = $discreteSummary.average_utilization - $regularSummary.average_utilization
    $waitDiffPercent = ($waitDiff / $regularSummary.average_waiting_time) * 100

    Write-Host "=================================================="
    Write-Host "METRICS COMPARISON"
    Write-Host "=================================================="
    Write-Host ""
    Write-Host "Waiting Time:"
    Write-Host "  Regular: $($regularSummary.average_waiting_time | FormatFloat) min"
    Write-Host "  Discrete: $($discreteSummary.average_waiting_time | FormatFloat) min"
    Write-Host "  Difference: $($waitDiff | FormatFloat) min ($([Math]::Round($waitDiffPercent, 1))%)"
    Write-Host ""
    Write-Host "Utilization:"
    Write-Host "  Regular: $($regularSummary.average_utilization | FormatPercent)"
    Write-Host "  Discrete: $($discreteSummary.average_utilization | FormatPercent)"
    Write-Host "  Difference: $($utilDiff | FormatPercent)"
    Write-Host ""

    Write-Host "=================================================="
    Write-Host "✅ Test completed successfully!"
    Write-Host "Full response saved to: $OutputFile"
    Write-Host "=================================================="

} catch {
    Write-Host "❌ Request failed!"
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host ""
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        Write-Host "Response:"
        Write-Host $_.Exception.Response.Content
    }
}

# Helper functions
function FormatFloat {
    param([double]$Value)
    return [Math]::Round($Value, 2)
}

function FormatPercent {
    param([double]$Value)
    return "{0:P1}" -f $Value
}
