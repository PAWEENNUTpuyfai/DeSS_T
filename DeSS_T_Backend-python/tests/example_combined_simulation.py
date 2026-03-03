"""
Example usage of Combined Simulation.

This demonstrates running both regular and discrete simulations together
with the same configuration and day template.
"""

from app.schemas.CombinedSimulation import CombinedSimulationRequest
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
from app.schemas.DiscreteSimulation import (
    DayTemplate,
    PassengerArrival,
)
from app.services.combined_simulation_runner import run_combined_simulation


def create_example_day_template():
    """Create an example day template"""
    return DayTemplate(
        arrivals=[
            # Morning arrivals at Central
            PassengerArrival(station_name="Central", arrival_time="08:00:00"),
            PassengerArrival(station_name="Central", arrival_time="08:05:15"),
            PassengerArrival(station_name="Central", arrival_time="08:10:30"),
            PassengerArrival(station_name="Central", arrival_time="08:15:45"),
            # North station arrivals
            PassengerArrival(station_name="North", arrival_time="08:08:00"),
            PassengerArrival(station_name="North", arrival_time="08:18:30"),
            PassengerArrival(station_name="North", arrival_time="08:25:00"),
            # South station arrivals
            PassengerArrival(station_name="South", arrival_time="08:12:00"),
            PassengerArrival(station_name="South", arrival_time="08:22:00"),
        ]
    )


def create_example_configuration():
    """Create example configuration"""
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
        alighting_data=[
            SimData(
                time_range="08:00-12:00",
                records=[
                    DisRecord(station="Central", Distribution="Uniform", ArgumentList="0.1,0.2"),
                    DisRecord(station="North", Distribution="Uniform", ArgumentList="0.1,0.2"),
                    DisRecord(station="South", Distribution="Uniform", ArgumentList="0.1,0.2"),
                ]
            )
        ],
        interarrival_data=[
            SimData(
                time_range="08:00-12:00",
                records=[
                    DisRecord(station="Central", Distribution="Poisson", ArgumentList="5"),
                    DisRecord(station="North", Distribution="Poisson", ArgumentList="3"),
                    DisRecord(station="South", Distribution="Poisson", ArgumentList="4"),
                ]
            )
        ]
    )


def create_example_scenario():
    """Create example scenario"""
    return [
        ScenarioData(
            route_id="R1",
            route_name="Route 1 (Central-North-South)",
            route_order="P1$P2",
            route_schedule=[
                RouteSchedule(departure_time="08:00:00"),
                RouteSchedule(departure_time="08:30:00"),
                RouteSchedule(departure_time="09:00:00"),
                RouteSchedule(departure_time="09:30:00"),
            ],
            bus_information=RouteBusInformation(
                bus_speed=40.0,
                max_distance=100.0,
                max_bus=3,
                bus_capacity=50,
                avg_travel_time=35.0
            )
        ),
        ScenarioData(
            route_id="R2",
            route_name="Route 2 (South-Central-North)",
            route_order="P3$P1",
            route_schedule=[
                RouteSchedule(departure_time="08:15:00"),
                RouteSchedule(departure_time="08:45:00"),
                RouteSchedule(departure_time="09:15:00"),
            ],
            bus_information=RouteBusInformation(
                bus_speed=40.0,
                max_distance=100.0,
                max_bus=2,
                bus_capacity=45,
                avg_travel_time=33.0
            )
        ),
    ]


