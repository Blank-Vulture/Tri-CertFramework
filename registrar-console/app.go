package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"registrar-console/internal/registrar"
)

// App exposes registrar features to the frontend via Wails bindings.
type App struct {
	ctx       context.Context
	service   *registrar.Service
	settings  string
	dataRoot  string
	configDir string
}

type settingsFile struct {
	DataRoot    string `json:"data_root"`
	RawDataRoot string `json:"raw_data_root,omitempty"`
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{}
}

// startup is called by Wails during application bootstrap.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	userConfigDir, err := os.UserConfigDir()
	if err != nil {
		runtime.LogWarningf(ctx, "failed to resolve user config directory, falling back to ~/Library/Application Support: %v", err)
		homeDir, herr := os.UserHomeDir()
		if herr != nil {
			runtime.LogFatalf(ctx, "failed to resolve user home directory: %v", herr)
			return
		}
		userConfigDir = filepath.Join(homeDir, "Library", "Application Support")
	}
	configDir := filepath.Join(userConfigDir, "RegistrarConsole")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		runtime.LogFatalf(ctx, "failed to initialise config directory: %v", err)
		return
	}
	a.configDir = configDir
	a.settings = filepath.Join(configDir, "registrar-settings.json")

	root := a.loadDataRootSetting()
	if root == "" {
		root = resolveDataRoot(configDir)
	}

	prepared, err := a.prepareDataRoot(root)
	if err != nil {
		runtime.LogFatalf(ctx, "failed to prepare default data root: %v", err)
		return
	}

	if err := a.applyDataRoot(prepared); err != nil {
		runtime.LogFatalf(ctx, "failed to initialise registrar service: %v", err)
		return
	}

	runtime.LogInfof(ctx, "registrar data root: %s", prepared)
}

// DataRoot returns the resolved registrar data directory.
func (a *App) DataRoot() string {
	return a.dataRoot
}

// GetAllowlist exposes the current allowlist to the frontend.
func (a *App) GetAllowlist() (*registrar.AllowlistView, error) {
	if a.service == nil {
		return nil, fmt.Errorf("registrar service not initialised")
	}
	return a.service.GetAllowlist()
}

// AddStudent registers a single student entry.
func (a *App) AddStudent(input registrar.StudentInput) (*registrar.RegistrationResult, error) {
	if a.service == nil {
		return nil, fmt.Errorf("registrar service not initialised")
	}
	return a.service.AddStudent(input)
}

// AddStudents registers multiple students and returns their results.
func (a *App) AddStudents(inputs []registrar.StudentInput) ([]registrar.RegistrationResult, error) {
	if a.service == nil {
		return nil, fmt.Errorf("registrar service not initialised")
	}
	return a.service.AddStudents(inputs)
}

// DeleteStudent removes all data associated with the provided student ID.
func (a *App) DeleteStudent(studentID string) error {
	if a.service == nil {
		return fmt.Errorf("registrar service not initialised")
	}
	return a.service.DeleteStudent(studentID)
}

// ListIssuances returns historical issuance records.
func (a *App) ListIssuances() ([]registrar.IssuanceEntry, error) {
	if a.service == nil {
		return nil, fmt.Errorf("registrar service not initialised")
	}
	return a.service.ListIssuances()
}

// ExportIssuancesCSV returns issuance history as CSV string.
func (a *App) ExportIssuancesCSV() (string, error) {
	if a.service == nil {
		return "", fmt.Errorf("registrar service not initialised")
	}
	return a.service.ExportIssuancesCSV()
}

// ExportIssuancesTo writes issuance CSV to the specified directory.
func (a *App) ExportIssuancesTo(dir string) (string, error) {
	if a.service == nil {
		return "", fmt.Errorf("registrar service not initialised")
	}
	return a.service.ExportIssuancesTo(dir)
}

// ParseCSV converts CSV content to structured inputs.
func (a *App) ParseCSV(content string) ([]registrar.StudentInput, error) {
	if a.service == nil {
		return nil, fmt.Errorf("registrar service not initialised")
	}
	return a.service.ParseCSV(content)
}

// SetDataRoot switches the active data root directory and persists the setting.
func (a *App) SetDataRoot(path string) (string, error) {
	raw := strings.TrimSpace(path)
	if raw == "" {
		return "", fmt.Errorf("data root must not be empty")
	}

	resolved := resolveWithBase(a.configDir, raw)
	prepared, err := a.prepareDataRoot(resolved)
	if err != nil {
		return "", err
	}

	if err := a.applyDataRoot(prepared); err != nil {
		return "", err
	}

	rawToStore := raw
	if prepared != resolved {
		rawToStore = prepared
	}

	if err := a.saveDataRootSetting(rawToStore, prepared); err != nil {
		runtime.LogErrorf(a.ctx, "failed to persist data root setting: %v", err)
	}

	return a.dataRoot, nil
}

