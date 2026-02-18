package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	// "DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/model_database"
)

var DB *gorm.DB

func ConnectDatabase() {
	// โหลด .env
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  .env not found, using system env")
	}

	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")
	schema := os.Getenv("DB_SCHEMA")

	if schema == "" {
		schema = "public"
	}

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable search_path=%s",
		host, user, password, dbname, port, schema,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("❌ Failed to connect database:", err)
	}

	// ============================
	// ✅ Create Schema (ถ้ายังไม่มี)
	// ============================
	if err := db.Exec(fmt.Sprintf(
		`CREATE SCHEMA IF NOT EXISTS %s`, schema,
	)).Error; err != nil {
		log.Fatalf("❌ Failed to create schema: %v", err)
	}

	// ============================
	// ✅ Enable PostGIS (ถ้ายังไม่มี)
	// ============================
	if err := db.Exec(
		`CREATE EXTENSION IF NOT EXISTS postgis`,
	).Error; err != nil {
		log.Fatal("❌ Failed to enable PostGIS:", err)
	}

	// ============================
	// ✅ AutoMigrate (ปลอดภัยอยู่แล้ว)
	// ============================
	if err := db.AutoMigrate(
		&model_database.User{},
		&model_database.CoverImageProject{},
		&model_database.CoverImageConf{},
		&model_database.NetworkModel{},
		&model_database.RouteBetween{},
		&model_database.StationDetail{},
		&model_database.BusScenario{},
		&model_database.RouteScenario{},
		&model_database.ConfigurationDetail{},
		&model_database.RoutePath{},
		&model_database.StationPair{},
		&model_database.ScheduleData{},
		&model_database.BusInformation{},
		&model_database.ScenarioDetail{},
		&model_database.Order{},
		&model_database.AlightingData{},
		&model_database.InterArrivalData{},
		&model_database.UserConfiguration{},
		&model_database.PublicConfiguration{},
		&model_database.UserScenario{},
		&model_database.PublicScenario{},
	); err != nil {
		log.Fatal("❌ AutoMigrate failed:", err)
	}

	DB = db
	fmt.Println("✅ Migration complete")
}

func DropDatabase(db *gorm.DB, schema string) error {
    log.Println("⚠️  Dropping schema...")

    if err := db.Exec(fmt.Sprintf(`
        DROP SCHEMA IF EXISTS %s CASCADE;
        CREATE SCHEMA %s;
    `, schema, schema)).Error; err != nil {
        return err
    }

    log.Println("✅ Schema recreated successfully")
    return nil
}

// func ConnectDatabase() (*gorm.DB, error) {
// 	err := godotenv.Load()
// 	if err != nil {
// 		log.Println("⚠️  Warning: .env file not found, using system environment variables")
// 	}

// 	host := os.Getenv("DB_HOST")
// 	user := os.Getenv("DB_USER")
// 	password := os.Getenv("DB_PASSWORD")
// 	dbname := os.Getenv("DB_NAME")
// 	port := os.Getenv("DB_PORT")
// 	schema := os.Getenv("DB_SCHEMA")

// 	if schema == "" {
// 		schema = "public"
// 	}

// 	dsn := fmt.Sprintf(
// 		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable search_path=%s",
// 		host, user, password, dbname, port, schema,
// 	)

// 	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
// 		DisableForeignKeyConstraintWhenMigrating: false, // 🔥 สำคัญ
// 	})
// 	if err != nil {
// 		return nil, err
// 	}

// 	// บังคับ search_path กัน FK มองผิด schema
// 	db.Exec("SET search_path TO " + schema)

// 	return db, nil
// }
// func DropDatabase(db *gorm.DB, schema string) error {
// 	log.Println("⚠️  Dropping schema...")

// 	if err := db.Exec(fmt.Sprintf(`
// 		DROP SCHEMA IF EXISTS %s CASCADE;
// 		CREATE SCHEMA %s;
// 	`, schema, schema)).Error; err != nil {
// 		return err
// 	}

// 	log.Println("✅ Schema recreated successfully")
// 	return nil
// }
// func ResetDatabase(db *gorm.DB) {
// 	log.Println("⚠️  WARNING: Dropping ALL tables and data in schema 'public'...")

// 	// 1. สั่งลบ Schema public แบบ CASCADE (ลบทุกอย่างที่อยู่ข้างใน)
// 	if err := db.Exec("DROP SCHEMA public CASCADE").Error; err != nil {
// 		log.Fatalf("❌ Failed to drop schema: %v", err)
// 	}

// 	// 2. สร้าง Schema public กลับมาใหม่
// 	if err := db.Exec("CREATE SCHEMA public").Error; err != nil {
// 		log.Fatalf("❌ Failed to create schema: %v", err)
// 	}

