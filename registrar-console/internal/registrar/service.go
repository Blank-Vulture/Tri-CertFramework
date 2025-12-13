package registrar

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base32"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	defaultSchemaAllowlist = "tri-cert/commit-allowlist@2"
	defaultSchemaStudent   = "tri-cert/student-activation@1"
	defaultSchemaIssuance  = "tri-cert/issuance-log@1"
)

var (
	spaceCollapser = regexp.MustCompile(`\s+`)
	dateLayouts    = []string{
		"2006-01-02",
		"2006/01/02",
		"2006.01.02",
		"2006年01月02日",
		"02-01-2006",
		"02/01/2006",
		"2006-1-2",
		"2006/1/2",
		"2006.1.2",
		"02.01.2006",
	}
	// Input validation constraints
	maxStudentIDLength = 100
	maxNameLength      = 200
	maxBirthdateLength = 50
	// Allowed characters for student ID (alphanumeric and hyphen)
	studentIDPattern = regexp.MustCompile(`^[A-Za-z0-9-]+$`)
)

// Service provides registration data generation and persistence utilities.
type Service struct {
	baseDir       string
	allowlistPath string
	studentsDir   string
	issuancePath  string
	exportDir     string
	issuer        issuerInfo
	now           func() time.Time
}

// StudentInput represents the raw values provided via CSV import or manual entry.
type StudentInput struct {
	StudentID      string `json:"studentId"`
	Name           string `json:"name"`
	Birthdate      string `json:"birthdate"`
	Salt           string `json:"salt,omitempty"`
	ActivationHash string `json:"activationHash,omitempty"`
	IssuedAt       string `json:"issuedAt,omitempty"`
}

// RegistrationResult contains the computed artifacts that the UI must display/export.
type RegistrationResult struct {
	StudentID            string `json:"studentId"`
	StudentIDHash        string `json:"studentIdHash"`
	ActivationHash       string `json:"activationHash"`
	Salt                 string `json:"salt"`
	DisplayName          string `json:"displayName"`
	NormalizedName       string `json:"normalizedName"`
	NormalizedBirthdate  string `json:"normalizedBirthdate"`
	AllowlistEntryIndex  int    `json:"allowlistEntryIndex"`
	AllowlistTotalLength int    `json:"allowlistTotalLength"`
	IssuedAt             string `json:"issuedAt"`
}

// IssuerInfo represents the issuer (institution) that owns this allowlist.
type IssuerInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// AllowlistView is a read-only representation of the allowlist file.
type AllowlistView struct {
	Schema    string              `json:"schema"`
	Issuer    IssuerInfo          `json:"issuer"`
	UpdatedAt string              `json:"updatedAt"`
	Entries   []AllowlistEntryRow `json:"entries"`
}