def run_example_combined_simulation():
    """Run combined simulation example"""
    print("=" * 80)
    print("COMBINED SIMULATION EXAMPLE")
    print("=" * 80)
    print()
    
    # Create components
    day_template = create_example_day_template()
    configuration_data = create_example_configuration()
    scenario_data = create_example_scenario()
    
    # Create combined request
    request = CombinedSimulationRequest(
        time_period="08:00-10:00",
        time_slot=60,
        day_template=day_template,
        configuration_data=configuration_data,
        scenario_data=scenario_data,
        output_filename="example_discrete_sim"
    )
    
    print("Running combined simulation...")
    print(f"  Time period: {request.time_period}")
    print(f"  Day template passengers: {len(day_template.arrivals)}")
    print(f"  Routes: {len(scenario_data)}")
    print()
    
    # Run combined simulation
    result = run_combined_simulation(request)
    
    # Display results
    print("=" * 80)
    print("RESULTS - REGULAR SIMULATION (Distribution-Based)")
    print("=" * 80)
    
    regular_summary = result.regular_simulation.result_summary
    print(f"\n📊 Summary:")
    print(f"  Avg. Waiting Time: {regular_summary.average_waiting_time:.2f} min")
    print(f"  Avg. Queue Length: {regular_summary.average_queue_length:.2f}")
    print(f"  Avg. Utilization: {regular_summary.average_utilization:.1%}")
    print(f"  Avg. Travel Time: {regular_summary.average_travel_time:.2f} min")
    print(f"  Avg. Travel Distance: {regular_summary.average_travel_distance:.2f} km")
    
    print(f"\n🏢 Per Station:")
    for station_result in result.regular_simulation.result_station:
        print(f"  {station_result.station_name}:")
        print(f"    Waiting: {station_result.average_waiting_time:.2f} min")
        print(f"    Queue: {station_result.average_queue_length:.2f}")
    
    # Display discrete results if available
    if result.discrete_simulation:
        print("\n" + "=" * 80)
        print("RESULTS - DISCRETE SIMULATION (Day Template)")
        print("=" * 80)
        
        discrete_summary = result.discrete_simulation.result_summary
        print(f"\n📊 Summary:")
        print(f"  Total Passengers: {discrete_summary.total_passengers}")
        print(f"  Avg. Waiting Time: {discrete_summary.average_waiting_time:.2f} min")
        print(f"  Min/Max Waiting: {discrete_summary.min_waiting_time:.2f}/{discrete_summary.max_waiting_time:.2f} min")
        print(f"  Avg. Queue Length: {discrete_summary.average_queue_length:.2f}")
        print(f"  Avg. Utilization: {discrete_summary.average_utilization:.1%}")
        print(f"  Avg. Travel Time: {discrete_summary.average_travel_time:.2f} min")
        print(f"  Avg. Travel Distance: {discrete_summary.average_travel_distance:.2f} km")
    
    # Display file info
    if result.saved_file:
        print("\n" + "=" * 80)
        print("📁 SAVED FILE")
        print("=" * 80)
        print(f"  Filename: {result.saved_file.filename}")
        print(f"  Path: {result.saved_file.path}")
        print(f"  Size: {result.saved_file.size} bytes")
        print(f"  Created: {result.saved_file.created_at}")
    
    # Display comparison
    print("\n" + "=" * 80)
    print("📈 COMPARISON")
    print("=" * 80)
    
    print(f"\nRegular vs Discrete Simulation:")
    print(f"  Waiting Time:")
    print(f"    Regular: {regular_summary.average_waiting_time:.2f} min")
    if result.discrete_simulation:
        print(f"    Discrete: {discrete_summary.average_waiting_time:.2f} min")
        diff = discrete_summary.average_waiting_time - regular_summary.average_waiting_time
        print(f"    Difference: {diff:+.2f} min ({diff/regular_summary.average_waiting_time*100:+.1f}%)")
    
    print(f"\n  Utilization:")
    print(f"    Regular: {regular_summary.average_utilization:.1%}")
    if result.discrete_simulation:
        print(f"    Discrete: {discrete_summary.average_utilization:.1%}")
        diff = discrete_summary.average_utilization - regular_summary.average_utilization
        print(f"    Difference: {diff:+.1%}")
    
    print("\n" + "=" * 80)
    print("✅ Combined Simulation Completed!")
    print("=" * 80)


if __name__ == "__main__":
    run_example_combined_simulation()