// 	// 3. (Optional) คืนสิทธิ์ให้ public schema (เพื่อให้ User ทั่วไปเข้าถึงได้ตามปกติ)
// 	db.Exec("GRANT ALL ON SCHEMA public TO public")
// 	db.Exec("GRANT ALL ON SCHEMA public TO postgres") // เปลี่ยน postgres เป็นชื่อ DB User ของคุณถ้าไม่ใช่ postgres

// 	log.Println("✅ Database Reset Successfully (Clean Slate)")
// }
// func AutoMigrate(db *gorm.DB) error {
// 	log.Println("🔄 Starting Two-Step Migration...")

// 	// รายชื่อ Model ทั้งหมด (ใส่รวมกันได้เลย ไม่ต้องแยก Phase)
// 	allModels := []interface{}{
// 		&model_database.User{},
// 		&model_database.CoverImageProject{},
// 		&model_database.CoverImageConf{},
// 		&model_database.NetworkModel{},
// 		&model_database.StationDetail{},
// 		&model_database.BusScenario{},
// 		&model_database.RouteScenario{},
// 		&model_database.RouteBetween{},
// 		&model_database.RoutePath{},
// 		&model_database.ConfigurationDetail{},
// 		&model_database.ScenarioDetail{},
// 		&model_database.StationPair{},
// 		&model_database.ScheduleData{},
// 		&model_database.BusInformation{},
// 		&model_database.Order{},
// 		&model_database.AlightingData{},
// 		&model_database.InterArrivalData{},
// 		&model_database.UserConfiguration{},
// 		&model_database.PublicConfiguration{},
// 		&model_database.UserScenario{},
// 		&model_database.PublicScenario{},
// 	}

// 	// ---------------------------------------------------------
// 	// STEP 1: สร้างตารางก่อน (ปิด Foreign Key)
// 	// ---------------------------------------------------------
// 	log.Println("1️⃣  Phase 1: Creating Tables (Skipping Foreign Keys)...")
	
// 	// ปรับ Config ปิด FK ชั่วคราว
// 	db.Config.DisableForeignKeyConstraintWhenMigrating = true

// 	if err := db.AutoMigrate(allModels...); err != nil {
// 		log.Printf("❌ Phase 1 Failed: %v", err)
// 		return err
// 	}
// 	log.Println("✅ Phase 1: Tables Created Successfully")

// 	// // ---------------------------------------------------------
// 	// // STEP 2: เชื่อมความสัมพันธ์ (เปิด Foreign Key)
// 	// // ---------------------------------------------------------
// 	// log.Println("2️⃣  Phase 2: Linking Foreign Keys...")
	
// 	// // ปรับ Config เปิด FK กลับมา
// 	// db.Config.DisableForeignKeyConstraintWhenMigrating = false

// 	// // รัน AutoMigrate อีกรอบ รอบนี้ GORM จะเห็นว่าตารางมีแล้ว 
// 	// // แต่มันจะเช็คและสร้างเฉพาะ Constraint (FK) ที่ยังขาดอยู่
// 	// // Phase 2: FK only
// 	// if err :=  db.AutoMigrate(
// 	// 	&model_database.InterArrivalData{},
// 	// 	&model_database.AlightingData{},
// 	// 	&model_database.StationPair{},
// 	// 	&model_database.RouteBetween{},
// 	// 	&model_database.RoutePath{},
// 	// ); err != nil {
// 	// 	log.Printf("❌ Phase 2 Failed: %v", err)
// 	// 	return err
// 	// }

// 	log.Println("✅ All Tables & Foreign Keys Connected Successfully")
// 	return nil
// }

// func InitDatabase() {

// 	db, err := ConnectDatabase()
// 	if err != nil {
// 		log.Fatal("❌ Failed to connect database:", err)
// 	}

// 	schema := os.Getenv("DB_SCHEMA")
// 	if schema == "" {
// 		schema = "public"
// 	}
// 	ResetDatabase(db) // ล้างข้อมูลเก่า (สำหรับ development เท่านั้น)
// 	if os.Getenv("DB_DROP_ON_START") == "true" {
// 		if err := DropDatabase(db, schema); err != nil {
// 			log.Fatal(err)
// 		}
// 	}
// 	// 🔥 ต้องเปิด PostGIS ก่อน
// 	if err := EnablePostGIS(db); err != nil {
// 		log.Fatal("❌ Failed to enable PostGIS:", err)
// 	}
	
// 	if err := AutoMigrate(db); err != nil {
// 		log.Fatal(err)
// 	}

// 	DB = db
// }
// func EnablePostGIS(db *gorm.DB) error {
// 	log.Println("🧭 Enabling PostGIS extension...")

// 	if err := db.Exec(`
// 		CREATE EXTENSION IF NOT EXISTS postgis;
// 	`).Error; err != nil {
// 		return err
// 	}

// 	log.Println("✅ PostGIS enabled")
// 	return nil
// }