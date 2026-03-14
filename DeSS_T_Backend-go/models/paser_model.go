package models

import (
	"fmt"
	"io"
	"log"
	"strconv"
	"strings"
    "math"
	"github.com/xuri/excelize/v2"
)

// parseTimeValue แปลงค่าเวลา/ตัวเลขจาก Excel
// รองรับหลายรูปแบบ:
// - "8:01" หรือ "08:01" -> 481 นาที (8*60 + 1)
// - "15:55" -> 955 นาที (15*60 + 55)
// - "0.354166..." (Excel serial time) -> แปลงเป็นนาที
// - ตัวเลขล้วน เช่น "5", "12.5" -> ใช้ค่าตามเดิม (นาที)
// parseTimeValue แปลงค่าเวลา/ตัวเลขจาก Excel
func parseTimeValue(val string) (float64, bool) {
	valStr := strings.TrimSpace(val)

	// 1. ตรวจสอบว่ามี AM/PM กำกับอยู่หรือไม่
	isPM := strings.Contains(strings.ToLower(valStr), "pm") || strings.Contains(strings.ToLower(valStr), "p.m.")
	isAM := strings.Contains(strings.ToLower(valStr), "am") || strings.Contains(strings.ToLower(valStr), "a.m.")

	// 2. ลบตัวอักษร AM/PM และช่องว่างทิ้ง เพื่อให้เหลือแค่ตัวเลขเวลาเพียวๆ "HH:MM"
	cleanVal := strings.NewReplacer(
		"AM", "", "PM", "",
		"am", "", "pm", "",
		"A.M.", "", "P.M.", "",
		"a.m.", "", "p.m.", "",
		" ", "",
	).Replace(valStr)

	// 3. จัดการกรณีรูปแบบ HH:MM
	if strings.Contains(cleanVal, ":") {
		parts := strings.Split(cleanVal, ":")
		if len(parts) >= 2 {
			hour, err1 := strconv.ParseFloat(parts[0], 64)
			min, err2 := strconv.ParseFloat(parts[1], 64)
			
			if err1 == nil && err2 == nil {
				// ปรับเวลาให้เป็น 24 ชั่วโมง
				if isPM && hour < 12 {
					hour += 12 // บ่ายโมง (01:00 PM) จะถูกบวก 12 กลายเป็น 13:00
				} else if isAM && hour == 12 {
					hour = 0   // เที่ยงคืน (12:00 AM) จะกลายเป็น 00:00
				}
				
				// คืนค่าเป็นจำนวนนาทีตั้งแต่เที่ยงคืน
				return hour*60 + min, true
			}
		}
	}

	// 4. จัดการกรณี Excel Serial Time (เช่น 0.541666) หรือตัวเลขธรรมดา
	var num float64
	if _, err := fmt.Sscanf(cleanVal, "%f", &num); err == nil {
		// ถ้าค่ามากกว่าหมื่น (มีวันที่ติดมาด้วย) หรือเป็นทศนิยมระหว่าง 0 ถึง 1 (เวลาเพียวๆ)
		if num > 10000 || (num >= 0 && num <= 1) {
			_, frac := math.Modf(num) // ตัดวันที่ทิ้ง เอาแค่เศษเวลา
			return frac * 1440, true
		}
		// สำหรับตัวเลขนาทีที่กรอกมาตรงๆ
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
// DistributionExcelToJSONReaderWithDayTemplate อ่าน Excel และคำนวณ interarrival แยกตาม column (แต่ละวัน)
// แล้วจัดกลุ่มผลลัพธ์ตามช่วงชั่วโมง โดยรีเซ็ตการคำนวณเมื่อขึ้นชั่วโมงใหม่
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

		// เก็บ interarrival values รวมของสถานีนี้ โดยแยกตามช่วงชั่วโมง (0-23)
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

			// 1. ถ้าไม่มีข้อมูล หรือมีข้อมูลแค่อันเดียวใน "วันนั้น" ให้ข้ามคอลัมน์นี้ไปเลย
			if len(columnTimes) <= 1 {
				log.Printf("[DEBUG] Column %s: not enough data (%d records), skipping", header, len(columnTimes))
				continue
			}

			// 2. จัดกลุ่มเวลาของคนในวันนั้น แยกเป็นแต่ละชั่วโมง
			// key = ชั่วโมง (0-23), value = list ของเวลาในชั่วโมงนั้น
			hourlyArrivals := make(map[int][]float64)
			for _, arrivalTime := range columnTimes {
				hour := int(arrivalTime / 60) % 24
				hourlyArrivals[hour] = append(hourlyArrivals[hour], arrivalTime)
			}

			// 3. คำนวณ Interarrival แยกภายในแต่ละชั่วโมง (รีเซ็ตต้นชั่วโมงใหม่)
			for hour, times := range hourlyArrivals {
				
				// เรียงลำดับเวลาเฉพาะภายในชั่วโมงนี้ (เผื่อผู้ใช้พิมพ์สลับเวลาในไฟล์ Excel)
				sortFloat64s(times)

				for i, arrivalTime := range times {
					var interarrival float64

					if i == 0 {
						// กรณีเป็นข้อมูลแรกของชั่วโมง: ให้ลบกับ "เวลาเริ่มต้นชั่วโมง" (ตัดชั่วโมง)
						// เช่น มา 08:55 (535 นาที) -> hourStart = 08:00 (480 นาที) -> 535 - 480 = 55
						hourStart := float64(int(arrivalTime/60) * 60)
						interarrival = arrivalTime - hourStart
					} else {
						// กรณีเป็นคนถัดไป: ให้ลบกับ "เวลาของคนก่อนหน้า"
						prevTime := times[i-1]
						interarrival = arrivalTime - prevTime
					}

					// เพิ่มเข้า Array เก็บค่าผลลัพธ์ของชั่วโมงนั้น
					hourlyInterarrivals[hour] = append(hourlyInterarrivals[hour], interarrival)
				}
			}
		}

		// สร้าง Items สำหรับแสดงผลในแต่ละช่วงชั่วโมงที่มีข้อมูล
		for hour := 0; hour <= 23; hour++ {
			data, exists := hourlyInterarrivals[hour]
			if !exists || len(data) == 0 {
				continue
			}

			// สร้าง Records จาก interarrival values
			recs := []Record{}
			for _, val := range data {
				recs = append(recs, Record{
					RecordID:     recordID,
					NumericValue: val,
				})
				recordID++
			}

			// สร้าง time range header (เช่น "08:00-08:59")
			timeRange := fmt.Sprintf("%02d:00-%02d:59", hour, hour)

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

