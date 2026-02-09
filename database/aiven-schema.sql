DROP TABLE IF EXISTS gps_data;
DROP TABLE IF EXISTS gps_devices;

CREATE TABLE gps_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_imei VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_imei (device_imei),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    
    SELECT id INTO v_gps_id FROM gps_devices WHERE device_imei = p_device_imei;
    
    IF v_gps_id IS NULL THEN
        INSERT INTO gps_devices (device_imei) VALUES (p_device_imei);
        SET v_gps_id = LAST_INSERT_ID();
    END IF;
    
    INSERT INTO gps_data (gps_id, latitude, longitude, speed, heading, battery_voltage)
    VALUES (v_gps_id, p_latitude, p_longitude, p_speed, p_heading, p_battery_voltage);
    
    SELECT v_gps_id as device_id, LAST_INSERT_ID() as data_id;
END //
DELIMITER ;
