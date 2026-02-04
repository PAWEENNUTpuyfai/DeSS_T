package services

import (
	"DeSS_T_Backend-go/models"
	"sort"
	"strconv"
	"strings"

)

func TransformSimulationRequest(
	scenario models.ScenarioDetail,
	cfg models.ConfigurationDetail,
	timePeriods string,
	timeSlot string,
) models.SimulationRequest {

	scenarioData := TransformScenario(scenario, timePeriods)
	configurationData := TransformConfiguration(cfg, scenario, timePeriods)
	return models.SimulationRequest{
		TimePeriod:        timePeriods,
		TimeSlot:          timeSlot,
		ConfigurationData: configurationData,
		ScenarioData:      scenarioData,
	}
}

func buildRouteOrder(orders []models.Order) string {
	sort.Slice(orders, func(i, j int) bool {
		return orders[i].Order < orders[j].Order
	})

	ids := make([]string, 0, len(orders))
	for _, o := range orders {
		ids = append(ids, o.StationPairID)
	}

	return strings.Join(ids, "$")
}

func indexBusScenario(
	busScenarios models.BusScenario,
	timePeriods string,
) (map[string][]string, map[string]models.BusInformation) {

	scheduleMap := make(map[string][]string)
	busInfoMap := make(map[string]models.BusInformation)

	for _, sch := range busScenarios.ScheduleData {

		rawTimes := strings.Split(sch.ScheduleList, ",")
		filtered := make([]string, 0)

		for _, t := range rawTimes {
			t = strings.TrimSpace(t)

			if isTimeInPeriod(t, timePeriods) {
				filtered = append(filtered, t)
			}
		}

		// ใส่เฉพาะเวลาที่ผ่าน filter
		if len(filtered) > 0 {
			scheduleMap[sch.RoutePathID] = filtered
		}
	}

	for _, bi := range busScenarios.BusInformations {
		busInfoMap[bi.RoutePathID] = bi
	}

	return scheduleMap, busInfoMap
}


func TransformScenario(
	scenario models.ScenarioDetail,
	timePeriods string,
) []models.ScenarioData {

	var result []models.ScenarioData

	scheduleMap, busInfoMap := indexBusScenario(scenario.BusScenario, timePeriods)

	rs := scenario.RouteScenario
	for _, rp := range rs.RoutePaths {

		routeOrder := buildRouteOrder(rp.Orders)

		var schedules []models.RouteSchedule
		for _, t := range scheduleMap[rp.RoutePathID] {
			schedules = append(schedules, models.RouteSchedule{
				DepartureTime: strings.TrimSpace(t),
			})
		}

		bi := busInfoMap[rp.RoutePathID]

		result = append(result, models.ScenarioData{
			RouteID:       rp.RoutePathID,
			RouteName:     rp.Name,
			RouteOrder:    routeOrder,
			RouteSchedule: schedules,
			RouteBusInformation: models.RouteBusInformation{
				BusSpeed:    float64(bi.Speed),
				MaxDistance: float64(bi.MaxDis),
				MaxBus:      bi.MaxBus,
				BusCapacity: bi.Capacity,
				AvgTravelTime: float64(bi.AvgTravelTime),
			},
		})
	}
	

	return result
}
func TransformConfiguration(
	cfg models.ConfigurationDetail,
	scenario models.ScenarioDetail,
	timePeriods string,
) models.ConfigurationData {

	usedPairIDs := collectUsedPairIDs(scenario.RouteScenario.RoutePaths)

	routePairs := make([]models.RoutePair, 0)
	usedStations := make(map[string]struct{})

	for _, sp := range cfg.NetworkModel.StationPairs {

		if _, ok := usedPairIDs[sp.StationPairID]; !ok {
			continue
		}

		routePairs = append(routePairs, models.RoutePair{
			RoutePairID: sp.StationPairID,
			FstStation:  sp.FstStationID,
			SndStation:  sp.SndStationID,
			TravelTime:  sp.RouteBetween.TravelTime,
			Distance:    sp.RouteBetween.Distance,
		})

		// เก็บ station ที่ถูกใช้งานจริง
		usedStations[sp.FstStationID] = struct{}{}
		usedStations[sp.SndStationID] = struct{}{}
	}

	stationList := make([]models.StationList, 0)

	for _, s := range cfg.NetworkModel.StationDetails {

		if _, ok := usedStations[s.StationDetailID]; !ok {
			continue
		}

		stationList = append(stationList, models.StationList{
			StationID:   s.StationDetailID,
			StationName: s.Name,
		})
	}

	alightingFitItems := AlightingDataToFitItems(cfg.AlightingData)

	alightingData := groupFitItemsToSimData(
		alightingFitItems,
		timePeriods,
		usedStations,
	)

	interArrivalFitItems := InterArrivalDataToFitItems(cfg.InterArrivalData)

	interarrivalData := groupFitItemsToSimData(
		interArrivalFitItems,
		timePeriods,
		usedStations,
	)
	
	return models.ConfigurationData{
		StationList:         stationList,
		RoutePair:           routePairs,
		AlightingSimData:    alightingData,
		InterarrivalSimData: interarrivalData,
	}
}

func AlightingDataToFitItems(
	data []models.AlightingData,
) []models.FitItem {

	items := make([]models.FitItem, 0, len(data))

	for _, d := range data {
		items = append(items, models.FitItem{
			Station:      d.StationID,          // หรือ d.StationDetail.StationName
			TimeRange:    d.TimePeriod,
			Distribution: d.Distribution,
			ArgumentList: d.ArgumentList,
		})
	}

	return items
}

func InterArrivalDataToFitItems(
	data []models.InterArrivalData,
) []models.FitItem {

	items := make([]models.FitItem, 0, len(data))

	for _, d := range data {
		items = append(items, models.FitItem{
			Station:      d.StationID,
			TimeRange:    d.TimePeriod,
			Distribution: d.Distribution,
			ArgumentList: d.ArgumentList,
		})
	}

	return items
}

func groupFitItemsToSimData(
	items []models.FitItem,
	timePeriods string,
	usedStations map[string]struct{},
) []models.SimData {
	
	groups := make(map[string][]models.DisRecord)

	for _, item := range items {

		// filter ตาม time
		if !isTimeRangeInPeriod(item.TimeRange, timePeriods) {
			continue
		}

		// filter ตาม station ที่ใช้งานจริง
		if _, ok := usedStations[item.Station]; !ok {
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
	parts := strings.Split(t, ":")
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
func isTimeInPeriod(timeStr, period string) bool {
	pr := strings.Split(period, "-")

	t := timeToMinute(timeStr)
	start := timeToMinute(pr[0])
	end := timeToMinute(pr[1])

	return t >= start && t < end
}

func collectUsedPairIDs(routes []models.RoutePath) map[string]struct{} {
	used := make(map[string]struct{})

	for _, rp := range routes {
		for _, o := range rp.Orders {
			used[o.StationPairID] = struct{}{}
		}
	}
	return used
}
