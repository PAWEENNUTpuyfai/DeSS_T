package services

import (
	"DeSS_T_Backend-go/models"
	"sort"
	"strconv"
	"strings"
)

func TransformSimulationRequest(
	scenario models.Scenario,
	cfg models.Configuration,
	timePeriods string,
	timeSlot string,
) models.SimulationRequest {

	scenarioData := TransformScenario(scenario)
	configurationData := TransformConfiguration(cfg, timePeriods)

	return models.SimulationRequest{
		TimePeriod:        timePeriods,
		TimeSlot:          timeSlot,
		ConfigurationData: configurationData,
		ScenarioData:      scenarioData,
	}
}

func buildRouteOrder(orders []models.Order_Path) string {
	sort.Slice(orders, func(i, j int) bool {
		return orders[i].OrderNumber < orders[j].OrderNumber
	})

	ids := make([]string, 0, len(orders))
	for _, o := range orders {
		ids = append(ids, o.StationPairID)
	}

	return strings.Join(ids, "-")
}

func indexBusScenario(
	busScenarios []models.Bus_Scenario,
) (map[string][]string, map[string]models.Bus_Information) {

	scheduleMap := make(map[string][]string)
	busInfoMap := make(map[string]models.Bus_Information)

	for _, bs := range busScenarios {

		// 1) map schedule ด้วย RoutePathID
		for _, sch := range bs.ScheduleData {
			times := strings.Split(sch.ScheduleList, ",")
			scheduleMap[sch.RoutePathID] = times
		}

		// 2) map bus information ด้วย RoutePathID (ไม่ใช้ index)
		for _, bi := range bs.BusInformation {
			busInfoMap[bi.RoutePathID] = bi
		}
	}

	return scheduleMap, busInfoMap
}

func TransformScenario(
	scenario models.Scenario,
) []models.ScenarioData {

	var result []models.ScenarioData

	scheduleMap, busInfoMap := indexBusScenario(scenario.Bus_Scenario)

	for _, rs := range scenario.Route_Scenario {
		for _, rp := range rs.RoutePath {

			routeOrder := buildRouteOrder(rp.Order)

			var schedules []models.RouteSchedule
			for _, t := range scheduleMap[rp.RoutePathID] {
				schedules = append(schedules, models.RouteSchedule{
					DepartureTime: strings.TrimSpace(t),
				})
			}

			bi := busInfoMap[rp.RoutePathID]

			result = append(result, models.ScenarioData{
				RouteID:       rp.RoutePathID,
				RouteName:     rp.RoutePathName,
				RouteOrder:    routeOrder,
				RouteSchedule: schedules,
				RouteBusInformation: models.RouteBusInformation{
					BusSpeed:    bi.BusSpeed,
					MaxDistance: bi.MaxDistance,
					MaxBus:      bi.MaxBuses,
					BusCapacity: bi.BusCapacity,
				},
			})
		}
	}

	return result
}
func TransformConfiguration(
	cfg models.Configuration,
	timePeriods string,
) models.ConfigurationData {

	routePairs := make([]models.RoutePair, 0)
	for _, sp := range cfg.NetworkModel.StationPairs {
		routePairs = append(routePairs, models.RoutePair{
			RoutePairID: sp.StationPairID,
			FstStation:  sp.FstStationID,
			SndStation:  sp.SndStationID,
			TravelTime:  sp.RouteBetween.TravelTime,
			Distance:    sp.RouteBetween.Distance,
		})
	}

	stationList := make([]models.StationList, 0)
	for _, s := range cfg.NetworkModel.StationDetails {
		stationList = append(stationList, models.StationList{
			StationID:   s.StationDetailID,
			StationName: s.Name,
		})
	}

	alightingData := groupFitItemsToSimData(
		cfg.AlightingDistribution.DataFitResponse,
		timePeriods,
	)

	interarrivalData := groupFitItemsToSimData(
		cfg.InterarrivalDistribution.DataFitResponse,
		timePeriods,
	)

	return models.ConfigurationData{
		StationList:         stationList,
		RoutePair:           routePairs,
		AlightingSimData:    alightingData,
		InterarrivalSimData: interarrivalData,
	}
}

func groupFitItemsToSimData(
	items []models.FitItem,
	timePeriods string,
) []models.SimData {

	groups := make(map[string][]models.DisRecord)

	for _, item := range items {

		if !isTimeRangeInPeriod(item.TimeRange, timePeriods) {
			continue
		}

		rec := models.DisRecord{
			Station:      item.Station,
			Distribution: item.Distribution,
			ArgumentList: item.ArgumentList,
		}

		groups[item.TimeRange] = append(groups[item.TimeRange], rec)
	}

	result := make([]models.SimData, 0)
	for tr, recs := range groups {
		result = append(result, models.SimData{
			TimeRange:  tr,
			DisRecords: recs,
		})
	}

	return result
}

func timeToMinute(t string) int {
	parts := strings.Split(t, ".")
	hour := atoi(parts[0])
	min := 0
	if len(parts) > 1 {
		min = atoi(parts[1])
	}
	return hour*60 + min
}

func atoi(s string) int {
	v, _ := strconv.Atoi(s)
	return v
}

func isTimeRangeInPeriod(timeRange, period string) bool {

	tr := strings.Split(timeRange, "-")
	pr := strings.Split(period, "-")

	trStart := timeToMinute(tr[0])
	prStart := timeToMinute(pr[0])
	prEnd := timeToMinute(pr[1])

	return trStart >= prStart && trStart < prEnd
}
