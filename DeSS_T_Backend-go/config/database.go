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
func ConnectDatabase() (*gorm.DB, error) {
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  Warning: .env file not found, using system environment variables")
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

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true, // 🔥 สำคัญ
	})
	if err != nil {
		return nil, err
	}

	// บังคับ search_path กัน FK มองผิด schema
	db.Exec("SET search_path TO " + schema)

	return db, nil
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
func ResetDatabase(db *gorm.DB) {
	log.Println("⚠️  WARNING: Dropping ALL tables and data in schema 'public'...")

	// 1. สั่งลบ Schema public แบบ CASCADE (ลบทุกอย่างที่อยู่ข้างใน)
	if err := db.Exec("DROP SCHEMA public CASCADE").Error; err != nil {
		log.Fatalf("❌ Failed to drop schema: %v", err)
	}

	// 2. สร้าง Schema public กลับมาใหม่
	if err := db.Exec("CREATE SCHEMA public").Error; err != nil {
		log.Fatalf("❌ Failed to create schema: %v", err)
	}

	// 3. (Optional) คืนสิทธิ์ให้ public schema (เพื่อให้ User ทั่วไปเข้าถึงได้ตามปกติ)
	db.Exec("GRANT ALL ON SCHEMA public TO public")
	db.Exec("GRANT ALL ON SCHEMA public TO postgres") // เปลี่ยน postgres เป็นชื่อ DB User ของคุณถ้าไม่ใช่ postgres

	log.Println("✅ Database Reset Successfully (Clean Slate)")
}
func AutoMigrate(db *gorm.DB) error {
	log.Println("🔄 Starting Two-Step Migration...")

	// รายชื่อ Model ทั้งหมด (ใส่รวมกันได้เลย ไม่ต้องแยก Phase)
	allModels := []interface{}{
		&model_database.User{},
		&model_database.CoverImageProject{},
		&model_database.CoverImageConf{},
		&model_database.NetworkModel{},
		&model_database.StationDetail{},
		&model_database.BusScenario{},
		&model_database.RouteScenario{},
		&model_database.RouteBetween{},
		&model_database.RoutePath{},
		&model_database.ConfigurationDetail{},
		&model_database.ScenarioDetail{},
		&model_database.StationPair{},
		&model_database.ScheduleData{},
		&model_database.BusInformation{},
		&model_database.Order{},
		&model_database.AlightingData{},
		&model_database.InterArrivalData{},
		&model_database.UserConfiguration{},
		&model_database.PublicConfiguration{},
		&model_database.UserScenario{},
		&model_database.PublicScenario{},
	}

	// ---------------------------------------------------------
	// STEP 1: สร้างตารางก่อน (ปิด Foreign Key)
	// ---------------------------------------------------------
	log.Println("1️⃣  Phase 1: Creating Tables (Skipping Foreign Keys)...")
	
	// ปรับ Config ปิด FK ชั่วคราว
	db.Config.DisableForeignKeyConstraintWhenMigrating = true

	if err := db.AutoMigrate(allModels...); err != nil {
		log.Printf("❌ Phase 1 Failed: %v", err)
		return err
	}
	log.Println("✅ Phase 1: Tables Created Successfully")

	// ---------------------------------------------------------
	// STEP 2: เชื่อมความสัมพันธ์ (เปิด Foreign Key)
	// ---------------------------------------------------------
	log.Println("2️⃣  Phase 2: Linking Foreign Keys...")
	
	// ปรับ Config เปิด FK กลับมา
	db.Config.DisableForeignKeyConstraintWhenMigrating = false

	// รัน AutoMigrate อีกรอบ รอบนี้ GORM จะเห็นว่าตารางมีแล้ว 
	// แต่มันจะเช็คและสร้างเฉพาะ Constraint (FK) ที่ยังขาดอยู่
	// Phase 2: FK only
	if err :=  db.AutoMigrate(
		&model_database.InterArrivalData{},
		&model_database.AlightingData{},
		&model_database.StationPair{},
		&model_database.RouteBetween{},
		&model_database.RoutePath{},
	); err != nil {
		log.Printf("❌ Phase 2 Failed: %v", err)
		return err
	}

	log.Println("✅ All Tables & Foreign Keys Connected Successfully")
	return nil
}

