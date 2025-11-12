package config

import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

var MongoClient *mongo.Client
var MongoDatabase *mongo.Database

func ConnectMongo() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    uri := "mongodb://DeSS_T:DeSS_T_491@localhost:27017" // อ่านจาก .env แนะนำ
    client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
    if err != nil {
        log.Fatal("❌ MongoDB connection error:", err)
    }

    // Test connection
    err = client.Ping(ctx, nil)
    if err != nil {
        log.Fatal("❌ MongoDB ping failed:", err)
    }

    fmt.Println("✅ MongoDB connected")
    MongoClient = client
    MongoDatabase = client.Database("dess_db")
}
