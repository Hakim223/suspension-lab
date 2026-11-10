-- Suspension Lab — MySQL 8.0 schema
-- Charset utf8mb4 for full Indonesian/Unicode support.
-- Large 3D assets are NOT stored here; only a model_key that maps to static GLB/procedural models.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS component_education;
DROP TABLE IF EXISTS damage_scenarios;
DROP TABLE IF EXISTS suspension_components;
DROP TABLE IF EXISTS component_includes;
DROP TABLE IF EXISTS components;
DROP TABLE IF EXISTS suspension_types;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Suspension architectures
CREATE TABLE suspension_types (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug                  VARCHAR(64)  NOT NULL,
  name                  VARCHAR(120) NOT NULL,
  name_en               VARCHAR(120) NOT NULL,
  tagline               VARCHAR(255) NOT NULL,
  axle_position         ENUM('depan','belakang') NOT NULL,
  independence          ENUM('independen','semi-independen','dependen') NOT NULL,
  summary               TEXT NOT NULL,
  description           TEXT NOT NULL,
  how_it_works          JSON NOT NULL COMMENT 'Ordered list of explanation steps',
  typical_applications  JSON NOT NULL,
  advantages            JSON NOT NULL,
  disadvantages         JSON NOT NULL,
  steerable             TINYINT(1) NOT NULL DEFAULT 0,
  model_key             VARCHAR(64) NOT NULL COMMENT 'Key into the frontend model registry (GLB or procedural)',
  sort_order            SMALLINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suspension_types_slug (slug),
  KEY idx_suspension_types_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Reusable component records (one row per component type, shared across architectures)
CREATE TABLE components (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug               VARCHAR(64)  NOT NULL,
  name               VARCHAR(160) NOT NULL,
  name_en            VARCHAR(160) NOT NULL,
  category           ENUM('peredam','lengan','sambungan','kemudi','stabilizer','roda','struktur') NOT NULL,
  summary            TEXT NOT NULL,
  function_text      TEXT NOT NULL,
  working_principle  TEXT NOT NULL,
  location           TEXT NOT NULL,
  sort_order         SMALLINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_components_slug (slug),
  KEY idx_components_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Composite components (e.g. strut assembly = shock + spring + strut mount)
CREATE TABLE component_includes (
  parent_component_id INT UNSIGNED NOT NULL,
  child_component_id  INT UNSIGNED NOT NULL,
  sort_order          SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (parent_component_id, child_component_id),
  KEY idx_component_includes_child (child_component_id),
  CONSTRAINT fk_ci_parent FOREIGN KEY (parent_component_id) REFERENCES components(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_child  FOREIGN KEY (child_component_id)  REFERENCES components(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Which components exist in which architecture (and their role there)
CREATE TABLE suspension_components (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  suspension_type_id  INT UNSIGNED NOT NULL,
  component_id        INT UNSIGNED NOT NULL,
  local_name          VARCHAR(160) NULL COMMENT 'Architecture-specific display name',
  role_description    TEXT NOT NULL,
  quantity_note       VARCHAR(80) NULL,
  sort_order          SMALLINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suspension_component (suspension_type_id, component_id),
  KEY idx_sc_component (component_id),
  CONSTRAINT fk_sc_suspension FOREIGN KEY (suspension_type_id) REFERENCES suspension_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_component  FOREIGN KEY (component_id)       REFERENCES components(id)       ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Damage scenarios (many per component)
CREATE TABLE damage_scenarios (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug                 VARCHAR(64)  NOT NULL,
  component_id         INT UNSIGNED NOT NULL,
  title                VARCHAR(200) NOT NULL,
  short_title          VARCHAR(80)  NOT NULL,
  severity             ENUM('sedang','tinggi') NOT NULL,
  normal_condition     TEXT NOT NULL,
  damaged_condition    TEXT NOT NULL,
  failure_description  TEXT NOT NULL,
  symptoms             JSON NOT NULL,
  safety_implications  JSON NOT NULL,
  inspection_steps     JSON NOT NULL,
  sim_kind             VARCHAR(48) NOT NULL COMMENT 'Frontend simulation driver key',
  sim_params           JSON NOT NULL COMMENT 'Illustrative visual parameters, not diagnostic thresholds',
  recommended_mode     ENUM('bump','rough','steer','manual') NOT NULL DEFAULT 'bump',
  sort_order           SMALLINT NOT NULL DEFAULT 0,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_damage_scenarios_slug (slug),
  KEY idx_ds_component (component_id),
  CONSTRAINT fk_ds_component FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Educational content rows per component (normalized lists)
CREATE TABLE component_education (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  component_id  INT UNSIGNED NOT NULL,
  content_type  ENUM('failure_mode','symptom','consequence','inspection_step','term') NOT NULL,
  title         VARCHAR(160) NULL COMMENT 'Used for glossary terms',
  body          TEXT NOT NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ce_component_type (component_id, content_type, sort_order),
  CONSTRAINT fk_ce_component FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
