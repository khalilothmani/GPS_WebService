-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : lun. 05 jan. 2026 à 13:50
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `gps-db`
--

-- --------------------------------------------------------

--
-- Structure de la table `device_logs`
--

CREATE TABLE `device_logs` (
  `id` bigint(20) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `log_type` enum('info','warning','error') DEFAULT NULL,
  `message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `gps_action_history`
--

CREATE TABLE `gps_action_history` (
  `id` bigint(20) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `action_type` enum('config_change','port_change','sms_command','status_change','ownership_change') DEFAULT NULL,
  `reference_id` bigint(20) DEFAULT NULL,
  `performed_by` enum('user','sms','system') DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `gps_config_history`
--

CREATE TABLE `gps_config_history` (
  `id` bigint(20) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `send_interval_sec` int(11) DEFAULT NULL,
  `sms_enabled` tinyint(4) DEFAULT NULL,
  `gprs_enabled` tinyint(4) DEFAULT NULL,
  `speed_limit` int(11) DEFAULT NULL,
  `geo_fence_enabled` tinyint(4) DEFAULT NULL,
  `changed_by` enum('user','sms','system') NOT NULL,
  `changed_by_user` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `gps_data`
--

CREATE TABLE `gps_data` (
  `id` bigint(20) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `speed` float DEFAULT NULL,
  `heading` int(11) DEFAULT NULL,
  `battery_voltage` float DEFAULT NULL,
  `signal_strength` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `gps_devices`
--

CREATE TABLE `gps_devices` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `device_imei` varchar(20) NOT NULL,
  `sim_phone` varchar(20) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `model` varchar(50) DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `last_seen` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `gps_ports`
--

CREATE TABLE `gps_ports` (
  `id` int(11) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `port_number` int(11) NOT NULL,
  `port_name` varchar(50) DEFAULT NULL,
  `state` enum('ON','OFF') DEFAULT 'OFF',
  `last_changed` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `gps_port_history`
--

CREATE TABLE `gps_port_history` (
  `id` bigint(20) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `port_number` int(11) NOT NULL,
  `old_state` enum('ON','OFF') DEFAULT NULL,
  `new_state` enum('ON','OFF') DEFAULT NULL,
  `changed_by` enum('user','sms','system') NOT NULL,
  `changed_by_user` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `gps_status_history`
--

CREATE TABLE `gps_status_history` (
  `id` bigint(20) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `status` enum('online','offline','sleep','error') DEFAULT NULL,
  `battery_voltage` float DEFAULT NULL,
  `signal_strength` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `sms_commands`
--

CREATE TABLE `sms_commands` (
  `id` int(11) NOT NULL,
  `gps_id` int(11) NOT NULL,
  `sender_phone` varchar(20) DEFAULT NULL,
  `command` text DEFAULT NULL,
  `status` enum('pending','executed','failed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `executed_at` timestamp NULL DEFAULT NULL,
  `response` text DEFAULT NULL,
  `processed_by` enum('device','server') DEFAULT NULL,
  `error_message` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `user_plans`
--

CREATE TABLE `user_plans` (
  `id` int(11) NOT NULL,
  `name` enum('personal','bronze','silver','gold','platinum') DEFAULT NULL,
  `max_gps` int(11) NOT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `user_plans`
--

INSERT INTO `user_plans` (`id`, `name`, `max_gps`, `price`, `description`) VALUES
(1, 'personal', 1, 0.00, NULL),
(2, 'bronze', 2, 0.00, NULL),
(3, 'silver', 5, 0.00, NULL),
(4, 'gold', 10, 0.00, NULL),
(5, 'platinum', 999, 0.00, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `device_logs`
--
ALTER TABLE `device_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gps_id` (`gps_id`);

--
-- Index pour la table `gps_action_history`
--
ALTER TABLE `gps_action_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gps_id` (`gps_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `gps_config_history`
--
ALTER TABLE `gps_config_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gps_id` (`gps_id`),
  ADD KEY `changed_by_user` (`changed_by_user`);

--
-- Index pour la table `gps_data`
--
ALTER TABLE `gps_data`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_gps_data_gps_time` (`gps_id`,`created_at`);

--
-- Index pour la table `gps_devices`
--
ALTER TABLE `gps_devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `device_imei` (`device_imei`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `gps_ports`
--
ALTER TABLE `gps_ports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gps_id` (`gps_id`);

--
-- Index pour la table `gps_port_history`
--
ALTER TABLE `gps_port_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gps_id` (`gps_id`),
  ADD KEY `changed_by_user` (`changed_by_user`);

--
-- Index pour la table `gps_status_history`
--
ALTER TABLE `gps_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gps_id` (`gps_id`);

--
-- Index pour la table `sms_commands`
--
ALTER TABLE `sms_commands`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gps_id` (`gps_id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `user_plans`
--
ALTER TABLE `user_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Index pour la table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `device_logs`
--
ALTER TABLE `device_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `gps_action_history`
--
ALTER TABLE `gps_action_history`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `gps_config_history`
--
ALTER TABLE `gps_config_history`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `gps_data`
--
ALTER TABLE `gps_data`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `gps_devices`
--
ALTER TABLE `gps_devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `gps_ports`
--
ALTER TABLE `gps_ports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `gps_port_history`
--
ALTER TABLE `gps_port_history`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `gps_status_history`
--
ALTER TABLE `gps_status_history`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `sms_commands`
--
ALTER TABLE `sms_commands`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `user_plans`
--
ALTER TABLE `user_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `device_logs`
--
ALTER TABLE `device_logs`
  ADD CONSTRAINT `device_logs_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `gps_action_history`
--
ALTER TABLE `gps_action_history`
  ADD CONSTRAINT `gps_action_history_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`),
  ADD CONSTRAINT `gps_action_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `gps_config_history`
--
ALTER TABLE `gps_config_history`
  ADD CONSTRAINT `gps_config_history_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `gps_config_history_ibfk_2` FOREIGN KEY (`changed_by_user`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `gps_data`
--
ALTER TABLE `gps_data`
  ADD CONSTRAINT `gps_data_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `gps_devices`
--
ALTER TABLE `gps_devices`
  ADD CONSTRAINT `gps_devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `gps_ports`
--
ALTER TABLE `gps_ports`
  ADD CONSTRAINT `gps_ports_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `gps_port_history`
--
ALTER TABLE `gps_port_history`
  ADD CONSTRAINT `gps_port_history_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `gps_port_history_ibfk_2` FOREIGN KEY (`changed_by_user`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `gps_status_history`
--
ALTER TABLE `gps_status_history`
  ADD CONSTRAINT `gps_status_history_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `sms_commands`
--
ALTER TABLE `sms_commands`
  ADD CONSTRAINT `sms_commands_ibfk_1` FOREIGN KEY (`gps_id`) REFERENCES `gps_devices` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
