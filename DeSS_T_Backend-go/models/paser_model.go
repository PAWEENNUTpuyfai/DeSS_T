package models

import (
	"fmt"
	"io"
	"log"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// parseTimeValue แปลงค่าเวลาจาก Excel เป็นนาทีตั้งแต่เที่ยงคืน
// รองรับหลายรูปแบบ:
// - "8:01" หรือ "08:01" -> 481 นาที (8*60 + 1)
// - "15:55" -> 955 นาที (15*60 + 55)
// - "0.354166..." (Excel serial time) -> แปลงเป็นนาที
// - "8" (เลขล้วน) -> 480 นาที (8*60)
func parseTimeValue(val string) (float64, bool) {
	// ลอง parse รูปแบบ HH:MM หรือ H:MM
	if strings.Contains(val, ":") {
		parts := strings.Split(val, ":")
		if len(parts) >= 2 {
			hour, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
			min, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
			if err1 == nil && err2 == nil {
				// คืนค่าเป็นนาทีตั้งแต่เที่ยงคืน
				return hour*60 + min, true
			}
		}
	}

	// ลอง parse เป็นตัวเลข (อาจเป็น Excel serial time หรือเลขชั่วโมง)
	var num float64
	if _, err := fmt.Sscanf(val, "%f", &num); err == nil {
		// ถ้าค่าน้อยกว่า 1 แสดงว่าเป็น Excel serial time (fraction ของวัน)
		if num < 1 {
			// แปลงเป็นนาที: num * 24 * 60
			return num * 1440, true
		}
		// ถ้าค่ามากกว่า 1 แต่น้อยกว่า 24 อาจเป็นชั่วโมง -> แปลงเป็นนาที
		if num >= 1 && num < 24 {
			return num * 60, true
		}
		// ถ้ามากกว่า 24 อาจเป็นนาทีอยู่แล้ว
		return num, true
	}

	return 0, false
}

type Record struct {
    RecordID     int     `json:"Record_ID"`
    NumericValue float64 `json:"Numeric_Value"`
}

type Item struct {
    Station        string          `json:"Station"`
    TimeRange      string          `json:"Time_Range"`
    Records []Record `json:"Records"`
}

type Data struct {
   Data []Item `json:"Data"`
}

// CalculateInterarrivalRecords คำนวณ interarrival time (ความแตกต่างระหว่างแต่ละแถว)
// จากข้อมูล arrival times ในคอลัมน์เดียวกัน
// ค่าเวลาที่รับมาเป็นนาทีตั้งแต่เที่ยงคืนแล้ว (จาก parseTimeValue)
func CalculateInterarrivalRecords(records []Record, stationName string, timeRange string) []Record {
	log.Printf("[DEBUG] CalculateInterarrivalRecords - Station: %s, TimeRange: %s, RecordCount: %d", stationName, timeRange, len(records))
	
	// แสดงค่าต้นฉบับ (แสดงไม่เกิน 10 ค่าแรก) - ค่าเป็นนาทีแล้ว
	if len(records) > 0 {
		maxShow := 10
		if len(records) < maxShow {
			maxShow = len(records)
		}
		logValues := make([]float64, maxShow)
		for i := 0; i < maxShow; i++ {
			logValues[i] = records[i].NumericValue
		}
		log.Printf("[DEBUG] Original values in MINUTES (first %d): %v", maxShow, logValues)
	}
	
	if len(records) <= 1 {
		log.Printf("[DEBUG] Not enough records for interarrival calculation (<=1)")
		return records
	}

	// ค่าเวลาเป็นนาทีแล้ว ลบกันได้เลย
	interarrivalRecs := []Record{}
	for i := 1; i < len(records); i++ {
		diff := records[i].NumericValue - records[i-1].NumericValue
		
		interarrivalRecs = append(interarrivalRecs, Record{
			RecordID:     i,
			NumericValue: diff,
		})
	}

	// แสดงค่า interarrival ที่คำนวณได้ (หน่วยนาที)
	if len(interarrivalRecs) > 0 {
		maxShow := 10
		if len(interarrivalRecs) < maxShow {
			maxShow = len(interarrivalRecs)
		}
		logValues := make([]float64, maxShow)
		for i := 0; i < maxShow; i++ {
			logValues[i] = interarrivalRecs[i].NumericValue
		}
		log.Printf("[DEBUG] Interarrival values in MINUTES (first %d): %v", maxShow, logValues)
	}

	return interarrivalRecs
}

func DistributionExcelToJSON(path string) (Data, error) {

    f, err := excelize.OpenFile(path)
    if err != nil {
        return Data{}, err
    }

    output := Data{}
    recordID := 1

    for _, sheet := range f.GetSheetList() {

        rows, _ := f.GetRows(sheet)
        if len(rows) < 2 {
            continue
        }

        headers := rows[0]

        for colIndex, header := range headers {
            if header == "" {
                continue
            }

            var recs []Record

            for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
                if colIndex >= len(rows[rowIndex]) {
                    continue
                }

                val := rows[rowIndex][colIndex]
                if val == "" {
                    continue
                }

                var num float64
                fmt.Sscanf(val, "%f", &num)

                recs = append(recs, Record{
                    RecordID:     recordID,
                    NumericValue: num,
                })
                recordID++
            }

            output.Data = append(output.Data, Item{
                Station:        sheet,
                TimeRange:      header,
                Records: recs,
            })
        }
    }

    return output, nil
}

