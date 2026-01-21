-- 1. Disable all checks for a clean start on Aiven
SET SESSION sql_require_primary_key = 0;
SET FOREIGN_KEY_CHECKS = 0; 
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. user_plans
-- --------------------------------------------------------
DROP TABLE IF EXISTS `user_plans`;
CREATE TABLE `user_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` enum('personal','bronze','silver','gold','platinum') DEFAULT NULL,
  `max_gps` int(11) NOT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `user_plans` (`id`, `name`, `max_gps`, `price`, `description`) VALUES
(1, 'personal', 1, 0.00, NULL),
(2, 'bronze', 2, 0.00, NULL),
(3, 'silver', 5, 0.00, NULL),
(4, 'gold', 10, 0.00, NULL),
(5, 'platinum', 999, 0.00, NULL);

-- --------------------------------------------------------
-- 2. users
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 3. gps_devices
-- --------------------------------------------------------
DROP TABLE IF EXISTS `gps_devices`;
CREATE TABLE `gps_devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `device_imei` varchar(20) NOT NULL,
  `sim_phone` varchar(20) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `model` varchar(50) DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `last_seen` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_imei` (`device_imei`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `gps_devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 4. device_logs
-- --------------------------------------------------------
DROP TABLE IF EXISTS `device_logs`;
CREATE TABLE `device_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `gps_id` int(11) NOT NULL,
  `log_type` enum('info','warning','error') DEFAULT NULL,
  `message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `gps_id` (`gps_id`),
  CONSTRAINT `device_logs_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 5. gps_data
-- --------------------------------------------------------
DROP TABLE IF EXISTS `gps_data`;
CREATE TABLE `gps_data` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `gps_id` int(11) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `speed` float DEFAULT NULL,
  `heading` int(11) DEFAULT NULL,
  `battery_voltage` float DEFAULT NULL,
  `signal_strength` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_gps_data_gps_time` (`gps_id`,`created_at`),
  CONSTRAINT `gps_data_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 6. gps_ports
-- --------------------------------------------------------
DROP TABLE IF EXISTS `gps_ports`;
CREATE TABLE `gps_ports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `gps_id` int(11) NOT NULL,
  `port_number` int(11) NOT NULL,
  `port_name` varchar(50) DEFAULT NULL,
  `state` enum('ON','OFF') DEFAULT 'OFF',
  `last_changed` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `gps_id` (`gps_id`),
  CONSTRAINT `gps_ports_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 7. sms_commands
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sms_commands`;
CREATE TABLE `sms_commands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `gps_id` int(11) NOT NULL,
  `sender_phone` varchar(20) DEFAULT NULL,
  `command` text DEFAULT NULL,
  `status` enum('pending','executed','failed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `executed_at` timestamp NULL DEFAULT NULL,
  `response` text DEFAULT NULL,
  `processed_by` enum('device','server') DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `gps_id` (`gps_id`),
  CONSTRAINT `sms_commands_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 8. user_sessions
-- --------------------------------------------------------
DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 9. gps_status_history
-- --------------------------------------------------------
DROP TABLE IF EXISTS `gps_status_history`;
CREATE TABLE `gps_status_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `gps_id` int(11) NOT NULL,
  `status` enum('online','offline','sleep','error') DEFAULT NULL,
  `battery_voltage` float DEFAULT NULL,
  `signal_strength` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `gps_id` (`gps_id`),
  CONSTRAINT `gps_status_history_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
