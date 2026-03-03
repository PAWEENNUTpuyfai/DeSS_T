"""
Example usage of the Discrete Event Simulation.

This file demonstrates how to use the discrete simulation endpoint
with specific passenger arrival times (day template).
"""

from app.schemas.DiscreteSimulation import (
    DiscreteSimulationRequest,
    DayTemplate,
    PassengerArrival,
)
from app.schemas.Simulation import (
    ConfigurationData,
    ScenarioData,
    RouteSchedule,
    RouteBusInformation,
    station,
    RoutePair,
    SimData,
    DisRecord,
)
from app.services.discrete_simulation_runner import run_discrete_simulation


def create_example_day_template():
    """Create an example day template with specific passenger arrivals"""
    return DayTemplate(
        arrivals=[
            # Morning rush: Central station
            PassengerArrival(station_name="Central", arrival_time="08:00:00"),
            PassengerArrival(station_name="Central", arrival_time="08:05:15"),
            PassengerArrival(station_name="Central", arrival_time="08:10:30"),
            PassengerArrival(station_name="Central", arrival_time="08:15:45"),
            PassengerArrival(station_name="Central", arrival_time="08:20:00"),
            # North station arrivals
            PassengerArrival(station_name="North", arrival_time="08:12:00"),
            PassengerArrival(station_name="North", arrival_time="08:18:30"),
            PassengerArrival(station_name="North", arrival_time="08:25:00"),
            # South station arrivals
            PassengerArrival(station_name="South", arrival_time="08:15:00"),
            PassengerArrival(station_name="South", arrival_time="08:22:00"),
            # Mid-morning: more arrivals
            PassengerArrival(station_name="Central", arrival_time="09:00:00"),
            PassengerArrival(station_name="Central", arrival_time="09:15:30"),
            PassengerArrival(station_name="North", arrival_time="09:05:00"),
        ]
    )


def create_example_configuration():
    """Create example configuration data (stations and routes)"""
    return ConfigurationData(
        station_list=[
            station(station_id="S1", station_name="Central"),
            station(station_id="S2", station_name="North"),
            station(station_id="S3", station_name="South"),
        ],
        route_pair=[
            RoutePair(
                route_pair_id="P1",
                fst_station="Central",
                snd_station="North",
                travel_time=15.0,
                distance=12.5
            ),
            RoutePair(
                route_pair_id="P2",
                fst_station="North",
                snd_station="South",
                travel_time=20.0,
                distance=18.0
            ),
            RoutePair(
                route_pair_id="P3",
                fst_station="South",
                snd_station="Central",
                travel_time=18.0,
                distance=15.5
            ),
        ],
        # Note: For discrete simulation, alighting_data is used for route definitions
        # but actual probabilities are not used (all data is in day template)
        alighting_data=[
            SimData(
                time_range="08:00-20:00",
                records=[
                    DisRecord(
                        station="Central",
                        Distribution="Uniform",
                        ArgumentList="0.1,0.2"
                    ),
                    DisRecord(
                        station="North",
                        Distribution="Uniform",
                        ArgumentList="0.1,0.2"
                    ),
                    DisRecord(
                        station="South",
                        Distribution="Uniform",
                        ArgumentList="0.1,0.2"
                    ),
                ]
            )
        ],
        # For discrete simulation, interarrival_data is not used
        # (arrivals come from day_template)
        interarrival_data=[]
    )