// DistributionExcelToJSONReaderWithDayTemplate อ่าน Excel และคำนวณ interarrival แยกตาม column (แต่ละวัน)
// แล้วจัดกลุ่มผลลัพธ์ตามช่วงชั่วโมง เช่น 8:00-8:59, 9:00-9:59, ...
func DistributionExcelToJSONReaderWithDayTemplate(
    r io.Reader,
    stationNameToID map[string]string,
    isDayTemplate bool,
) (Data, error) {

    f, err := excelize.OpenReader(r)
    if err != nil {
        return Data{}, err
    }
    defer f.Close()

    output := Data{}
    recordID := 1

    for _, sheet := range f.GetSheetList() {

        sheetKey := strings.TrimSpace(sheet)

        stationID := sheetKey
        if id, ok := stationNameToID[sheetKey]; ok {
            stationID = id
        }

        rows, err := f.GetRows(sheet)
        if err != nil || len(rows) == 0 {
            continue
        }

        headers := rows[0]
        if len(headers) == 0 {
            continue
        }

        // เก็บ interarrival values ตามช่วงชั่วโมง
        // key = ชั่วโมง (0-23), value = slice ของ interarrival times (นาที)
        hourlyInterarrivals := make(map[int][]float64)

        // วนแต่ละ column (แต่ละวัน)
        for colIndex, header := range headers {
            if strings.TrimSpace(header) == "" {
                continue
            }

            // อ่านค่าเวลาทั้งหมดใน column นี้
            var columnTimes []float64
            for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
                if colIndex >= len(rows[rowIndex]) {
                    continue
                }

                val := strings.TrimSpace(rows[rowIndex][colIndex])
                if val == "" {
                    continue
                }

                minutesFromMidnight, ok := parseTimeValue(val)
                if !ok {
                    log.Printf("[DEBUG] Failed to parse time value: %s", val)
                    continue
                }

                columnTimes = append(columnTimes, minutesFromMidnight)
            }

            if len(columnTimes) <= 1 {
                log.Printf("[DEBUG] Column %s: not enough data (%d records)", header, len(columnTimes))
                continue
            }

            // เรียงลำดับเวลาใน column นี้
            sortFloat64s(columnTimes)

            log.Printf("[DEBUG] Column %s: %d records, first few times: %v", header, len(columnTimes), columnTimes[:min(5, len(columnTimes))])

            // คำนวณ interarrival สำหรับ column นี้
            // และจัดกลุ่มตามชั่วโมงของ arrival time ที่มาถึง (ตัวที่ 2 ในแต่ละ pair)
            for i := 1; i < len(columnTimes); i++ {
                arrivalTime := columnTimes[i]       // เวลาที่ผู้โดยสารมาถึง
                prevTime := columnTimes[i-1]        // เวลาของคนก่อนหน้า
                interarrival := arrivalTime - prevTime

                // จัดกลุ่มตามชั่วโมงของ arrivalTime
                hour := int(arrivalTime / 60)
                if hour < 0 || hour > 23 {
                    continue
                }

                hourlyInterarrivals[hour] = append(hourlyInterarrivals[hour], interarrival)
            }
        }

        // แสดง summary
        log.Printf("[DEBUG] Station: %s, Hourly interarrival summary:", sheetKey)
        for h := 0; h <= 23; h++ {
            if data, ok := hourlyInterarrivals[h]; ok && len(data) > 0 {
                log.Printf("[DEBUG]   Hour %d: %d interarrivals, first few: %v", h, len(data), data[:min(5, len(data))])
            }
        }

        // สร้าง Items สำหรับแต่ละช่วงชั่วโมงที่มีข้อมูล
        for hour := 0; hour <= 23; hour++ {
            data, exists := hourlyInterarrivals[hour]
            if !exists || len(data) == 0 {
                continue
            }

            // สร้าง Records จาก interarrival values (ไม่ต้อง sort อีก)
            recs := []Record{}
            for _, val := range data {
                recs = append(recs, Record{
                    RecordID:     recordID,
                    NumericValue: val,
                })
                recordID++
            }

            // สร้าง time range header (เช่น "8:00-8:59")
            timeRange := fmt.Sprintf("%d:00-%d:59", hour, hour)

            output.Data = append(output.Data, Item{
                Station:   stationID,
                TimeRange: timeRange,
                Records:   recs,
            })
        }

        // ถ้าไม่มีข้อมูลใน sheet เลย ให้เติมค่าว่าง
        hasData := false
        for _, data := range hourlyInterarrivals {
            if len(data) > 0 {
                hasData = true
                break
            }
        }
        if !hasData {
            output.Data = append(output.Data, Item{
                Station:   stationID,
                TimeRange: "0:00-0:59",
                Records: []Record{{
                    RecordID:     recordID,
                    NumericValue: 0,
                }},
            })
            recordID++
        }
    }

    return output, nil
}

