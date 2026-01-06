package models

import (
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

type PaserscheduleData struct {
	ScheduleDataID string `json:"ScheduleDataID"`
    RoutePathID   string `json:"RoutePathID"`
    ScheduleList string `json:"ScheduleList"`
}

type Paserschedule struct {
	PaserscheduleData []PaserscheduleData `json:"ScheduleData"`
}




func ScheduleExcelToJsonReader(r io.Reader, projectID string) (Paserschedule, error) {
	f, err := excelize.OpenReader(r)
    if err != nil {
        return Paserschedule{}, err
    }

	sheets := f.GetSheetList()
	if len(sheets) != 1 {
		return Paserschedule{}, fmt.Errorf("excel must contain exactly 1 sheet, found %d", len(sheets))
	}

	sheetName := sheets[0]

	rows, err := f.GetRows(sheetName)
	if err != nil {
		return Paserschedule{}, err
	}

	if len(rows) < 2 {
		return Paserschedule{}, fmt.Errorf("excel has no schedule data")
	}

	var result Paserschedule
	colCount := len(rows[0])
	scheduleDataID := 1
	for col := 0; col < colCount; col++ {
		routePathName := strings.TrimSpace(rows[0][col])
		if routePathName == "" {
			continue
		}

		var times []string
		for row := 1; row < len(rows); row++ {
			if col >= len(rows[row]) {
				continue
			}

			timeValue := strings.TrimSpace(rows[row][col])
			if timeValue != "" {
				times = append(times, timeValue)
			}
		}

		result.PaserscheduleData = append(result.PaserscheduleData, PaserscheduleData{
			ScheduleDataID: strconv.Itoa(scheduleDataID),
			RoutePathID:    fmt.Sprintf("%s-%s", routePathName, projectID),
			ScheduleList:   strings.Join(times, ","),
		})
		scheduleDataID++
	}

	return result, nil
}



// func ScheduleExcelToJson(path string, projectID string) (Paserschedule, error) {
// 	f, err := excelize.OpenFile(path)
// 	if err != nil {
// 		return Paserschedule{}, err
// 	}

// 	sheets := f.GetSheetList()
// 	if len(sheets) != 1 {
// 		return Paserschedule{}, fmt.Errorf("excel must contain exactly 1 sheet, found %d", len(sheets))
// 	}

// 	sheetName := sheets[0]

// 	rows, err := f.GetRows(sheetName)
// 	if err != nil {
// 		return Paserschedule{}, err
// 	}

// 	if len(rows) < 2 {
// 		return Paserschedule{}, fmt.Errorf("excel has no schedule data")
// 	}

// 	var result Paserschedule
// 	colCount := len(rows[0])
// 	routePathName := 1
// 	for col := 0; col < colCount; col++ {
// 		RoutePathName := strings.TrimSpace(rows[0][col])
// 		if RoutePathName == "" {
// 			continue
// 		}

// 		var times []string
// 		for row := 1; row < len(rows); row++ {
// 			if col >= len(rows[row]) {
// 				continue
// 			}

// 			timeValue := strings.TrimSpace(rows[row][col])
// 			if timeValue != "" {
// 				times = append(times, timeValue)
// 			}
// 		}

// 		result.PaserscheduleData = append(result.PaserscheduleData, PaserscheduleData{
// 			ScheduleDataID: routePathName,
// 			RoutePathID:    fmt.Sprintf("%s-%s", RoutePathName, projectID),
// 			ScheduleList:   strings.Join(times, ","),
// 		})
// 	}

// 	return result, nil
// }