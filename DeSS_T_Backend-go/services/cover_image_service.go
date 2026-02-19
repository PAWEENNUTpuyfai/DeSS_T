package services

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

type CoverImageResponse struct {
	CoverImageID string `json:"cover_image_id"`
	PathFile     string `json:"path_file"`
	URL          string `json:"url"`
}

func SaveConfigurationCoverImage(
	fileHeader *multipart.FileHeader,
	protocol string,
	hostname string,
	saveFile func(*multipart.FileHeader, string) error,
) (CoverImageResponse, error) {
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	resolvedUploadDir, err := filepath.Abs(uploadDir)
	if err != nil {
		return CoverImageResponse{}, fmt.Errorf("resolve upload dir: %w", err)
	}

	if err := os.MkdirAll(resolvedUploadDir, 0o755); err != nil {
		return CoverImageResponse{}, fmt.Errorf("create upload dir: %w", err)
	}

	baseName := filepath.Base(fileHeader.Filename)
	ext := filepath.Ext(baseName)
	if ext == "" {
		ext = ".bin"
	}

	fileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(resolvedUploadDir, fileName)

	if err := saveFile(fileHeader, savePath); err != nil {
		return CoverImageResponse{}, fmt.Errorf("save file: %w", err)
	}

	coverImageID := uuid.New().String()
	coverImage := model_database.CoverImageConf{
		ID:       coverImageID,
		PathFile: fileName,
	}

	if err := config.DB.Create(&coverImage).Error; err != nil {
		_ = os.Remove(savePath)
		return CoverImageResponse{}, fmt.Errorf("save cover image record: %w", err)
	}

	scheme := "http"
	if protocol == "https" {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, hostname)
	fileURL := fmt.Sprintf("%s/uploads/%s", baseURL, fileName)

	return CoverImageResponse{
		CoverImageID: coverImageID,
		PathFile:     fileName,
		URL:          fileURL,
	}, nil
}

func SaveScenarioCoverImage(
	fileHeader *multipart.FileHeader,
	protocol string,
	hostname string,
	saveFile func(*multipart.FileHeader, string) error,
) (CoverImageResponse, error) {
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	resolvedUploadDir, err := filepath.Abs(uploadDir)
	if err != nil {
		return CoverImageResponse{}, fmt.Errorf("resolve upload dir: %w", err)
	}

	if err := os.MkdirAll(resolvedUploadDir, 0o755); err != nil {
		return CoverImageResponse{}, fmt.Errorf("create upload dir: %w", err)
	}

	baseName := filepath.Base(fileHeader.Filename)
	ext := filepath.Ext(baseName)
	if ext == "" {
		ext = ".bin"
	}

	fileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(resolvedUploadDir, fileName)

	if err := saveFile(fileHeader, savePath); err != nil {
		return CoverImageResponse{}, fmt.Errorf("save file: %w", err)
	}

	coverImageID := uuid.New().String()
	coverImage := model_database.CoverImageProject{
		ID:       coverImageID,
		PathFile: fileName,
	}

	if err := config.DB.Create(&coverImage).Error; err != nil {
		_ = os.Remove(savePath)
		return CoverImageResponse{}, fmt.Errorf("save cover image record: %w", err)
	}

	scheme := "http"
	if protocol == "https" {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, hostname)
	fileURL := fmt.Sprintf("%s/uploads/%s", baseURL, fileName)

	return CoverImageResponse{
		CoverImageID: coverImageID,
		PathFile:     fileName,
		URL:          fileURL,
	}, nil
}