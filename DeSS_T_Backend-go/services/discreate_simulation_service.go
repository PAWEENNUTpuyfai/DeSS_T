package services

import (
	"DeSS_T_Backend-go/models"
	"io"
	"strings"

	"github.com/xuri/excelize/v2"
)

func GenerateDiscreteSimulationJSON(r io.Reader, configID string, stationMap map[string]string) (models.DiscreteSimulation, error) {
    f, err := excelize.OpenReader(r)
    if err != nil {
        return models.DiscreteSimulation{}, err
    }
    defer f.Close()

    simulation := models.DiscreteSimulation{
        ConfigurationDetailID: configID,
        ArrivalList:           []models.ArrivalList{},
    }

    for _, sheet := range f.GetSheetList() {
        sheetName := strings.TrimSpace(sheet)
        
        // แปลงชื่อชีทเป็น ID จาก map
        stationID := sheetName
        if id, ok := stationMap[sheetName]; ok {
            stationID = id
        }

        rows, err := f.GetRows(sheet)
        if err != nil || len(rows) == 0 {
            continue
        }

        stationEntry := models.ArrivalList{
            StationID:       stationID, // ใช้ค่า ID ที่แปลงแล้ว
            ArrivalTimeData: []models.ArrivalTimeEntry{},
        }

        headers := rows[0]
        for colIndex, header := range headers {
            if strings.TrimSpace(header) == "" {
                continue
            }

            dayEntry := models.ArrivalTimeEntry{
                Date:         strings.TrimSpace(header),
                ArrivalTimes: []string{},
            }

            for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
                if colIndex >= len(rows[rowIndex]) {
                    continue
                }
                val := strings.TrimSpace(rows[rowIndex][colIndex])
                if val == "" {
                    continue
                }
                dayEntry.ArrivalTimes = append(dayEntry.ArrivalTimes, val)
            }

            if len(dayEntry.ArrivalTimes) > 0 {
                stationEntry.ArrivalTimeData = append(stationEntry.ArrivalTimeData, dayEntry)
            }
        }
        simulation.ArrivalList = append(simulation.ArrivalList, stationEntry)
    }

    return simulation, nil
}