// AllowlistEntryRow represents a single row in the allowlist.
type AllowlistEntryRow struct {
	ActivationHash string `json:"activationHash"`
	StudentIDHash  string `json:"studentIdHash"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

type issuerInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type allowlistFile struct {
	Schema    string           `json:"schema"`
	Issuer    issuerInfo       `json:"issuer"`
	UpdatedAt string           `json:"updated_at"`
	Entries   []allowlistEntry `json:"entries"`
}

type allowlistEntry struct {
	ActivationHash string `json:"activation_hash"`
	StudentIDHash  string `json:"student_id_hash"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

type studentFile struct {
	Schema         string    `json:"schema"`
	StudentIDHash  string    `json:"student_id_hash"`
	ActivationHash string    `json:"activation_hash"`
	SaltHash       string    `json:"salt_hash"`
	CreatedAt      string    `json:"created_at"`
	UpdatedAt      string    `json:"updated_at"`
	Metadata       metaBlock `json:"metadata,omitempty"`
}

type metaBlock struct {
	Notes      string `json:"notes,omitempty"`
	ValidFrom  string `json:"valid_from,omitempty"`
	ValidUntil string `json:"valid_until,omitempty"`
}

type issuanceFile struct {
	Schema    string          `json:"schema"`
	UpdatedAt string          `json:"updated_at"`
	DataRoot  string          `json:"data_root"`
	Entries   []IssuanceEntry `json:"entries"`
}

// IssuanceEntry captures historical issuance metadata for audit/search.
type IssuanceEntry struct {
	StudentID        string `json:"student_id"`
	StudentIDHash    string `json:"student_id_hash"`
	Name             string `json:"name"`
	NormalizedName   string `json:"normalized_name"`
	Birthdate        string `json:"birthdate"`
	Salt             string `json:"salt"`
	ActivationHash   string `json:"activation_hash"`
	CreatedAt        string `json:"created_at"`
	AllowlistIndex   int    `json:"allowlist_index"`
	AllowlistVersion int    `json:"allowlist_version"`
}

// IssuerConfig holds the configuration for the issuer (institution).
type IssuerConfig struct {
	ID   string
	Name string
}

// NewService constructs a Service bound to the provided base directory.
// Uses default issuer info which should be updated via SetIssuer or issuer.json.
func NewService(baseDir string) (*Service, error) {
	return NewServiceWithIssuer(baseDir, IssuerConfig{
		ID:   "default-issuer",
		Name: "Default Issuer",
	})
}

// NewServiceWithIssuer constructs a Service with explicit issuer configuration.
func NewServiceWithIssuer(baseDir string, issuerCfg IssuerConfig) (*Service, error) {
	cleanBase := filepath.Clean(baseDir)
	if cleanBase == "" || cleanBase == "." {
		return nil, errors.New("registrar: base directory must not be empty")
	}

	studentsDir := filepath.Join(cleanBase, "students")
	if err := os.MkdirAll(studentsDir, 0o755); err != nil {
		return nil, fmt.Errorf("registrar: ensure students directory: %w", err)
	}

	exportDir := filepath.Join(cleanBase, "exports")
	if err := os.MkdirAll(exportDir, 0o755); err != nil {
		return nil, fmt.Errorf("registrar: ensure exports directory: %w", err)
	}

	// Try to load issuer config from issuer.json if exists
	issuerPath := filepath.Join(cleanBase, "issuer.json")
	if data, err := os.ReadFile(issuerPath); err == nil {
		var fileCfg struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		}
		if err := json.Unmarshal(data, &fileCfg); err == nil && fileCfg.ID != "" {
			issuerCfg.ID = fileCfg.ID
			issuerCfg.Name = fileCfg.Name
		}
	}

	svc := &Service{
		baseDir:       cleanBase,
		allowlistPath: filepath.Join(cleanBase, "commit-allowlist.json"),
		studentsDir:   studentsDir,
		issuancePath:  filepath.Join(cleanBase, "issuance-log.json"),
		exportDir:     exportDir,
		issuer:        issuerInfo{ID: issuerCfg.ID, Name: issuerCfg.Name},
		now:           func() time.Time { return time.Now().UTC() },
	}

	if err := svc.ensureAllowlistExists(); err != nil {
		return nil, err
	}

	if err := svc.ensureIssuanceLogExists(); err != nil {
		return nil, err
	}

	return svc, nil
}