func InitDatabase() {

	db, err := ConnectDatabase()
	if err != nil {
		log.Fatal("❌ Failed to connect database:", err)
	}

	schema := os.Getenv("DB_SCHEMA")
	if schema == "" {
		schema = "public"
	}
	ResetDatabase(db) // ล้างข้อมูลเก่า (สำหรับ development เท่านั้น)
	if os.Getenv("DB_DROP_ON_START") == "true" {
		if err := DropDatabase(db, schema); err != nil {
			log.Fatal(err)
		}
	}
	// 🔥 ต้องเปิด PostGIS ก่อน
	if err := EnablePostGIS(db); err != nil {
		log.Fatal("❌ Failed to enable PostGIS:", err)
	}
	
	if err := AutoMigrate(db); err != nil {
		log.Fatal(err)
	}

	DB = db
}
func EnablePostGIS(db *gorm.DB) error {
	log.Println("🧭 Enabling PostGIS extension...")

	if err := db.Exec(`
		CREATE EXTENSION IF NOT EXISTS postgis;
	`).Error; err != nil {
		return err
	}

	log.Println("✅ PostGIS enabled")
	return nil
}
// func ConnectDatabase() {
// 	// โหลดไฟล์ .env
// 	err := godotenv.Load()
// 	if err != nil {
// 		log.Println("⚠️  Warning: .env file not found, using system environment variables")
// 	}

// 	// ดึงค่าจาก .env
// 	host := os.Getenv("DB_HOST")
// 	user := os.Getenv("DB_USER")
// 	password := os.Getenv("DB_PASSWORD")
// 	dbname := os.Getenv("DB_NAME")
// 	port := os.Getenv("DB_PORT")
// 	schema := os.Getenv("DB_SCHEMA")
// 	if schema == "" {
// 		schema = "public"
// 	}

// 	// สร้าง DSN string
// 	dsn := fmt.Sprintf(
// 		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable search_path=%s",
// 		host, user, password, dbname, port, schema,
// 	)

// 	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
// 	if err != nil {
// 		log.Fatal("❌ Failed to connect database:", err)
// 	}
// 	if err := ensureSchema(db, schema); err != nil {
// 		log.Fatal("❌ Failed to prepare schema:", err)
// 	}
// 	// ✅ เปิด PostGIS (ถ้ายังไม่มี)
// 	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS postgis;`).Error; err != nil {
// 		log.Fatal("❌ Failed to enable PostGIS:", err)
// 	}

// 	// Drop tables if DB_DROP_ON_START is set to "true"
// 	dropOnStart := os.Getenv("DB_DROP_ON_START")
// 	// DROP ก่อน
// 	if dropOnStart == "true" {
// 		if err := DropDatabase(db, schema); err != nil {
// 			log.Fatal(err)
// 		}
// 	}

// 	// 🔥 สร้าง extension หลัง schema ใหม่
// 	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS postgis;`).Error; err != nil {
// 		log.Fatal("❌ Failed to enable PostGIS:", err)
// 	}

// 	// 🔥 AutoMigrate เรียงถูกลำดับ
// 	if err := db.AutoMigrate(
// 		// =========================
// 		// 🔹 ROOT (ไม่มี FK ไปใคร)
// 		// =========================
// 		&model_database.User{},
// 		&model_database.CoverImageProject{},
// 		&model_database.CoverImageConf{},
// 		&model_database.NetworkModel{},
// 		&model_database.RouteBetween{},
// 		&model_database.StationDetail{},
// 		&model_database.BusScenario{},
// 		&model_database.RouteScenario{},

// 		// =========================
// 		// 🔹 LEVEL 2
// 		// =========================
// 		&model_database.ConfigurationDetail{},   // -> NetworkModel
// 		&model_database.RoutePath{},             // -> RouteScenario

// 		// =========================
// 		// 🔹 LEVEL 3
// 		// =========================
// 		&model_database.StationPair{},           // -> StationDetail, RouteBetween, NetworkModel
// 		&model_database.ScheduleData{},          // -> BusScenario, RoutePath
// 		&model_database.BusInformation{},        // -> BusScenario, RoutePath

// 		// =========================
// 		// 🔹 LEVEL 4
// 		// =========================
// 		&model_database.ScenarioDetail{},        // -> BusScenario, RouteScenario, ConfigurationDetail

