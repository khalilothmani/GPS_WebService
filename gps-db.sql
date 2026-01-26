-- GPS Tracking System Database Schema
-- MySQL 8.0+ compatible

-- Drop tables if they exist (for fresh install)
DROP TABLE IF EXISTS gps_data;
DROP TABLE IF EXISTS gps_devices;

-- Devices table
CREATE TABLE gps_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_imei VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_imei (device_imei),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- GPS data table
CREATE TABLE gps_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gps_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    battery_voltage DECIMAL(4, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gps_id) REFERENCES gps_devices(id) ON DELETE CASCADE,
    INDEX idx_gps_id (gps_id),
    INDEX idx_created_at (created_at),
    INDEX idx_location (latitude, longitude),
    INDEX idx_gps_time (gps_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample devices
INSERT INTO gps_devices (device_imei) VALUES 
('ESP32_GPS_TRACKER_001'),
('ESP32_GPS_TRACKER_002'),
('TEST_DEVICE_001');

-- Insert sample GPS data
INSERT INTO gps_data (gps_id, latitude, longitude, speed, heading, battery_voltage) VALUES
(1, 36.8065000, 10.1815000, 15.50, 180.00, 3.70),
(1, 36.8066000, 10.1816000, 16.20, 182.50, 3.65),
(1, 36.8067000, 10.1817000, 14.80, 185.00, 3.60),
(2, 36.8068000, 10.1818000, 18.30, 90.00, 3.80),
(2, 36.8069000, 10.1819000, 17.90, 92.50, 3.75);

-- Create views for easier querying
CREATE VIEW vw_latest_gps AS
SELECT 
    d.device_imei,
    g.latitude,
    g.longitude,
    g.speed,
    g.heading,
    g.battery_voltage,
    g.created_at
FROM gps_data g
JOIN gps_devices d ON g.gps_id = d.id
WHERE g.created_at = (
    SELECT MAX(created_at) 
    FROM gps_data 
    WHERE gps_id = g.gps_id
);

CREATE VIEW vw_device_stats AS
SELECT 
    d.id,
    d.device_imei,
    COUNT(g.id) as total_points,
    MIN(g.created_at) as first_seen,
    MAX(g.created_at) as last_seen,
    AVG(g.speed) as avg_speed,
    AVG(g.battery_voltage) as avg_battery
FROM gps_devices d
LEFT JOIN gps_data g ON d.id = g.gps_id
GROUP BY d.id, d.device_imei;

-- Create stored procedure for adding GPS data
DELIMITER //
CREATE PROCEDURE sp_add_gps_data(
    IN p_device_imei VARCHAR(50),
    IN p_latitude DECIMAL(10, 8),
    IN p_longitude DECIMAL(11, 8),
    IN p_speed DECIMAL(5, 2),
    IN p_heading DECIMAL(5, 2),
    IN p_battery_voltage DECIMAL(4, 2)
)
BEGIN
    DECLARE v_gps_id INT;
    
    -- Get or create device
    SELECT id INTO v_gps_id FROM gps_devices WHERE device_imei = p_device_imei;
    
    IF v_gps_id IS NULL THEN
        INSERT INTO gps_devices (device_imei) VALUES (p_device_imei);
        SET v_gps_id = LAST_INSERT_ID();
    END IF;
    
    -- Insert GPS data
    INSERT INTO gps_data (gps_id, latitude, longitude, speed, heading, battery_voltage)
    VALUES (v_gps_id, p_latitude, p_longitude, p_speed, p_heading, p_battery_voltage);
    
    SELECT v_gps_id as device_id, LAST_INSERT_ID() as data_id;
END //
DELIMITER ;

-- Show table structure
SHOW TABLES;

-- Show sample data
SELECT 'Devices:' as '';
SELECT * FROM gps_devices;

SELECT '\nLatest GPS Data:' as '';
SELECT * FROM vw_latest_gps;

SELECT '\nDevice Statistics:' as '';
SELECT * FROM vw_device_stats;