// AddStudent registers a single student and returns the computed artefacts.
func (s *Service) AddStudent(input StudentInput) (*RegistrationResult, error) {
	if err := validateInput(input); err != nil {
		return nil, err
	}

	normalizedName := normalizeName(input.Name)
	normalizedBirthdate, err := normalizeBirthdate(input.Birthdate)
	if err != nil {
		return nil, err
	}

	studentIDHash := hashStudentID(input.StudentID)

	salt := strings.TrimSpace(input.Salt)
	activationHash := strings.TrimSpace(input.ActivationHash)
	issuedAt := strings.TrimSpace(input.IssuedAt)

	isImported := salt != "" && activationHash != ""

	if !isImported {
		var err error
		salt, err = generateSalt()
		if err != nil {
			return nil, err
		}
		activationHash = hashActivation(salt, normalizedName, normalizedBirthdate)
		issuedAt = s.now().Format(time.RFC3339)
	} else {
		if issuedAt == "" {
			issuedAt = s.now().Format(time.RFC3339)
		}
	}

	saltHash := hashSalt(salt)

	allowlist, err := s.loadAllowlist()
	if err != nil {
		return nil, err
	}

	entry := allowlistEntry{
		ActivationHash: activationHash,
		StudentIDHash:  studentIDHash,
	}

	updated := false
	for i, existing := range allowlist.Entries {
		if existing.StudentIDHash == studentIDHash {
			entry.CreatedAt = existing.CreatedAt
			entry.UpdatedAt = issuedAt
			allowlist.Entries[i] = entry
			updated = true
			break
		}
	}

	if !updated {
		entry.CreatedAt = issuedAt
		entry.UpdatedAt = issuedAt
		allowlist.Entries = append(allowlist.Entries, entry)
	}

	sort.SliceStable(allowlist.Entries, func(i, j int) bool {
		if allowlist.Entries[i].StudentIDHash == allowlist.Entries[j].StudentIDHash {
			return allowlist.Entries[i].ActivationHash < allowlist.Entries[j].ActivationHash
		}
		return allowlist.Entries[i].StudentIDHash < allowlist.Entries[j].StudentIDHash
	})

	allowlist.UpdatedAt = issuedAt

	if err := s.saveAllowlist(allowlist); err != nil {
		return nil, err
	}

	if err := s.saveStudentFile(studentIDHash, studentFile{
		Schema:         defaultSchemaStudent,
		StudentIDHash:  studentIDHash,
		ActivationHash: activationHash,
		SaltHash:       saltHash,
		CreatedAt:      entry.CreatedAt,
		UpdatedAt:      issuedAt,
	}); err != nil {
		return nil, err
	}

	index := indexOfEntry(allowlist.Entries, studentIDHash)
	result := &RegistrationResult{
		StudentID:            input.StudentID,
		StudentIDHash:        studentIDHash,
		ActivationHash:       activationHash,
		Salt:                 salt,
		DisplayName:          strings.TrimSpace(input.Name),
		NormalizedName:       normalizedName,
		NormalizedBirthdate:  normalizedBirthdate,
		AllowlistEntryIndex:  index,
		AllowlistTotalLength: len(allowlist.Entries),
		IssuedAt:             issuedAt,
	}

	if err := s.appendIssuances([]IssuanceEntry{{
		StudentID:        result.StudentID,
		StudentIDHash:    result.StudentIDHash,
		Name:             result.DisplayName,
		NormalizedName:   result.NormalizedName,
		Birthdate:        result.NormalizedBirthdate,
		Salt:             result.Salt,
		ActivationHash:   result.ActivationHash,
		CreatedAt:        issuedAt,
		AllowlistIndex:   index,
		AllowlistVersion: len(allowlist.Entries),
	}}); err != nil {
		return nil, err
	}

	return result, nil
}

// AddStudents performs bulk registration and returns results in registration order.
func (s *Service) AddStudents(inputs []StudentInput) ([]RegistrationResult, error) {
	seen := make(map[string]struct{})
	results := make([]RegistrationResult, 0, len(inputs))
	for _, in := range inputs {
		if _, ok := seen[in.StudentID]; ok {
			return nil, fmt.Errorf("CSVに重複した学籍番号があります: %s", in.StudentID)
		}
		seen[in.StudentID] = struct{}{}

		result, err := s.AddStudent(in)
		if err != nil {
			return nil, err
		}
		results = append(results, *result)
	}
	return results, nil
}