// 		// =========================
// 		// 🔹 LEVEL 5 (Leaf Data)
// 		// =========================
// 		&model_database.Order{},                 // -> RoutePath, StationPair
// 		&model_database.AlightingData{},         // -> ConfigurationDetail, StationDetail
// 		&model_database.InterArrivalData{},      // -> ConfigurationDetail, StationDetail

// 		// =========================
// 		// 🔹 LEVEL 6 (Top Layer Objects)
// 		// =========================
// 		&model_database.UserConfiguration{},     // -> User, CoverImageConf, ConfigurationDetail
// 		&model_database.PublicConfiguration{},   // -> User, CoverImageConf, ConfigurationDetail
// 		&model_database.UserScenario{},          // -> User, CoverImageProject, ScenarioDetail
// 		&model_database.PublicScenario{},        // -> User, CoverImageProject, ScenarioDetail

// 	); err != nil {
// 		log.Fatal("❌ AutoMigrate failed:", err)
// 	}

// 	DB = db
// 	fmt.Println("✅ Migration complete")
// }
// func DropDatabase(db *gorm.DB, schema string) error {
//     log.Println("⚠️  Dropping schema...")

//     if err := db.Exec(fmt.Sprintf(`
//         DROP SCHEMA IF EXISTS %s CASCADE;
//         CREATE SCHEMA %s;
//     `, schema, schema)).Error; err != nil {
//         return err
//     }

//     log.Println("✅ Schema recreated successfully")
//     return nil
// }


// // DropDatabase drops all tables in the database
// func DropDatabase(db *gorm.DB) error {
//     log.Println("⚠️  Dropping all database tables...")
    
//     if err := db.Migrator().DropTable(
//         &model_database.User{},
//         &model_database.CoverImageProject{},
//         &model_database.CoverImageConf{},
//         &model_database.PublicScenario{},
//         &model_database.UserScenario{},
//         &model_database.ScenarioDetail{},
//         &model_database.BusScenario{},
//         &model_database.ScheduleData{},
//         &model_database.BusInformation{},
//         &model_database.RouteScenario{},
//         &model_database.RoutePath{},
//         &model_database.Order{},
//         &model_database.UserConfiguration{},
//         &model_database.PublicConfiguration{},
//         &model_database.ConfigurationDetail{},
//         &model_database.AlightingData{},
//         &model_database.InterArrivalData{},
//         &model_database.NetworkModel{},
//         &model_database.StationDetail{},
//         &model_database.StationPair{},
//         &model_database.RouteBetween{},
//     ); err != nil {
//         log.Printf("❌ Error dropping tables: %v\n", err)
//         return err
//     }
    
//     log.Println("✅ All tables dropped successfully")
//     return nil
// }
func createForeignKeyConstraints(db *gorm.DB) error {
	migrator := db.Migrator()
	constraints := []struct {
		model interface{}
		name  string
	}{
		{&model_database.PublicScenario{}, "CoverImage"},
		{&model_database.PublicScenario{}, "ScenarioDetail"},
		{&model_database.PublicScenario{}, "CreateByUser"},
		{&model_database.PublicScenario{}, "PublishByUser"},
		{&model_database.UserScenario{}, "CoverImage"},
		{&model_database.UserScenario{}, "ScenarioDetail"},
		{&model_database.UserScenario{}, "CreateByUser"},
		{&model_database.ScenarioDetail{}, "BusScenario"},
		{&model_database.ScenarioDetail{}, "RouteScenario"},
		{&model_database.ScheduleData{}, "RoutePath"},
		{&model_database.ScheduleData{}, "BusScenario"},
		{&model_database.BusInformation{}, "RoutePath"},
		{&model_database.BusInformation{}, "BusScenario"},
		{&model_database.RoutePath{}, "RouteScenario"},
		{&model_database.Order{}, "RoutePath"},
		{&model_database.Order{}, "StationPair"},
		{&model_database.UserConfiguration{}, "CoverImage"},
		{&model_database.UserConfiguration{}, "CreateByUser"},
		{&model_database.PublicConfiguration{}, "CoverImage"},
		{&model_database.PublicConfiguration{}, "CreateByUser"},
		{&model_database.PublicConfiguration{}, "PublishByUser"},
		{&model_database.AlightingData{}, "StationDetail"},
		{&model_database.InterArrivalData{}, "StationDetail"},
		{&model_database.StationPair{}, "FstStation"},
		{&model_database.StationPair{}, "SndStation"},
		{&model_database.StationPair{}, "RouteBetween"},
	}
	for _, c := range constraints {
		if migrator.HasConstraint(c.model, c.name) {
			continue
		}
		if err := migrator.CreateConstraint(c.model, c.name); err != nil {
			return err
		}
	}
	return nil
}