// ChooseDataRoot opens the native directory picker and switches the data root.
func (a *App) ChooseDataRoot() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application context not initialised")
	}

	options := runtime.OpenDialogOptions{
		Title:                "データ出力先を選択",
		CanCreateDirectories: true,
	}
	if a.dataRoot != "" {
		options.DefaultDirectory = a.dataRoot
	}

	dir, err := runtime.OpenDirectoryDialog(a.ctx, options)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(dir) == "" {
		return "", nil
	}

	return a.SetDataRoot(dir)
}

// SelectExportDirectory opens a picker for choosing an export destination without mutating data root.
func (a *App) SelectExportDirectory() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application context not initialised")
	}

	options := runtime.OpenDialogOptions{
		Title:                "CSV出力先を選択",
		CanCreateDirectories: true,
	}
	if a.dataRoot != "" {
		options.DefaultDirectory = a.dataRoot
	}

	dir, err := runtime.OpenDirectoryDialog(a.ctx, options)
	if err != nil {
		return "", err
	}
	dir = strings.TrimSpace(dir)
	if dir == "" {
		return "", nil
	}
	return resolveWithBase(a.configDir, dir), nil
}

func resolveDataRoot(configDir string) string {
	if val, ok := os.LookupEnv("REGISTRAR_DATA_ROOT"); ok && strings.TrimSpace(val) != "" {
		return resolveWithBase(configDir, val)
	}

	return filepath.Join(configDir, "registrations")
}

func (a *App) applyDataRoot(path string) error {
	svc, err := registrar.NewService(path)
	if err != nil {
		return err
	}
	a.dataRoot = path
	a.service = svc
	return nil
}

func (a *App) loadDataRootSetting() string {
	data, err := os.ReadFile(a.settings)
	if errors.Is(err, os.ErrNotExist) {
		return ""
	}
	if err != nil {
		runtime.LogErrorf(a.ctx, "failed to read settings: %v", err)
		return ""
	}
	var cfg settingsFile
	if err := json.Unmarshal(data, &cfg); err != nil {
		runtime.LogErrorf(a.ctx, "invalid settings file: %v", err)
		return ""
	}
	raw := strings.TrimSpace(cfg.RawDataRoot)
	if raw == "" {
		raw = strings.TrimSpace(cfg.DataRoot)
	}
	if raw == "" {
		return ""
	}
	return resolveWithBase(a.configDir, raw)
}

func (a *App) saveDataRootSetting(raw, resolved string) error {
	cfg := settingsFile{
		DataRoot:    resolved,
		RawDataRoot: raw,
	}
	payload, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(a.configDir, 0o755); err != nil {
		return err
	}
	return os.WriteFile(a.settings, payload, 0o644)
}

func resolveWithBase(base, path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return filepath.Join(base, "registrations")
	}
	expanded := expandUserPath(trimmed)
	if filepath.IsAbs(expanded) {
		return filepath.Clean(expanded)
	}
	return filepath.Clean(filepath.Join(base, expanded))
}

func expandUserPath(path string) string {
	if strings.HasPrefix(path, "~") {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return filepath.Join(home, strings.TrimPrefix(path, "~"))
	}
	return path
}

func (a *App) prepareDataRoot(path string) (string, error) {
	if err := os.MkdirAll(path, 0o755); err != nil {
		if errors.Is(err, fs.ErrPermission) && a.ctx != nil {
			runtime.LogWarningf(a.ctx, "permission denied for %s: %v", path, err)
			alt, dialogErr := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
				Title:                "書き込み可能なデータ出力先を選択",
				CanCreateDirectories: true,
			})
			if dialogErr != nil {
				return "", fmt.Errorf("permission denied for %s: %w", path, err)
			}
			alt = strings.TrimSpace(alt)
			if alt == "" {
				return "", fmt.Errorf("permission denied for %s: %w", path, err)
			}
			altResolved := resolveWithBase(a.configDir, alt)
			if err := os.MkdirAll(altResolved, 0o755); err != nil {
				return "", fmt.Errorf("failed to prepare selected directory: %w", err)
			}
			return altResolved, nil
		}
		return "", fmt.Errorf("failed to prepare directory %s: %w", path, err)
	}
	return path, nil
}
