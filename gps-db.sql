-- GPS Database Schema for ESP32 Tracking System

-- Devices table
CREATE TABLE IF NOT EXISTS gps_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_imei VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_imei (device_imei)
);

-- GPS data table
CREATE TABLE IF NOT EXISTS gps_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gps_id INT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    battery_voltage DECIMAL(4, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gps_id) REFERENCES gps_devices(id) ON DELETE CASCADE,
    INDEX idx_created_at (created_at),
    INDEX idx_gps_id (gps_id),
    INDEX idx_location (latitude, longitude)
);

-- Sample data for testing
INSERT IGNORE INTO gps_devices (device_imei) VALUES 
('123456789012345'),
('987654321098765');

INSERT INTO gps_data (gps_id, latitude, longitude, speed, heading, battery_voltage) VALUES
(1, 40.712800, -74.006000, 50.5, 180, 3.7),
(1, 40.712900, -74.006100, 52.3, 182, 3.6),
(2, 40.713000, -74.006200, 48.7, 178, 3.8);
