package services

import (
	"DeSS_T_Backend-go/models"
	"encoding/json"
	"fmt"
	"os"
    "path/filepath" 
    "strings"
)

func LoadDiscreteSimulationFile(configDetailID string) (*models.DiscreteSimulation, error) {
    // กำหนด Path ให้ชัดเจน
    folderPath := filepath.Join("storage", "simulations")
    filePath := filepath.Join(folderPath, fmt.Sprintf("%s.json", configDetailID))

    // --- DEBUG: เช็คว่าในโฟลเดอร์มีไฟล์อะไรบ้าง ---
    files, err := os.ReadDir(folderPath)
    if err != nil {
        return nil, fmt.Errorf("ไม่สามารถเปิดโฟลเดอร์ %s ได้: %v", folderPath, err)
    }
    
    fmt.Println("--- รายชื่อไฟล์ที่ระบบมองเห็นในโฟลเดอร์ simulation ---")
    for _, f := range files {
        fmt.Printf("- %s\n", f.Name())
    }
    fmt.Println("--------------------------------------------------")
    // ------------------------------------------

    file, err := os.ReadFile(filePath)
    if err != nil {
        return nil, fmt.Errorf("อ่านไฟล์ไม่ได้ที่ %s: %v", filePath, err)
    }

    var data models.DiscreteSimulation
    if err := json.Unmarshal(file, &data); err != nil {
        return nil, err
    }
    return &data, nil
}
func filterArrivalListByPeriodAndStation(
    rawArrivals []models.ArrivalList, 
    usedStations map[string]struct{},
    timePeriods string, // รับค่าเช่น "08:00-16:00"
) []models.ArrivalList {
    
    var result []models.ArrivalList

    for _, arrival := range rawArrivals {
        // 1. ตรวจสอบว่าสถานีนี้อยู่ในเส้นทางที่เลือกไหม
        if _, ok := usedStations[arrival.StationID]; !ok {
            continue
        }

        var filteredDays []models.ArrivalTimeEntry

        // 2. Loop เข้าไปในแต่ละวัน (Day 1, Day 2, ...)
        for _, dayEntry := range arrival.ArrivalTimeData {
            var filteredTimes []string

            // 3. ตรวจสอบเวลา "ทีละตัว" ใน ArrivalTimes []string
            for _, arrivalTime := range dayEntry.ArrivalTimes {
                // ตรวจสอบว่า arrivalTime (เช่น "08:01") อยู่ใน period หรือไม่
                if isTimeInPeriodD(arrivalTime, timePeriods) {
                    filteredTimes = append(filteredTimes, arrivalTime)
                }
            }

            // ถ้าวันนั้นมีเวลาที่อยู่ในช่วงเหลืออยู่ ให้เก็บข้อมูลวันนั้นไว้
            if len(filteredTimes) > 0 {
                filteredDays = append(filteredDays, models.ArrivalTimeEntry{
                    Date:         dayEntry.Date,
                    ArrivalTimes: filteredTimes,
                })
            }
        }

        // ถ้าสถานีนี้มีข้อมูลวันเหลืออยู่ ให้เก็บสถานีนี้ไว้ในผลลัพธ์
        if len(filteredDays) > 0 {
            result = append(result, models.ArrivalList{
                StationID:       arrival.StationID,
                ArrivalTimeData: filteredDays,
            })
        }
    }
    return result
}
func TransformDiscreteConfiguration(
    cfg models.ConfigurationDetail,
    scenario models.ScenarioDetail,
    discreteFile models.DiscreteSimulation,
    timePeriods string,
) models.DiscreteConfigurationData {

    // --- 1. ส่วนการจัดการ Station และ RoutePair (เหมือนเดิม) ---
    usedPairIDs := collectUsedPairIDs(scenario.RouteScenario.RoutePaths)
    routePairs := make([]models.RoutePair, 0)
    usedStations := make(map[string]struct{})

    for _, sp := range cfg.NetworkModel.StationPairs {
        if _, ok := usedPairIDs[sp.StationPairID]; !ok { continue }
        routePairs = append(routePairs, models.RoutePair{
            RoutePairID: sp.StationPairID,
            FstStation:  sp.FstStationID,
            SndStation:  sp.SndStationID,
            TravelTime:  sp.RouteBetween.TravelTime,
            Distance:    sp.RouteBetween.Distance,
        })
        usedStations[sp.FstStationID] = struct{}{}
        usedStations[sp.SndStationID] = struct{}{}
    }

    // (ส่วนการสร้าง stationList เหมือนเดิม...)
    stationList := make([]models.StationList, 0)
    for _, s := range cfg.NetworkModel.StationDetails {
        if _, ok := usedStations[s.StationDetailID]; !ok { continue }
        stationList = append(stationList, models.StationList{
            StationID:   s.StationDetailID,
            StationName: s.Name,
        })
    }

    // --- 2. Alighting Data (เหมือนเดิม) ---
    alightingFitItems := AlightingDataToFitItems(cfg.AlightingData)
    alightingSimData := groupFitItemsToSimData(alightingFitItems, timePeriods, usedStations)

    // --- 3. Arrival List: กรองทั้งสถานี และ กรองเวลาตาม Period ---
    // กรอง ArrivalList ตามสถานี และ กรองเวลาทีละตัวตาม Period
    filteredArrivalList := filterArrivalListByPeriodAndStation(discreteFile.ArrivalList, usedStations, timePeriods)

    return models.DiscreteConfigurationData{
        StationList:      stationList,
        RoutePair:        routePairs,
        AlightingSimData: alightingSimData,
        ArrivalList:      filteredArrivalList, 
    }
}

func TransformDiscreteSimulationRequest(
    scenario models.ScenarioDetail,
    cfg models.ConfigurationDetail,
    discreteFile models.DiscreteSimulation, // ข้อมูลที่โหลดจากไฟล์
    timePeriods string,
    timeSlot string,
) models.DiscreteSimulationRequest {

    // ใช้ TransformScenario เดิมที่คุณมีได้เลย เพราะโครงสร้าง ScenarioData เหมือนเดิม
    scenarioData := TransformScenario(scenario, timePeriods)

    // สร้าง DiscreteConfigurationData
    discreteConfig := TransformDiscreteConfiguration(cfg, scenario, discreteFile, timePeriods)

    return models.DiscreteSimulationRequest{
        TimePeriods:                timePeriods,
        TimeSlot:                  timeSlot,
        DiscreteConfigurationData: discreteConfig,
        ScenarioData:              scenarioData,
    }
}
func isTimeInPeriodD(timeStr, period string) bool {
    if timeStr == "" || period == "" {
        return false
    }
    
    pr := strings.Split(period, "-")
    if len(pr) < 2 {
        return false // รูปแบบ period ผิด (ไม่มีเครื่องหมาย -)
    }

    t := timeToMinute(timeStr)
    start := timeToMinute(pr[0])
    end := timeToMinute(pr[1])

    return t >= start && t < end
}
