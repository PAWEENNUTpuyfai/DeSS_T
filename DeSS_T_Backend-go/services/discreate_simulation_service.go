package services

import (
	"DeSS_T_Backend-go/models"
	"io"
	"strings"

	"github.com/xuri/excelize/v2"
)

func GenerateDiscreteSimulationJSON(r io.Reader, configID string) (models.DiscreteSimulation, error) {
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
        rows, err := f.GetRows(sheet)
        if err != nil || len(rows) == 0 {
            continue
        }

        stationEntry := models.ArrivalList{
            StationID:       sheet,
            ArrivalTimeData: []models.ArrivalTimeEntry{},
        }

        headers := rows[0] // สมมติแถวแรกคือ "Day 1", "Day 2"

        // วนตาม Column (แต่ละวัน)
        for colIndex, header := range headers {
            if strings.TrimSpace(header) == "" {
                continue
            }

            dayEntry := models.ArrivalTimeEntry{
                Date:         header,
                ArrivalTimes: []string{},
            }

            // วนตาม Row เพื่อเก็บค่าเวลา (ยังไม่คำนวณ diff)
            for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
                if colIndex >= len(rows[rowIndex]) {
                    continue
                }

                val := strings.TrimSpace(rows[rowIndex][colIndex])
                if val == "" {
                    continue
                }
                
                // เก็บค่า string ของเวลาต้นฉบับไว้ (เช่น "8:00")
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