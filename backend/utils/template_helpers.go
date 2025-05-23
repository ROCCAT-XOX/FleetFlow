// backend/utils/template_helpers.go
package utils

import (
	"fmt"
	"html/template"
	"math"
	"strings"
	"time"
)

// GetInitials extrahiert die Initialen aus einem Vor- und Nachnamen
func GetInitials(fullName string) string {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return "?"
	}

	if len(parts) == 1 {
		if len(parts[0]) > 0 {
			return strings.ToUpper(string(parts[0][0]))
		}
		return "?"
	}

	// Erste Buchstaben von Vor- und Nachname
	firstInitial := string(parts[0][0])
	lastInitial := string(parts[len(parts)-1][0])

	return strings.ToUpper(firstInitial + lastInitial)
}

// FormatMileage formatiert Kilometerstände mit Tausendertrennzeichen
func FormatMileage(km int) string {
	return fmt.Sprintf("%d km", km)
}

// FormatCurrency formatiert Beträge als Euro-Währung
func FormatCurrency(amount float64) string {
	return fmt.Sprintf("%.2f €", amount)
}

// VehicleStatusText gibt den deutschen Text für einen Fahrzeugstatus zurück
func VehicleStatusText(status string) string {
	switch status {
	case "available":
		return "Verfügbar"
	case "inuse":
		return "In Nutzung"
	case "maintenance":
		return "In Wartung"
	default:
		return status
	}
}

// DriverStatusText gibt den deutschen Text für einen Fahrerstatus zurück
func DriverStatusText(status string) string {
	switch status {
	case "available":
		return "Verfügbar"
	case "onduty":
		return "Im Dienst"
	case "offduty":
		return "Außer Dienst"
	default:
		return status
	}
}

// TemplateHelpers gibt eine Map mit Hilfsfunktionen für Templates zurück
func TemplateHelpers() template.FuncMap {
	return template.FuncMap{
		"safeHTML": func(s string) template.HTML {
			return template.HTML(s)
		},
		"formatDate": func(date time.Time) string {
			return date.Format("02.01.2006")
		},
		"formatDateTime": func(date time.Time) string {
			return date.Format("02.01.2006 15:04")
		},
		"formatTime": func(date time.Time) string {
			return date.Format("15:04")
		},
		"formatMonth": func(date time.Time) string {
			return date.Format("Januar 2006")
		},
		"formatFileSize": func(size int64) string {
			const unit = 1024
			if size < unit {
				return fmt.Sprintf("%d B", size)
			}
			div, exp := int64(unit), 0
			for n := size / unit; n >= unit; n /= unit {
				div *= unit
				exp++
			}
			return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
		},
		"iterate": func(count int) []int {
			var i []int
			for j := 0; j < count; j++ {
				i = append(i, j)
			}
			return i
		},
		"add": func(a, b int) int {
			return a + b
		},
		"subtract": func(a, b int) int {
			return a - b
		},
		"multiply": func(a, b int) int {
			return a * b
		},
		"divide": func(a, b int) float64 {
			if b == 0 {
				return 0
			}
			return float64(a) / float64(b)
		},
		"round": func(num float64) int {
			return int(math.Round(num))
		},
		"eq": func(a, b interface{}) bool {
			return fmt.Sprintf("%v", a) == fmt.Sprintf("%v", b)
		},
		"neq": func(a, b interface{}) bool {
			return a != b
		},
		"lt": func(a, b int) bool {
			return a < b
		},
		"lte": func(a, b int) bool {
			return a <= b
		},
		"gt": func(a, b int) bool {
			return a > b
		},
		"gte": func(a, b int) bool {
			return a >= b
		},
		"now": func() time.Time {
			return time.Now()
		},
		"isoWeek": func(t time.Time) int {
			_, week := t.ISOWeek()
			return week
		},
		"abs": func(x interface{}) interface{} {
			switch v := x.(type) {
			case int:
				if v < 0 {
					return -v
				}
				return v
			case float64:
				if v < 0 {
					return -v
				}
				return v
			default:
				return x
			}
		},

		// FleetFlow-spezifische Hilfsfunktionen
		"getInitials":       GetInitials,
		"formatMileage":     FormatMileage,
		"formatCurrency":    FormatCurrency,
		"vehicleStatusText": VehicleStatusText,
		"driverStatusText":  DriverStatusText,

		// Weitere nützliche Funktionen
		"contains": func(s, substr string) bool {
			return strings.Contains(s, substr)
		},
		"hasPrefix": func(s, prefix string) bool {
			return strings.HasPrefix(s, prefix)
		},
		"hasSuffix": func(s, suffix string) bool {
			return strings.HasSuffix(s, suffix)
		},
		"lower":      strings.ToLower,
		"upper":      strings.ToUpper,
		"title":      strings.Title,
		"trim":       strings.TrimSpace,
		"split":      strings.Split,
		"join":       strings.Join,
		"replace":    strings.Replace,
		"replaceAll": strings.ReplaceAll,
	}
}