// ParseCSV turns CSV input into StudentInput slices. Supports optional headers.
func (s *Service) ParseCSV(content string) ([]StudentInput, error) {
	reader := csv.NewReader(strings.NewReader(content))
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1

	var inputs []StudentInput
	var header map[string]int
	lineNumber := 0

	for {
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("csv read error on line %d: %w", lineNumber+1, err)
		}
		lineNumber++

		// Ignore completely empty rows
		empty := true
		for _, field := range record {
			if strings.TrimSpace(field) != "" {
				empty = false
				break
			}
		}
		if empty {
			continue
		}

		if header == nil {
			if detected := detectHeader(record); detected != nil {
				header = detected
				continue
			}
			header = defaultHeader(len(record))
		}

		get := func(key string) string {
			if idx, ok := header[key]; ok && idx >= 0 && idx < len(record) {
				return record[idx]
			}
			return ""
		}

		input := StudentInput{
			StudentID:      strings.TrimSpace(get("studentId")),
			Name:           strings.TrimSpace(get("name")),
			Birthdate:      strings.TrimSpace(get("birthdate")),
			Salt:           strings.TrimSpace(get("salt")),
			ActivationHash: strings.TrimSpace(get("activationHash")),
			IssuedAt:       strings.TrimSpace(get("issuedAt")),
		}

		if err := validateInput(input); err != nil {
			return nil, fmt.Errorf("invalid row %d: %w", lineNumber, err)
		}

		inputs = append(inputs, input)
	}

	return inputs, nil
}

// GetAllowlist returns the current allowlist content for display purposes.
func (s *Service) GetAllowlist() (*AllowlistView, error) {
	file, err := s.loadAllowlist()
	if err != nil {
		return nil, err
	}

	view := &AllowlistView{
		Schema:    file.Schema,
		Issuer:    IssuerInfo{ID: file.Issuer.ID, Name: file.Issuer.Name},
		UpdatedAt: file.UpdatedAt,
		Entries:   make([]AllowlistEntryRow, len(file.Entries)),
	}

	for i, entry := range file.Entries {
		view.Entries[i] = AllowlistEntryRow{
			ActivationHash: entry.ActivationHash,
			StudentIDHash:  entry.StudentIDHash,
			CreatedAt:      entry.CreatedAt,
			UpdatedAt:      entry.UpdatedAt,
		}
	}

	return view, nil
}

// ListIssuances returns historical issuance data in reverse chronological order.
func (s *Service) ListIssuances() ([]IssuanceEntry, error) {
	file, err := s.loadIssuanceLog()
	if err != nil {
		return nil, err
	}

	entries := make([]IssuanceEntry, len(file.Entries))
	copy(entries, file.Entries)

	sort.SliceStable(entries, func(i, j int) bool {
		return entries[i].CreatedAt > entries[j].CreatedAt
	})

	return entries, nil
}

// ExportIssuancesCSV builds a CSV containing all issuance entries.
func (s *Service) ExportIssuancesCSV() (string, error) {
	entries, err := s.ListIssuances()
	if err != nil {
		return "", err
	}

	var b strings.Builder
	b.WriteString("student_id,student_id_hash,name,birthdate,salt,activation_hash,issued_at\n")
	for _, entry := range entries {
		line := fmt.Sprintf("%q,%q,%q,%q,%q,%q,%q\n",
			entry.StudentID,
			entry.StudentIDHash,
			entry.Name,
			entry.Birthdate,
			entry.Salt,
			entry.ActivationHash,
			entry.CreatedAt,
		)
		b.WriteString(line)
	}

	return b.String(), nil
}

// ExportIssuancesTo writes the issuance CSV to the provided directory.
func (s *Service) ExportIssuancesTo(dir string) (string, error) {
	if strings.TrimSpace(dir) == "" {
		dir = s.exportDir
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("ensure export directory: %w", err)
	}

	csv, err := s.ExportIssuancesCSV()
	if err != nil {
		return "", err
	}

	filename := fmt.Sprintf("issuance-log-%s.csv", s.now().Format("2006-01-02-150405"))
	path := filepath.Join(dir, filename)
	if err := os.WriteFile(path, []byte(csv), 0o644); err != nil {
		return "", fmt.Errorf("write export file: %w", err)
	}

	return path, nil
}

