// backend/repository/dashboard_methods.go

package repository

import (
	"time"

	"FleetDrive/backend/models"
)

// Add these methods to the VehicleRepository

func (r *VehicleRepository) CountByStatus(status string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Vehicle{}).Where("status = ?", status).Count(&count).Error
	return count, err
}

func (r *VehicleRepository) FindAllWithLimit(limit int) ([]models.Vehicle, error) {
	var vehicles []models.Vehicle
	err := r.db.Order("created_at DESC").Limit(limit).Find(&vehicles).Error
	return vehicles, err
}

// Add these methods to the DriverRepository

func (r *DriverRepository) FindAllWithLimit(limit int) ([]models.Driver, error) {
	var drivers []models.Driver
	err := r.db.Order("created_at DESC").Limit(limit).Find(&drivers).Error
	if err != nil {
		return nil, err
	}

	// Load assigned vehicle information
	for i := range drivers {
		if drivers[i].AssignedVehicleID != nil {
			var vehicle models.Vehicle
			if err := r.db.First(&vehicle, "id = ?", drivers[i].AssignedVehicleID).Error; err == nil {
				drivers[i].VehicleName = vehicle.Brand + " " + vehicle.Model
			}
		}
	}

	return drivers, nil
}

// Add these methods to the MaintenanceRepository

func (r *MaintenanceRepository) FindUpcomingWithLimit(endDate time.Time, limit int) ([]models.Maintenance, error) {
	var maintenanceEntries []models.Maintenance
	now := time.Now()

	err := r.db.Where("date >= ? AND date <= ?", now, endDate).
		Order("date ASC").
		Limit(limit).
		Find(&maintenanceEntries).Error

	if err != nil {
		return nil, err
	}

	// Load vehicle information
	for i := range maintenanceEntries {
		var vehicle models.Vehicle
		if err := r.db.First(&vehicle, "id = ?", maintenanceEntries[i].VehicleID).Error; err == nil {
			maintenanceEntries[i].VehicleName = vehicle.Brand + " " + vehicle.Model
		}
	}

	return maintenanceEntries, nil
}

func (r *MaintenanceRepository) FindRecentWithLimit(limit int) ([]models.Maintenance, error) {
	var maintenanceEntries []models.Maintenance

	err := r.db.Order("date DESC").
		Limit(limit).
		Find(&maintenanceEntries).Error

	if err != nil {
		return nil, err
	}

	// Load vehicle information
	for i := range maintenanceEntries {
		var vehicle models.Vehicle
		if err := r.db.First(&vehicle, "id = ?", maintenanceEntries[i].VehicleID).Error; err == nil {
			maintenanceEntries[i].VehicleName = vehicle.Brand + " " + vehicle.Model
		}
	}

	return maintenanceEntries, nil
}

// Add these methods to the UsageRepository

func (r *UsageRepository) FindRecentWithLimit(limit int) ([]models.Usage, error) {
	var usageEntries []models.Usage

	err := r.db.Order("start_date DESC").
		Limit(limit).
		Find(&usageEntries).Error

	if err != nil {
		return nil, err
	}

	// Load vehicle and driver information
	for i := range usageEntries {
		// Load vehicle details
		var vehicle models.Vehicle
		if err := r.db.First(&vehicle, "id = ?", usageEntries[i].VehicleID).Error; err == nil {
			usageEntries[i].VehicleName = vehicle.Brand + " " + vehicle.Model
		}

		// Load driver details
		if usageEntries[i].DriverID != nil {
			var driver models.Driver
			if err := r.db.First(&driver, "id = ?", usageEntries[i].DriverID).Error; err == nil {
				usageEntries[i].DriverName = driver.FirstName + " " + driver.LastName
			}
		}
	}

	return usageEntries, nil
}
