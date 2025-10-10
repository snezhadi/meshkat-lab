-- Supabase Schema for Document Templates System
-- This schema uses auto-increment IDs for all tables

-- =============================================
-- GLOBAL CONFIGURATION TABLES
-- =============================================

-- Parameter Types (Global)
CREATE TABLE parameter_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Input Types (Global)
CREATE TABLE input_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Priority Levels (Global)
CREATE TABLE priority_levels (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Jurisdictions (Global)
CREATE TABLE jurisdictions (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR NOT NULL UNIQUE,
  country VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TEMPLATE-SPECIFIC TABLES
-- =============================================

-- Templates
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  llm_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template Clauses (includes introduction as sort_order = -1)
CREATE TABLE template_clauses (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  content TEXT,
  description TEXT,
  condition JSONB, -- JSON format for conditions
  sort_order INTEGER DEFAULT 0, -- -1 for introduction
  llm_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template Paragraphs
CREATE TABLE template_paragraphs (
  id SERIAL PRIMARY KEY,
  clause_id INTEGER REFERENCES template_clauses(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  content TEXT,
  description TEXT,
  condition JSONB, -- JSON format for conditions
  sort_order INTEGER DEFAULT 0,
  llm_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parameters
CREATE TABLE parameters (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  custom_id VARCHAR NOT NULL, -- Used in placeholders like @employee_name
  name VARCHAR NOT NULL,
  description TEXT,
  type_id INTEGER REFERENCES parameter_types(id),
  condition JSONB, -- JSON format for conditions
  llm_instructions TEXT,
  llm_description TEXT,
  priority_id INTEGER REFERENCES priority_levels(id),
  format VARCHAR,
  display_group_id INTEGER, -- References parameter_groups (nullable)
  display_subgroup_id INTEGER, -- References parameter_subgroups (nullable)
  display_label VARCHAR, -- nullable, can default to name
  display_input_id INTEGER REFERENCES input_types(id),
  options TEXT, -- comma-separated values
  global_default TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(template_id, custom_id)
);

-- Parameter Groups
CREATE TABLE parameter_groups (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parameter Subgroups
CREATE TABLE parameter_subgroups (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES parameter_groups(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parameter Defaults (jurisdiction-specific)
CREATE TABLE parameter_defaults (
  id SERIAL PRIMARY KEY,
  parameter_id INTEGER REFERENCES parameters(id) ON DELETE CASCADE,
  jurisdiction_id INTEGER REFERENCES jurisdictions(id) ON DELETE CASCADE,
  default_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(parameter_id, jurisdiction_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Template clauses
CREATE INDEX idx_template_clauses_template_id ON template_clauses(template_id);
CREATE INDEX idx_template_clauses_sort_order ON template_clauses(template_id, sort_order);

-- Template paragraphs
CREATE INDEX idx_template_paragraphs_clause_id ON template_paragraphs(clause_id);
CREATE INDEX idx_template_paragraphs_sort_order ON template_paragraphs(clause_id, sort_order);

-- Parameters
CREATE INDEX idx_parameters_template_id ON parameters(template_id);
CREATE INDEX idx_parameters_custom_id ON parameters(template_id, custom_id);
CREATE INDEX idx_parameters_type_id ON parameters(type_id);

-- Parameter groups
CREATE INDEX idx_parameter_groups_template_id ON parameter_groups(template_id);

-- Parameter subgroups
CREATE INDEX idx_parameter_subgroups_template_id ON parameter_subgroups(template_id);
CREATE INDEX idx_parameter_subgroups_group_id ON parameter_subgroups(group_id);

-- Parameter defaults
CREATE INDEX idx_parameter_defaults_parameter_id ON parameter_defaults(parameter_id);
CREATE INDEX idx_parameter_defaults_jurisdiction_id ON parameter_defaults(jurisdiction_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- =============================================

-- Enable RLS on all tables (uncomment if needed)
-- ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE template_clauses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE template_paragraphs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parameter_groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parameter_subgroups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parameter_defaults ENABLE ROW LEVEL SECURITY;
