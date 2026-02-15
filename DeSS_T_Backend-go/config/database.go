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
	// โหลดไฟล์ .env
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  Warning: .env file not found, using system environment variables")
	}

	// ดึงค่าจาก .env
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")
	schema := os.Getenv("DB_SCHEMA")
	if schema == "" {
		schema = "public"
	}

	// สร้าง DSN string
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable search_path=%s",
		host, user, password, dbname, port, schema,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("❌ Failed to connect database:", err)
	}
	if err := ensureSchema(db, schema); err != nil {
		log.Fatal("❌ Failed to prepare schema:", err)
	}

	// ⭐ กำหนดว่าตารางไหนจะถูกสร้างขึ้น
	// err = db.AutoMigrate(
	// 	&models.User{},
	// 	&models.PythonLog{},
	// )
	// Disable FK creation during migration, then add constraints explicitly.
	prevDisableFK := db.Config.DisableForeignKeyConstraintWhenMigrating
	db.Config.DisableForeignKeyConstraintWhenMigrating = true

	// Migrate in phases so FK tables only run after their dependencies exist.
	if err = db.AutoMigrate(
		// Core lookup tables first
		&model_database.CoverImageProject{},
		&model_database.CoverImageConf{},
		&model_database.StationDetail{},
		&model_database.RouteBetween{},
		// Network and transport roots
		&model_database.NetworkModel{},
		&model_database.BusScenario{},
		&model_database.RouteScenario{},
		&model_database.RoutePath{},
	); err != nil {
		log.Fatal("❌ AutoMigrate (base) failed:", err)
	}

	// Create configuration_details and users explicitly to avoid auto-migrating dependent tables.
	if !db.Migrator().HasTable(&model_database.ConfigurationDetail{}) {
		if err = db.Migrator().CreateTable(&model_database.ConfigurationDetail{}); err != nil {
			log.Fatal("❌ CreateTable(configuration_details) failed:", err)
		}
	}
	if !db.Migrator().HasTable(&model_database.User{}) {
		if err = db.Migrator().CreateTable(&model_database.User{}); err != nil {
			log.Fatal("❌ CreateTable(users) failed:", err)
		}
	}

	if err = db.AutoMigrate(
		// Transport dependents
		&model_database.StationPair{},
		&model_database.Order{},
		&model_database.ScheduleData{},
		&model_database.BusInformation{},
		// Scenario detail and passenger data
		&model_database.ScenarioDetail{},
		&model_database.AlightingData{},
		&model_database.InterArrivalData{},
		// Scenario/publication wrappers
		&model_database.UserScenario{},
		&model_database.PublicScenario{},
		&model_database.UserConfiguration{},
		&model_database.PublicConfiguration{},
	); err != nil {
		log.Fatal("❌ AutoMigrate (dependent) failed:", err)
	}

	db.Config.DisableForeignKeyConstraintWhenMigrating = prevDisableFK
	if err := createForeignKeyConstraints(db); err != nil {
		log.Fatal("❌ CreateConstraint failed:", err)
	}

	DB = db
	fmt.Println("✅ Migration complete")
}

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
		{&model_database.ScenarioDetail{}, "ConfigurationDetail"},
		{&model_database.ScheduleData{}, "RoutePath"},
		{&model_database.ScheduleData{}, "BusScenario"},
		{&model_database.BusInformation{}, "RoutePath"},
		{&model_database.BusInformation{}, "BusScenario"},
		{&model_database.RoutePath{}, "RouteScenario"},
		{&model_database.Order{}, "RoutePath"},
		{&model_database.Order{}, "StationPair"},
		{&model_database.UserConfiguration{}, "CoverImage"},
		{&model_database.UserConfiguration{}, "ConfigurationDetail"},
		{&model_database.UserConfiguration{}, "CreateByUser"},
		{&model_database.PublicConfiguration{}, "CoverImage"},
		{&model_database.PublicConfiguration{}, "ConfigurationDetail"},
		{&model_database.PublicConfiguration{}, "CreateByUser"},
		{&model_database.PublicConfiguration{}, "PublishByUser"},
		{&model_database.ConfigurationDetail{}, "NetworkModel"},
		{&model_database.AlightingData{}, "StationDetail"},
		{&model_database.AlightingData{}, "ConfigurationDetail"},
		{&model_database.InterArrivalData{}, "StationDetail"},
		{&model_database.InterArrivalData{}, "ConfigurationDetail"},
		{&model_database.StationPair{}, "FstStation"},
		{&model_database.StationPair{}, "SndStation"},
		{&model_database.StationPair{}, "RouteBetween"},
		{&model_database.StationPair{}, "NetworkModel"},
	}
	for _, c := range constraints {
		if err := migrator.CreateConstraint(c.model, c.name); err != nil {
			return err
		}
	}
	return nil
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