func (s *Service) ensureAllowlistExists() error {
	if _, err := os.Stat(s.allowlistPath); errors.Is(err, fs.ErrNotExist) {
		file := allowlistFile{
			Schema:    defaultSchemaAllowlist,
			Issuer:    s.issuer,
			UpdatedAt: s.now().Format(time.RFC3339),
			Entries:   []allowlistEntry{},
		}
		return s.saveAllowlist(&file)
	} else if err != nil {
		return fmt.Errorf("registrar: stat allowlist: %w", err)
	}
	// Update issuer info in existing allowlist if it differs
	file, err := s.loadAllowlist()
	if err != nil {
		return err
	}
	if file.Issuer.ID != s.issuer.ID || file.Issuer.Name != s.issuer.Name {
		file.Issuer = s.issuer
		file.Schema = defaultSchemaAllowlist // Upgrade schema version
		file.UpdatedAt = s.now().Format(time.RFC3339)
		return s.saveAllowlist(file)
	}
	return nil
}

func (s *Service) loadAllowlist() (*allowlistFile, error) {
	data, err := os.ReadFile(s.allowlistPath)
	if err != nil {
		return nil, fmt.Errorf("registrar: read allowlist: %w", err)
	}
	var file allowlistFile
	if err := json.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("registrar: decode allowlist: %w", err)
	}
	return &file, nil
}

func (s *Service) saveAllowlist(file *allowlistFile) error {
	payload, err := marshalJSON(file)
	if err != nil {
		return err
	}
	if err := os.WriteFile(s.allowlistPath, payload, 0o644); err != nil {
		return fmt.Errorf("registrar: write allowlist: %w", err)
	}
	return nil
}

func (s *Service) saveStudentFile(studentIDHash string, record studentFile) error {
	path := filepath.Join(s.studentsDir, fmt.Sprintf("%s.json", studentIDHash))
	if existing, err := os.ReadFile(path); err == nil {
		var current studentFile
		if err := json.Unmarshal(existing, &current); err == nil && current.CreatedAt != "" {
			record.CreatedAt = current.CreatedAt
		}
	}
	payload, err := marshalJSON(record)
	if err != nil {
		return err
	}
	// Use restrictive permissions (0600) for sensitive data
	if err := os.WriteFile(path, payload, 0o600); err != nil {
		return fmt.Errorf("registrar: write student file: %w", err)
	}
	return nil
}

func (s *Service) ensureIssuanceLogExists() error {
	if _, err := os.Stat(s.issuancePath); errors.Is(err, fs.ErrNotExist) {
		file := issuanceFile{
			Schema:    defaultSchemaIssuance,
			UpdatedAt: s.now().Format(time.RFC3339),
			DataRoot:  s.baseDir,
			Entries:   []IssuanceEntry{},
		}
		return s.saveIssuanceLog(&file)
	} else if err != nil {
		return fmt.Errorf("registrar: stat issuance log: %w", err)
	}
	return nil
}

func (s *Service) loadIssuanceLog() (*issuanceFile, error) {
	data, err := os.ReadFile(s.issuancePath)
	if err != nil {
		return nil, fmt.Errorf("registrar: read issuance log: %w", err)
	}
	var file issuanceFile
	if err := json.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("registrar: decode issuance log: %w", err)
	}
	return &file, nil
}

func (s *Service) saveIssuanceLog(file *issuanceFile) error {
	payload, err := marshalJSON(file)
	if err != nil {
		return err
	}
	// Use restrictive permissions (0600) for sensitive data
	if err := os.WriteFile(s.issuancePath, payload, 0o600); err != nil {
		return fmt.Errorf("registrar: write issuance log: %w", err)
	}
	return nil
}

func (s *Service) appendIssuances(entries []IssuanceEntry) error {
	if len(entries) == 0 {
		return nil
	}

	file, err := s.loadIssuanceLog()
	if err != nil {
		return err
	}

	file.Entries = append(file.Entries, entries...)
	file.UpdatedAt = s.now().Format(time.RFC3339)
	file.DataRoot = s.baseDir

	return s.saveIssuanceLog(file)
}