def create_example_scenario():
    """Create example scenario data (bus schedules and info)"""
    return [
        ScenarioData(
            route_id="R1",
            route_name="Route 1 (Central-North-South)",
            route_order="P1$P2",  # Central -> North -> South
            route_schedule=[
                RouteSchedule(departure_time="08:00:00"),
                RouteSchedule(departure_time="08:30:00"),
                RouteSchedule(departure_time="09:00:00"),
                RouteSchedule(departure_time="09:30:00"),
                RouteSchedule(departure_time="10:00:00"),
            ],
            bus_information=RouteBusInformation(
                bus_speed=40.0,
                max_distance=50.0,
                max_bus=3,
                bus_capacity=50,
                avg_travel_time=35.0
            )
        ),
        ScenarioData(
            route_id="R2",
            route_name="Route 2 (South-Central-North)",
            route_order="P3$P1",  # South -> Central -> North
            route_schedule=[
                RouteSchedule(departure_time="08:15:00"),
                RouteSchedule(departure_time="08:45:00"),
                RouteSchedule(departure_time="09:15:00"),
                RouteSchedule(departure_time="09:45:00"),
            ],
            bus_information=RouteBusInformation(
                bus_speed=40.0,
                max_distance=50.0,
                max_bus=2,
                bus_capacity=45,
                avg_travel_time=33.0
            )
        ),
    ]


def run_example_discrete_simulation():
    """
    Run an example discrete event simulation.
    
    This demonstrates:
    - Creating a day template with specific passenger arrivals
    - Running the discrete simulation
    - Analyzing the results
    """
    print("=" * 70)
    print("DISCRETE EVENT SIMULATION EXAMPLE")
    print("=" * 70)
    
    # Create request components
    day_template = create_example_day_template()
    configuration_data = create_example_configuration()
    scenario_data = create_example_scenario()
    
    # Create simulation request
    request = DiscreteSimulationRequest(
        time_period="08:00-10:00",
        time_slot=60,
        day_template=day_template,
        configuration_data=configuration_data,
        scenario_data=scenario_data
    )
    
    print("\nRunning discrete event simulation...")
    print(f"Time period: {request.time_period}")
    print(f"Total passengers in day template: {len(day_template.arrivals)}")
    print()
    
    # Run simulation
    result = run_discrete_simulation(request)
    
    # Display results
    print("=" * 70)
    print("SIMULATION RESULTS")
    print("=" * 70)
    
    summary = result.simulation_result.result_summary
    print("\n📊 SUMMARY METRICS:")
    print(f"  Total Passengers: {summary.total_passengers}")
    print(f"  Avg. Waiting Time: {summary.average_waiting_time:.2f} minutes")
    print(f"  Max Waiting Time: {summary.max_waiting_time:.2f} minutes")
    print(f"  Avg. Queue Length: {summary.average_queue_length:.2f} passengers")
    print(f"  Avg. Bus Utilization: {summary.average_utilization:.1%}")
    print(f"  Avg. Travel Time: {summary.average_travel_time:.2f} minutes")
    print(f"  Avg. Travel Distance: {summary.average_travel_distance:.2f} km")
    
    print("\n🏢 PER-STATION METRICS:")
    for station_result in result.simulation_result.result_station:
        print(f"\n  {station_result.station_name}:")
        print(f"    Passengers: {station_result.passengers_count}")
        print(f"    Avg. Waiting Time: {station_result.average_waiting_time:.2f} min")
        print(f"    Avg. Queue Length: {station_result.average_queue_length:.2f}")
    
    print("\n🚌 PER-ROUTE METRICS:")
    for route_result in result.simulation_result.result_route:
        print(f"\n  {route_result.route_id}:")
        print(f"    Customers: {route_result.customers_count}")
        print(f"    Avg. Utilization: {route_result.average_utilization:.1%}")
        print(f"    Avg. Waiting Time: {route_result.average_waiting_time:.2f} min")
        print(f"    Avg. Travel Time: {route_result.average_travel_time:.2f} min")
        print(f"    Avg. Travel Distance: {route_result.average_travel_distance:.2f} km")
    
    print("\n📝 SAMPLE SIMULATION LOGS (First 10):")
    for i, log in enumerate(result.logs[:10]):
        print(f"  [{log.time}] {log.component}: {log.message}")
    
    print("\n" + "=" * 70)
    print("✅ Simulation completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    run_example_discrete_simulation()
