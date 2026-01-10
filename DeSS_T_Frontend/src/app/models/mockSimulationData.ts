import type { SimulationResponse } from "./SimulationModel";

// Mock simulation data for Output page previews (interactive map & dashboard)
export const mockSimulationResponse: SimulationResponse = {
    result: "success",
    simulation_result: {
        result_summary: {
            average_waiting_time: 13,
            average_queue_length: 5,
            average_utilization: 0.24,
            average_travel_time: 18,
            average_travel_distance: 48,
        },
        slot_results: [
            {
                slot_name: "08:00-09:00",
                result_total_station: {
                    average_waiting_time: 11,
                    average_queue_length: 3,
                },
                result_station: [
                    {
                        station_name: "ศูนย์ ขส.มช.",
                        average_waiting_time: 11,
                        average_queue_length: 3,
                    },
                    {
                        station_name: "ประตูเชียงใหม่",
                        average_waiting_time: 12,
                        average_queue_length: 4,
                    },
                ],
                result_route: [
                    {
                        route_id: "สาย 1",
                        average_utilization: 0.26,
                        average_travel_time: 17,
                        average_travel_distance: 9,
                        average_waiting_time: 12,
                        average_queue_length: 4,
                        customers_count: 120,
                    },
                    {
                        route_id: "สาย 2",
                        average_utilization: 0.22,
                        average_travel_time: 19,
                        average_travel_distance: 8,
                        average_waiting_time: 13,
                        average_queue_length: 5,
                        customers_count: 105,
                    },
                ],
            },
        ],
    },
    logs: []
};