// GetIssuer returns the current issuer configuration.
func (s *Service) GetIssuer() IssuerInfo {
	return IssuerInfo{ID: s.issuer.ID, Name: s.issuer.Name}
}

// SetIssuer updates the issuer configuration and persists it to issuer.json.
func (s *Service) SetIssuer(id, name string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("issuer id is required")
	}
	if strings.TrimSpace(name) == "" {
		return errors.New("issuer name is required")
	}

	s.issuer = issuerInfo{ID: strings.TrimSpace(id), Name: strings.TrimSpace(name)}

	// Save to issuer.json
	issuerPath := filepath.Join(s.baseDir, "issuer.json")
	data := struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}{
		ID:   s.issuer.ID,
		Name: s.issuer.Name,
	}
	payload, err := marshalJSON(data)
	if err != nil {
		return err
	}
	if err := os.WriteFile(issuerPath, payload, 0o644); err != nil {
		return fmt.Errorf("registrar: write issuer.json: %w", err)
	}

	// Update allowlist with new issuer info
	file, err := s.loadAllowlist()
	if err != nil {
		return err
	}
	file.Issuer = s.issuer
	file.Schema = defaultSchemaAllowlist
	file.UpdatedAt = s.now().Format(time.RFC3339)
	return s.saveAllowlist(file)
}

// DeleteStudent removes all persisted data for the provided student ID.
func (s *Service) DeleteStudent(studentID string) error {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" {
		return fmt.Errorf("student id is required")
	}

	studentIDHash := hashStudentID(studentID)

	allowlist, err := s.loadAllowlist()
	if err != nil {
		return err
	}

	found := false
	filtered := allowlist.Entries[:0]
	for _, entry := range allowlist.Entries {
		if entry.StudentIDHash == studentIDHash {
			found = true
			continue
		}
		filtered = append(filtered, entry)
	}

	if !found {
		return fmt.Errorf("student not found: %s", studentID)
	}

	allowlist.Entries = filtered
	allowlist.UpdatedAt = s.now().Format(time.RFC3339)
	if err := s.saveAllowlist(allowlist); err != nil {
		return err
	}

	if err := os.Remove(filepath.Join(s.studentsDir, fmt.Sprintf("%s.json", studentIDHash))); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("failed to remove student file: %w", err)
	}

	issuance, err := s.loadIssuanceLog()
	if err != nil {
		return err
	}

	filteredIssuance := issuance.Entries[:0]
	for _, entry := range issuance.Entries {
		if entry.StudentIDHash == studentIDHash {
			continue
		}
		filteredIssuance = append(filteredIssuance, entry)
	}
	issuance.Entries = filteredIssuance
	issuance.UpdatedAt = s.now().Format(time.RFC3339)

	if err := s.saveIssuanceLog(issuance); err != nil {
		return err
	}

	return nil
}

func marshalJSON(v interface{}) ([]byte, error) {
	payload, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("registrar: encode json: %w", err)
	}
	return payload, nil
}

func validateInput(input StudentInput) error {
	studentID := strings.TrimSpace(input.StudentID)
	name := strings.TrimSpace(input.Name)
	birthdate := strings.TrimSpace(input.Birthdate)

	// Required field checks
	if studentID == "" {
		return errors.New("student id is required")
	}
	if name == "" {
		return errors.New("name is required")
	}
	if birthdate == "" {
		return errors.New("birthdate is required")
	}

	// Length validation
	if len(studentID) > maxStudentIDLength {
		return fmt.Errorf("student id too long (max %d characters)", maxStudentIDLength)
	}
	if len(name) > maxNameLength {
		return fmt.Errorf("name too long (max %d characters)", maxNameLength)
	}
	if len(birthdate) > maxBirthdateLength {
		return fmt.Errorf("birthdate too long (max %d characters)", maxBirthdateLength)
	}

	// Student ID format validation (alphanumeric and hyphen only)
	if !studentIDPattern.MatchString(studentID) {
		return errors.New("student id contains invalid characters (only alphanumeric and hyphen allowed)")
	}

	// Name sanitization check (no control characters)
	for _, r := range name {
		if r < 32 && r != '\t' && r != '\n' {
			return errors.New("name contains invalid control characters")
		}
	}

	// Optional field length validation
	if len(strings.TrimSpace(input.Salt)) > 100 {
		return errors.New("salt too long")
	}
	if len(strings.TrimSpace(input.ActivationHash)) > 200 {
		return errors.New("activation hash too long")
	}

	return nil
}