func fixConfigurationDetailNetworkModelFK(db *gorm.DB, schema string) error {
	if schema == "" {
		schema = "public"
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}

	drop := `DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE con.conname = 'fk_configuration_details_network_model'
			AND c.relname = 'network_models'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.schema_name, r.table_name, 'fk_configuration_details_network_model');
	END LOOP;
END $$;`
	if err := db.Exec(drop).Error; err != nil {
		return err
	}

	add := fmt.Sprintf(`DO $$
BEGIN
	ALTER TABLE "%s"."configuration_details"
	DROP CONSTRAINT IF EXISTS fk_configuration_details_network_model;

	ALTER TABLE "%s"."configuration_details"
	ADD CONSTRAINT fk_configuration_details_network_model
	FOREIGN KEY (network_model)
	REFERENCES "%s"."network_models"(network_model_id)
	ON DELETE CASCADE ON UPDATE CASCADE;
END $$;`, schema, schema, schema)
	return db.Exec(add).Error
}

func fixStationPairNetworkModelFK(db *gorm.DB, schema string) error {
	if schema == "" {
		schema = "public"
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}

	drop := `DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE con.conname = 'fk_station_pairs_network_model'
			AND c.relname = 'network_models'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.schema_name, r.table_name, 'fk_station_pairs_network_model');
	END LOOP;
END $$;`
	if err := db.Exec(drop).Error; err != nil {
		return err
	}

	add := fmt.Sprintf(`DO $$
BEGIN
	ALTER TABLE "%s"."station_pairs"
	DROP CONSTRAINT IF EXISTS fk_station_pairs_network_model;

	ALTER TABLE "%s"."station_pairs"
	ADD CONSTRAINT fk_station_pairs_network_model
	FOREIGN KEY (network_model)
	REFERENCES "%s"."network_models"(network_model_id)
	ON DELETE CASCADE ON UPDATE CASCADE;
END $$;`, schema, schema, schema)
	return db.Exec(add).Error
}

func fixScenarioDetailConfigurationDetailFK(db *gorm.DB, schema string) error {
	if schema == "" {
		schema = "public"
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}

	drop := `DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE con.conname = 'fk_scenario_details_configuration_detail'
			AND c.relname = 'configuration_details'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.schema_name, r.table_name, 'fk_scenario_details_configuration_detail');
	END LOOP;
END $$;`
	if err := db.Exec(drop).Error; err != nil {
		return err
	}

	add := fmt.Sprintf(`DO $$
BEGIN
	ALTER TABLE "%s"."scenario_details"
	DROP CONSTRAINT IF EXISTS fk_scenario_details_configuration_detail;

	ALTER TABLE "%s"."scenario_details"
	ADD CONSTRAINT fk_scenario_details_configuration_detail
	FOREIGN KEY (configuration_detail)
	REFERENCES "%s"."configuration_details"(configuration_detail_id)
	ON DELETE CASCADE ON UPDATE CASCADE;
END $$;`, schema, schema, schema)
	return db.Exec(add).Error
}

func fixUserConfigurationConfigurationDetailFK(db *gorm.DB, schema string) error {
	if schema == "" {
		schema = "public"
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}

	drop := `DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE con.conname = 'fk_user_configurations_configuration_detail'
			AND c.relname = 'configuration_details'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.schema_name, r.table_name, 'fk_user_configurations_configuration_detail');
	END LOOP;
END $$;`
	if err := db.Exec(drop).Error; err != nil {
		return err
	}

	add := fmt.Sprintf(`DO $$
BEGIN
	ALTER TABLE "%s"."user_configurations"
	DROP CONSTRAINT IF EXISTS fk_user_configurations_configuration_detail;

	ALTER TABLE "%s"."user_configurations"
	ADD CONSTRAINT fk_user_configurations_configuration_detail
	FOREIGN KEY (configuration_detail)
	REFERENCES "%s"."configuration_details"(configuration_detail_id)
	ON DELETE CASCADE ON UPDATE CASCADE;
END $$;`, schema, schema, schema)
	return db.Exec(add).Error
}