// min returns the smaller of two integers
func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}

// sortFloat64s เรียงลำดับ slice ของ float64 จากน้อยไปมาก
func sortFloat64s(data []float64) {
    for i := 0; i < len(data)-1; i++ {
        for j := i + 1; j < len(data); j++ {
            if data[j] < data[i] {
                data[i], data[j] = data[j], data[i]
            }
        }
    }
}

func DistributionExcelToJSONReader(
    r io.Reader,
    stationNameToID map[string]string,
) (Data, error) {

    f, err := excelize.OpenReader(r)
    if err != nil {
        return Data{}, err
    }
    defer f.Close()

    output := Data{}
    recordID := 1

    for _, sheet := range f.GetSheetList() {

        sheetKey := strings.TrimSpace(sheet)

        stationID := sheetKey
        if id, ok := stationNameToID[sheetKey]; ok {
            stationID = id
        }

        rows, err := f.GetRows(sheet)
        if err != nil || len(rows) == 0 {
            continue
        }

        headers := rows[0]
        if len(headers) == 0 {
            continue
        }

        for colIndex, header := range headers {
            if strings.TrimSpace(header) == "" {
                continue
            }

            recs := []Record{}

            for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
                if colIndex >= len(rows[rowIndex]) {
                    continue
                }

                val := strings.TrimSpace(rows[rowIndex][colIndex])
                if val == "" {
                    continue
                }

                // ใช้ parseTimeValue เพื่อรองรับรูปแบบ HH:MM
                num, ok := parseTimeValue(val)
                if !ok {
                    log.Printf("[DEBUG] Failed to parse time value: %s", val)
                    continue
                }

                recs = append(recs, Record{
                    RecordID:     recordID,
                    NumericValue: num,
                })
                recordID++
            }

            // ⭐ กรณี sheet ว่าง → เติมค่า 0
            if len(recs) == 0 {
                recs = append(recs, Record{
                    RecordID:     recordID,
                    NumericValue: 0,
                })
                recordID++
            }

            output.Data = append(output.Data, Item{
                Station:   stationID,
                TimeRange: header,
                Records:   recs,
            })
        }
    }

    return output, nil
}
