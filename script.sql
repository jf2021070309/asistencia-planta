-- ==============================================================================
-- SISTEMA DE CONTROL DE ASISTENCIA Y DESPACHO DE GAS - SURGAS
-- BASE DE DATOS: asistencia_planta
-- COMPATIBLE CON: MySQL 8.0+ / MariaDB 10.4+
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `asistencia_planta` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `asistencia_planta`;

-- Desactivar restricciones de claves foráneas temporalmente para recrear tablas
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `asistencias`;
DROP TABLE IF EXISTS `esquelas`;
DROP TABLE IF EXISTS `vehiculos`;
DROP TABLE IF EXISTS `personal`;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. TABLA: personal
-- Almacena los datos del personal operativo y choferes de planta
-- ------------------------------------------------------------------------------
CREATE TABLE `personal` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(20) NOT NULL UNIQUE,
  `nombres` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(100) NOT NULL,
  `nombre_completo` VARCHAR(200) NOT NULL,
  `dni` VARCHAR(15) NULL,
  `cargo` VARCHAR(50) DEFAULT 'Operario de Planta',
  `hora_entrada_regular` TIME DEFAULT '07:30:00',
  `hora_salida_regular` TIME DEFAULT '16:30:00',
  `minutos_tolerancia` INT DEFAULT 0,
  `es_chofer` TINYINT(1) DEFAULT 0,
  `estado` ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_personal_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLA: vehiculos