func normalizeName(name string) string {
	collapsed := spaceCollapser.ReplaceAllString(strings.TrimSpace(name), " ")
	return strings.ToUpper(collapsed)
}

func normalizeBirthdate(value string) (string, error) {
	clean := spaceCollapser.ReplaceAllString(strings.TrimSpace(value), "")
	clean = strings.ReplaceAll(clean, "年", "-")
	clean = strings.ReplaceAll(clean, "月", "-")
	clean = strings.ReplaceAll(clean, "日", "")

	for _, layout := range dateLayouts {
		if t, err := time.Parse(layout, clean); err == nil {
			return t.Format("2006-01-02"), nil
		}
	}

	return "", fmt.Errorf("invalid birthdate format: %q", value)
}

func generateSalt() (string, error) {
	const saltBytes = 18 // ~90 bits when base32 encoded without padding (~29 chars)
	buf := make([]byte, saltBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}
	enc := base32.StdEncoding.WithPadding(base32.NoPadding)
	return enc.EncodeToString(buf), nil
}

func hashActivation(salt, name, birthdate string) string {
	h := sha512.Sum512([]byte("activation|" + salt + "|" + name + "|" + birthdate))
	return "sha512:" + hex.EncodeToString(h[:])
}

func hashStudentID(studentID string) string {
	normalized := strings.ToUpper(spaceCollapser.ReplaceAllString(strings.TrimSpace(studentID), ""))
	sum := sha512.Sum512([]byte("student-id|" + normalized))
	return "sha512:" + hex.EncodeToString(sum[:])
}

func hashSalt(salt string) string {
	sum := sha256.Sum256([]byte("salt|" + salt))
	return "sha256:" + hex.EncodeToString(sum[:])
}

func indexOfEntry(entries []allowlistEntry, studentIDHash string) int {
	for i, entry := range entries {
		if entry.StudentIDHash == studentIDHash {
			return i
		}
	}
	return -1
}

func detectHeader(record []string) map[string]int {
	mapping := map[string]int{
		"studentId":      -1,
		"name":           -1,
		"birthdate":      -1,
		"salt":           -1,
		"activationHash": -1,
		"issuedAt":       -1,
	}
	for idx, raw := range record {
		candidate := strings.ToLower(strings.TrimSpace(raw))
		switch candidate {
		case "student_id", "studentid", "student", "id", "student-id":
			mapping["studentId"] = idx
		case "name", "full_name", "full name", "氏名":
			mapping["name"] = idx
		case "birthdate", "birth date", "dob", "date_of_birth", "生年月日":
			mapping["birthdate"] = idx
		case "salt":
			mapping["salt"] = idx
		case "activation_hash", "activationhash", "activation-hash":
			mapping["activationHash"] = idx
		case "issued_at", "issuedat", "issued-at", "created_at":
			mapping["issuedAt"] = idx
		default:
			continue
		}
	}

	for _, idx := range mapping {
		if idx < 0 {
			return nil
		}
	}

	return mapping
}

func defaultHeader(length int) map[string]int {
	mapping := map[string]int{
		"studentId": 0,
		"name":      1,
		"birthdate": 2,
	}
	if length > 3 {
		mapping["salt"] = 3
	}
	if length > 4 {
		mapping["activationHash"] = 4
	}
	if length > 5 {
		mapping["issuedAt"] = 5
	}
	return mapping
}