func fixPublicConfigurationConfigurationDetailFK(db *gorm.DB, schema string) error {
	if schema == "" {
		schema = "public"
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}

	drop := `DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE con.conname = 'fk_public_configurations_configuration_detail'
			AND c.relname = 'configuration_details'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.schema_name, r.table_name, 'fk_public_configurations_configuration_detail');
	END LOOP;
END $$;`
	if err := db.Exec(drop).Error; err != nil {
		return err
	}

	add := fmt.Sprintf(`DO $$
BEGIN
	ALTER TABLE "%s"."public_configurations"
	DROP CONSTRAINT IF EXISTS fk_public_configurations_configuration_detail;

	ALTER TABLE "%s"."public_configurations"
	ADD CONSTRAINT fk_public_configurations_configuration_detail
	FOREIGN KEY (configuration_detail)
	REFERENCES "%s"."configuration_details"(configuration_detail_id)
	ON DELETE CASCADE ON UPDATE CASCADE;
END $$;`, schema, schema, schema)
	return db.Exec(add).Error
}

func fixAlightingDataConfigurationDetailFK(db *gorm.DB, schema string) error {
	if schema == "" {
		schema = "public"
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}

	drop := `DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE con.conname = 'fk_alighting_data_configuration_detail'
			AND c.relname = 'configuration_details'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.schema_name, r.table_name, 'fk_alighting_data_configuration_detail');
	END LOOP;
END $$;`
	if err := db.Exec(drop).Error; err != nil {
		return err
	}

	add := fmt.Sprintf(`DO $$
BEGIN
	ALTER TABLE "%s"."alighting_data"
	DROP CONSTRAINT IF EXISTS fk_alighting_data_configuration_detail;

	ALTER TABLE "%s"."alighting_data"
	ADD CONSTRAINT fk_alighting_data_configuration_detail
	FOREIGN KEY (configuration_detail)
	REFERENCES "%s"."configuration_details"(configuration_detail_id)
	ON DELETE CASCADE ON UPDATE CASCADE;
END $$;`, schema, schema, schema)
	return db.Exec(add).Error
}

func fixInterArrivalDataConfigurationDetailFK(db *gorm.DB, schema string) error {
	if schema == "" {
		schema = "public"
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}

	drop := `DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_constraint con
		JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE con.conname = 'fk_inter_arrival_data_configuration_detail'
			AND c.relname = 'configuration_details'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.schema_name, r.table_name, 'fk_inter_arrival_data_configuration_detail');
	END LOOP;
END $$;`
	if err := db.Exec(drop).Error; err != nil {
		return err
	}

	add := fmt.Sprintf(`DO $$
BEGIN
	ALTER TABLE "%s"."inter_arrival_data"
	DROP CONSTRAINT IF EXISTS fk_inter_arrival_data_configuration_detail;

	ALTER TABLE "%s"."inter_arrival_data"
	ADD CONSTRAINT fk_inter_arrival_data_configuration_detail
	FOREIGN KEY (configuration_detail)
	REFERENCES "%s"."configuration_details"(configuration_detail_id)
	ON DELETE CASCADE ON UPDATE CASCADE;
END $$;`, schema, schema, schema)
	return db.Exec(add).Error
}

func ensureSchema(db *gorm.DB, schema string) error {
	if schema == "" {
		return nil
	}
	if !isSafeIdentifier(schema) {
		return fmt.Errorf("invalid schema name: %s", schema)
	}
	if err := db.Exec(fmt.Sprintf(`CREATE SCHEMA IF NOT EXISTS "%s"`, schema)).Error; err != nil {
		return err
	}
	if schema == "public" {
		return db.Exec(`SET search_path TO "public"`).Error
	}
	return db.Exec(fmt.Sprintf(`SET search_path TO "%s", "public"`, schema)).Error
}

func isSafeIdentifier(name string) bool {
	if name == "" {
		return false
	}
	for i, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || r == '_' || (r >= '0' && r <= '9' && i > 0) {
			continue
		}
		return false
	}
	return true
}