-- Flota de vehículos de despacho de gas
-- ------------------------------------------------------------------------------
CREATE TABLE `vehiculos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `placa` VARCHAR(20) NOT NULL UNIQUE,
  `marca` VARCHAR(50) NULL,
  `modelo` VARCHAR(50) NULL,
  `capacidad_balones` INT DEFAULT 120,
  `estado` ENUM('ACTIVO', 'MANTENIMIENTO', 'INACTIVO') DEFAULT 'ACTIVO',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLA: asistencias
-- Registro diario de asistencia, tardanzas y faltas
-- ------------------------------------------------------------------------------
CREATE TABLE `asistencias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `personal_id` INT NOT NULL,
  `fecha` DATE NOT NULL,
  `asistio` ENUM('SI', 'NO') DEFAULT 'NO',
  `estado` ENUM('P', 'F', 'T', '-') NOT NULL DEFAULT 'F' 
    COMMENT 'P=Presente, F=Falta, T=Tardanza, -=Descanso/Feriado',
  `hora_entrada` TIME NULL,
  `hora_salida` TIME NULL,
  `minutos_tardanza` INT DEFAULT 0,
  `observaciones` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_personal_fecha` (`personal_id`, `fecha`),
  INDEX `idx_asistencias_fecha` (`fecha`),
  INDEX `idx_asistencias_estado` (`estado`),
  CONSTRAINT `fk_asistencia_personal` FOREIGN KEY (`personal_id`) 
    REFERENCES `personal` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLA: esquelas
-- Despacho y retorno de balones de gas licuado de petróleo (GLP)
-- ------------------------------------------------------------------------------
CREATE TABLE `esquelas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `correlativo` VARCHAR(20) NOT NULL UNIQUE,
  `fecha` DATE NOT NULL,
  `chofer_id` INT NULL,
  `vehiculo_id` INT NULL,
  `hora_salida` TIME NULL,
  `hora_llegada` TIME NULL,
  `observaciones` TEXT NULL,
  
  -- Balones Llenos (Salida)
  `llenos_10kg` INT DEFAULT 0,
  `llenos_45kg` INT DEFAULT 0,
  `llenos_5kg` INT DEFAULT 0,
  
  -- Devolución Cambios (Salida)
  `cambios_salida_5kg` INT DEFAULT 0,
  `cambios_salida_10kg` INT DEFAULT 0,
  `cambios_salida_45kg` INT DEFAULT 0,
  
  -- Balones Vacíos (Ingreso / Retorno)
  `vacios_10kg` INT DEFAULT 0,
  `vacios_45kg` INT DEFAULT 0,
  `vacios_5kg` INT DEFAULT 0,
  
  -- Devolución Cambios (Ingreso / Retorno)
  `cambios_ingreso_5kg` INT DEFAULT 0,
  `cambios_ingreso_10kg` INT DEFAULT 0,
  `cambios_ingreso_45kg` INT DEFAULT 0,
  
  `estado` ENUM('PENDIENTE', 'COMPLETADO', 'ANULADO') DEFAULT 'COMPLETADO',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_esquelas_fecha` (`fecha`),
  INDEX `idx_esquelas_correlativo` (`correlativo`),
  CONSTRAINT `fk_esquelas_chofer` FOREIGN KEY (`chofer_id`) 
    REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_esquelas_vehiculo` FOREIGN KEY (`vehiculo_id`) 
    REFERENCES `vehiculos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Adelantos de Dinero
CREATE TABLE IF NOT EXISTS `adelantos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `personal_id` INT NOT NULL,
  `fecha` DATE NOT NULL,
  `monto` DECIMAL(10,2) NOT NULL,
  `observaciones` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_adelantos_personal` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INSERCIÓN DE DATOS INICIALES (SEMILLA BASADA EN EL SISTEMA EN PRODUCCIÓN)
-- ==============================================================================

-- 1. Insertar Personal (8 empleados observados en la matriz)
INSERT INTO `personal` (`id`, `codigo`, `nombres`, `apellidos`, `nombre_completo`, `dni`, `cargo`, `hora_entrada_regular`, `hora_salida_regular`, `es_chofer`) VALUES
(1, 'PER-001', 'Kevin Antony', 'Aratea Mamani', 'Aratea Mamani, Kevin Antony', '72418901', 'Chofer Repartidor', '07:30:00', '16:30:00', 1),
(2, 'PER-002', 'Diana Estefany', 'Condori Salas', 'Condori Salas, Diana Estefany', '73529012', 'Operario de Envasado', '07:30:00', '16:30:00', 0),
(3, 'PER-003', 'Angel', 'Lopez Mansilla', 'Lopez Mansilla, Angel', '71239845', 'Operario de Plataforma', '07:30:00', '16:30:00', 0),
(4, 'PER-004', 'Jerry Jose', 'Lopez Mansilla', 'Lopez Mansilla, Jerry Jose', '74829103', 'Operario de Envasado', '07:30:00', '16:30:00', 0),
(5, 'PER-005', 'Edwin', 'Machaca Chuquimamani', 'Machaca Chuquimamani, Edwin', '70293814', 'Operario de Mantenimiento', '07:30:00', '16:30:00', 0),
(6, 'PER-006', 'Brayam', 'Machaca Flores', 'Machaca Flores, Brayam', '75910283', 'Chofer Repartidor', '07:30:00', '16:30:00', 1),
(7, 'PER-007', 'Willy', 'Rengifo Ticona', 'Rengifo Ticona, Willy', '76192834', 'Chofer Repartidor', '07:30:00', '16:30:00', 1),
(8, 'PER-008', 'Farley', 'Viveros Blanco', 'Viveros Blanco, Farley', '71029384', 'Operario de Envasado', '07:30:00', '16:30:00', 0);

-- 2. Insertar Vehículos de Despacho
INSERT INTO `vehiculos` (`id`, `placa`, `marca`, `modelo`, `capacidad_balones`) VALUES
(1, 'V1X-890', 'Hyundai', 'HD78', 120),
(2, 'B7A-721', 'Mitsubishi', 'Canter', 140),
(3, 'Z3T-815', 'Isuzu', 'Forward', 150),
(4, 'A4F-912', 'Hino', 'Dutro', 110);

-- 3. Insertar Esquelas Previas (Para que el correlativo actual sea ESQ-013)
INSERT INTO `esquelas` (`id`, `correlativo`, `fecha`, `chofer_id`, `vehiculo_id`, `hora_salida`, `hora_llegada`, `llenos_10kg`, `llenos_45kg`, `llenos_5kg`, `vacios_10kg`, `vacios_45kg`, `vacios_5kg`) VALUES
(1, 'ESQ-001', '2026-10-01', 1, 1, '08:30:00', '14:20:00', 80, 10, 5, 78, 10, 5),
(2, 'ESQ-002', '2026-10-02', 6, 2, '08:45:00', '15:10:00', 95, 12, 8, 95, 12, 8),
(3, 'ESQ-003', '2026-10-03', 7, 3, '09:00:00', '15:30:00', 110, 15, 10, 108, 15, 10),
(4, 'ESQ-004', '2026-10-05', 1, 1, '08:30:00', '14:40:00', 75, 8, 4, 75, 8, 4),
(5, 'ESQ-005', '2026-10-06', 6, 2, '08:50:00', '15:00:00', 90, 10, 6, 88, 10, 6),
(6, 'ESQ-006', '2026-10-07', 7, 3, '08:35:00', '14:50:00', 105, 14, 8, 105, 14, 8),
(7, 'ESQ-007', '2026-10-09', 1, 1, '08:40:00', '15:20:00', 85, 10, 5, 84, 10, 5),
(8, 'ESQ-008', '2026-10-10', 6, 2, '08:30:00', '14:30:00', 92, 11, 7, 92, 11, 7),
(9, 'ESQ-009', '2026-10-12', 7, 3, '08:45:00', '15:40:00', 100, 15, 9, 99, 15, 9),
(10, 'ESQ-010', '2026-10-13', 1, 1, '08:30:00', '14:15:00', 80, 8, 5, 80, 8, 5),
(11, 'ESQ-011', '2026-10-14', 6, 2, '08:50:00', '15:10:00', 90, 12, 6, 89, 12, 6),
(12, 'ESQ-012', '2026-10-15', 7, 3, '08:30:00', '14:55:00', 110, 16, 10, 110, 16, 10);

-- 4. Insertar Adelantos de Dinero
INSERT INTO `adelantos` (`personal_id`, `fecha`, `monto`, `observaciones`) VALUES
(5, '2026-09-15', 500.00, 'Adelanto de quincena'),
(4, '2026-09-15', 300.00, 'Adelanto de quincena'),
(1, '2026-09-15', 300.00, 'Adelanto de quincena'),
(6, '2026-09-15', 400.00, 'Adelanto de quincena');

-- 5. Insertar Matriz Exacta de Asistencias (Setiembre y Octubre 2026 - Conforme a las capturas del sistema)
-- ==============================================================================
-- SETIEMBRE 2026 (1 al 30 de setiembre de 2026)
-- ==============================================================================

-- 01/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-01', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 02/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-02', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 03/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-03', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 04/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-04', 'NO', 'F', NULL, NULL, 0),
(2, '2026-09-04', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-04', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-04', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-04', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-04', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-04', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-04', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 05/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-05', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 06/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-06', 'NO', '-', NULL, NULL, 0),
(2, '2026-09-06', 'NO', '-', NULL, NULL, 0),
(3, '2026-09-06', 'NO', '-', NULL, NULL, 0),
(4, '2026-09-06', 'NO', '-', NULL, NULL, 0),
(5, '2026-09-06', 'NO', '-', NULL, NULL, 0),
(6, '2026-09-06', 'NO', '-', NULL, NULL, 0),
(7, '2026-09-06', 'NO', '-', NULL, NULL, 0),
(8, '2026-09-06', 'NO', '-', NULL, NULL, 0);

-- 07/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-07', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 08/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-08', 'SI', 'T', '08:15:00', '16:30:00', 45),
(2, '2026-09-08', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-08', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-08', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-08', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-08', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-08', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-08', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 09/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-09', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 10/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-10', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 11/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-11', 'SI', 'T', '08:10:00', '16:30:00', 40),
(2, '2026-09-11', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-11', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-11', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-11', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-11', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-11', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-11', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 12/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-12', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 13/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-13', 'NO', '-', NULL, NULL, 0),
(2, '2026-09-13', 'NO', '-', NULL, NULL, 0),
(3, '2026-09-13', 'NO', '-', NULL, NULL, 0),
(4, '2026-09-13', 'NO', '-', NULL, NULL, 0),
(5, '2026-09-13', 'NO', '-', NULL, NULL, 0),
(6, '2026-09-13', 'NO', '-', NULL, NULL, 0),
(7, '2026-09-13', 'NO', '-', NULL, NULL, 0),
(8, '2026-09-13', 'NO', '-', NULL, NULL, 0);

-- 14/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-14', 'NO', 'F', NULL, NULL, 0),
(2, '2026-09-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-14', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 15/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-15', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 16/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-16', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 17/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-17', 'SI', 'T', '08:20:00', '16:30:00', 50),
(2, '2026-09-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-17', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 18/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-18', 'SI', 'T', '08:15:00', '16:30:00', 45),
(2, '2026-09-18', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-18', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-18', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-18', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-18', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-18', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-18', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 19/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-19', 'SI', 'T', '08:25:00', '16:30:00', 55),
(2, '2026-09-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-19', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 20/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-20', 'NO', '-', NULL, NULL, 0),
(2, '2026-09-20', 'NO', '-', NULL, NULL, 0),
(3, '2026-09-20', 'NO', '-', NULL, NULL, 0),
(4, '2026-09-20', 'NO', '-', NULL, NULL, 0),
(5, '2026-09-20', 'NO', '-', NULL, NULL, 0),
(6, '2026-09-20', 'NO', '-', NULL, NULL, 0),
(7, '2026-09-20', 'NO', '-', NULL, NULL, 0),
(8, '2026-09-20', 'NO', '-', NULL, NULL, 0);

-- 21/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-21', 'SI', 'T', '08:10:00', '16:30:00', 40),
(2, '2026-09-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-21', 'NO', 'F', NULL, NULL, 0),
(5, '2026-09-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-21', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 22/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-22', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 23/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-23', 'SI', 'T', '08:15:00', '16:30:00', 45),
(2, '2026-09-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-23', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 24/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-24', 'SI', 'T', '08:20:00', '16:30:00', 50),
(2, '2026-09-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-24', 'SI', 'T', '08:10:00', '16:30:00', 40),
(5, '2026-09-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-24', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 25/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-25', 'SI', 'T', '08:05:00', '16:30:00', 35),
(2, '2026-09-25', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-25', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-25', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-25', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-25', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-25', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-25', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 26/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-26', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 27/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-27', 'NO', '-', NULL, NULL, 0),
(2, '2026-09-27', 'NO', '-', NULL, NULL, 0),
(3, '2026-09-27', 'NO', '-', NULL, NULL, 0),
(4, '2026-09-27', 'NO', '-', NULL, NULL, 0),
(5, '2026-09-27', 'NO', '-', NULL, NULL, 0),
(6, '2026-09-27', 'NO', '-', NULL, NULL, 0),
(7, '2026-09-27', 'NO', '-', NULL, NULL, 0),
(8, '2026-09-27', 'NO', '-', NULL, NULL, 0);

-- 28/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-28', 'NO', 'F', NULL, NULL, 0),
(5, '2026-09-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-28', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 29/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-29', 'SI', 'T', '08:15:00', '16:30:00', 45),
(5, '2026-09-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-29', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 30/09/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-09-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-09-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-09-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-09-30', 'SI', 'T', '08:20:00', '16:30:00', 50),
(5, '2026-09-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-09-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-09-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-09-30', 'SI', 'P', '07:25:00', '16:30:00', 0);


-- 01/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-01', 'NO', 'F', NULL, NULL, 0),
(2, '2026-10-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-01', 'NO', 'F', NULL, NULL, 0),
(4, '2026-10-01', 'NO', 'F', NULL, NULL, 0),
(5, '2026-10-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-01', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-01', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 02/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-02', 'SI', 'T', '08:20:00', '16:30:00', 50),
(2, '2026-10-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-02', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-02', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 03/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-03', 'NO', 'F', NULL, NULL, 0),
(2, '2026-10-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-03', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-03', 'SI', 'P', '07:25:00', '16:30:00', 0);

-- 04/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-04', 'NO', '-', NULL, NULL, 0),
(2, '2026-10-04', 'NO', '-', NULL, NULL, 0),
(3, '2026-10-04', 'NO', '-', NULL, NULL, 0),
(4, '2026-10-04', 'NO', '-', NULL, NULL, 0),
(5, '2026-10-04', 'NO', '-', NULL, NULL, 0),
(6, '2026-10-04', 'NO', '-', NULL, NULL, 0),
(7, '2026-10-04', 'NO', '-', NULL, NULL, 0),
(8, '2026-10-04', 'NO', '-', NULL, NULL, 0);

-- 05/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-05', 'NO', 'F', NULL, NULL, 0),
(2, '2026-10-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-05', 'NO', 'F', NULL, NULL, 0),
(5, '2026-10-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-05', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-05', 'NO', 'F', NULL, NULL, 0);

-- 06/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-06', 'NO', 'F', NULL, NULL, 0),
(2, '2026-10-06', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-06', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-06', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-06', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-06', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-06', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-06', 'NO', 'F', NULL, NULL, 0);

-- 07/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-07', 'SI', 'T', '08:10:00', '16:30:00', 40),
(2, '2026-10-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-07', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-07', 'NO', 'F', NULL, NULL, 0);

-- 08/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-08', 'NO', '-', NULL, NULL, 0),
(2, '2026-10-08', 'NO', '-', NULL, NULL, 0),
(3, '2026-10-08', 'NO', '-', NULL, NULL, 0),
(4, '2026-10-08', 'NO', '-', NULL, NULL, 0),
(5, '2026-10-08', 'NO', '-', NULL, NULL, 0),
(6, '2026-10-08', 'NO', '-', NULL, NULL, 0),
(7, '2026-10-08', 'NO', '-', NULL, NULL, 0),
(8, '2026-10-08', 'NO', '-', NULL, NULL, 0);

-- 09/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-09', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-09', 'NO', 'F', NULL, NULL, 0);

-- 10/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-10', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-10', 'NO', 'F', NULL, NULL, 0);

-- 11/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-11', 'NO', '-', NULL, NULL, 0),
(2, '2026-10-11', 'NO', '-', NULL, NULL, 0),
(3, '2026-10-11', 'NO', '-', NULL, NULL, 0),
(4, '2026-10-11', 'NO', '-', NULL, NULL, 0),
(5, '2026-10-11', 'NO', '-', NULL, NULL, 0),
(6, '2026-10-11', 'NO', '-', NULL, NULL, 0),
(7, '2026-10-11', 'NO', '-', NULL, NULL, 0),
(8, '2026-10-11', 'NO', '-', NULL, NULL, 0);

-- 12/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-12', 'NO', 'F', NULL, NULL, 0),
(2, '2026-10-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-12', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-12', 'NO', 'F', NULL, NULL, 0);

-- 13/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-13', 'SI', 'T', '08:10:00', '16:30:00', 40),
(2, '2026-10-13', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-13', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-13', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-13', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-13', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-13', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-13', 'NO', 'F', NULL, NULL, 0);

-- 14/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-14', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-14', 'NO', 'F', NULL, NULL, 0);

-- 15/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-15', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-15', 'NO', 'F', NULL, NULL, 0);

-- 16/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-16', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-16', 'NO', 'F', NULL, NULL, 0);

-- 17/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-17', 'NO', 'F', NULL, NULL, 0),
(3, '2026-10-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-17', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-17', 'NO', 'F', NULL, NULL, 0);

-- 18/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-18', 'NO', '-', NULL, NULL, 0),
(2, '2026-10-18', 'NO', '-', NULL, NULL, 0),
(3, '2026-10-18', 'NO', '-', NULL, NULL, 0),
(4, '2026-10-18', 'NO', '-', NULL, NULL, 0),
(5, '2026-10-18', 'NO', '-', NULL, NULL, 0),
(6, '2026-10-18', 'NO', '-', NULL, NULL, 0),
(7, '2026-10-18', 'NO', '-', NULL, NULL, 0),
(8, '2026-10-18', 'NO', '-', NULL, NULL, 0);

-- 19/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-19', 'NO', 'F', NULL, NULL, 0),
(2, '2026-10-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-19', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-19', 'NO', 'F', NULL, NULL, 0);

-- 20/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-20', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-20', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-20', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-20', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-20', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-20', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-20', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-20', 'NO', 'F', NULL, NULL, 0);

-- 21/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-21', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-21', 'NO', 'F', NULL, NULL, 0);

-- 22/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-22', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-22', 'NO', 'F', NULL, NULL, 0);

-- 23/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-23', 'NO', 'F', NULL, NULL, 0),
(5, '2026-10-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-23', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-23', 'NO', 'F', NULL, NULL, 0);

-- 24/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-24', 'NO', 'F', NULL, NULL, 0),
(3, '2026-10-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-24', 'SI', 'T', '08:00:00', '16:30:00', 30),
(5, '2026-10-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-24', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-24', 'NO', 'F', NULL, NULL, 0);

-- 25/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-25', 'NO', '-', NULL, NULL, 0),
(2, '2026-10-25', 'NO', '-', NULL, NULL, 0),
(3, '2026-10-25', 'NO', '-', NULL, NULL, 0),
(4, '2026-10-25', 'NO', '-', NULL, NULL, 0),
(5, '2026-10-25', 'NO', '-', NULL, NULL, 0),
(6, '2026-10-25', 'NO', '-', NULL, NULL, 0),
(7, '2026-10-25', 'NO', '-', NULL, NULL, 0),
(8, '2026-10-25', 'NO', '-', NULL, NULL, 0);

-- 26/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-26', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-26', 'NO', 'F', NULL, NULL, 0);

-- 27/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-27', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-27', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-27', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-27', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-27', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-27', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-27', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-27', 'NO', 'F', NULL, NULL, 0);

-- 28/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-28', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-28', 'NO', 'F', NULL, NULL, 0);

-- 29/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-29', 'SI', 'T', '10:45:00', '16:30:00', 195),
(5, '2026-10-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-29', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-29', 'NO', 'F', NULL, NULL, 0);

-- 30/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(2, '2026-10-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(3, '2026-10-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(5, '2026-10-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-30', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-30', 'NO', 'F', NULL, NULL, 0);

-- 31/10/2026
INSERT INTO `asistencias` (`personal_id`, `fecha`, `asistio`, `estado`, `hora_entrada`, `hora_salida`, `minutos_tardanza`) VALUES
(1, '2026-10-31', 'NO', 'F', NULL, NULL, 0),
(2, '2026-10-31', 'NO', 'F', NULL, NULL, 0),
(3, '2026-10-31', 'SI', 'P', '07:25:00', '16:30:00', 0),
(4, '2026-10-31', 'NO', 'F', NULL, NULL, 0),
(5, '2026-10-31', 'SI', 'P', '07:25:00', '16:30:00', 0),
(6, '2026-10-31', 'SI', 'P', '07:25:00', '16:30:00', 0),
(7, '2026-10-31', 'SI', 'P', '07:25:00', '16:30:00', 0),
(8, '2026-10-31', 'NO', 'F', NULL, NULL, 0);

-- ------------------------------------------------------------------------------
-- VISTAS ÚTILES PARA REPORTES Y CONSULTAS RÁPIDAS
-- ------------------------------------------------------------------------------

-- Vista de resumen mensual de tardanzas por empleado
CREATE OR REPLACE VIEW `vista_resumen_tardanzas` AS
SELECT 
    p.id AS personal_id,
    p.nombre_completo,
    DATE_FORMAT(a.fecha, '%Y-%m') AS mes,
    COUNT(a.id) AS total_tardanzas,
    SUM(a.minutos_tardanza) AS total_minutos,
    CONCAT(
        FLOOR(SUM(a.minutos_tardanza) / 60), 'h ', 
        MOD(SUM(a.minutos_tardanza), 60), 'min'
    ) AS equivalente_horas
FROM personal p
JOIN asistencias a ON p.id = a.personal_id
WHERE a.estado = 'T'
GROUP BY p.id, p.nombre_completo, DATE_FORMAT(a.fecha, '%Y-%m');

-- Vista de estadísticas para el dashboard
CREATE OR REPLACE VIEW `vista_estadisticas_hoy` AS
SELECT
    (SELECT COUNT(*) FROM personal WHERE estado = 'ACTIVO') AS personal_registrado,
    (SELECT COUNT(*) FROM asistencias WHERE fecha = CURDATE() AND asistio = 'SI') AS asistieron_hoy,
    (SELECT COUNT(*) FROM esquelas WHERE fecha = CURDATE() AND estado != 'ANULADO') AS esquelas_hoy,
    DATE_FORMAT(CURDATE(), '%d/%m/%Y') AS fecha_hoy;
