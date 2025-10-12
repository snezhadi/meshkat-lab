# Database Schema Documentation

## Overview

This document provides a comprehensive guide to the PostgreSQL database schema used for managing document templates and parameters. The database is designed to support dynamic legal document generation with customizable templates, conditional content, and jurisdiction-specific parameters.

## Database Technology

- **Database System**: PostgreSQL (via Supabase)
- **ORM/Client**: Supabase JavaScript Client (`@supabase/supabase-js`)
- **Primary Keys**: Auto-incrementing integers (`SERIAL PRIMARY KEY`)
- **Timestamps**: Automatic `created_at` and `updated_at` tracking

## Architecture Overview

The database follows a **flat, normalized schema** design without JSONB columns (except for `condition` fields). All metadata and configuration data is stored in dedicated columns for better queryability and performance.

### Key Design Principles

1. **No JSONB for structured data**: All structured data uses proper columns and relationships
2. **Auto-increment IDs**: All tables use `SERIAL PRIMARY KEY` for database-generated IDs
3. **Custom IDs for references**: Parameters have both database IDs and custom IDs for template references
4. **Template-scoped data**: Parameters, groups, and subgroups are template-specific
5. **Global configuration**: Parameter types, input types, priority levels, and jurisdictions are shared across templates
6. **Soft hierarchy**: Introduction sections are stored as clauses with `sort_order = -1`

---

## Core Tables

### 1. Templates Table

Stores the main document templates (e.g., Employment Agreement, Independent Contractor Agreement).

```sql
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-increment primary key
- `title`: Human-readable template name (e.g., "Employment Agreement")
- `type`: Template type identifier (e.g., "employment", "contractor")
- `created_at`: Timestamp of template creation
- `updated_at`: Timestamp of last update

**Notes:**
- Templates represent the top-level document structure
- Each template can have one introduction, multiple clauses, and multiple parameters
- The `version` field was removed as versioning is not currently implemented

**Example Records:**
```sql
INSERT INTO templates (id, title, type) VALUES
  (12, 'Employment Agreement', 'employment'),
  (13, 'Independent Contractor Agreement', 'contractor');
```

---

### 2. Template Clauses Table

Stores clauses (sections) within each template. The introduction is also stored as a clause with `sort_order = -1`.

```sql
CREATE TABLE template_clauses (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL,
  condition JSONB,
  llm_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-increment primary key
- `template_id`: Foreign key to `templates` table
- `title`: Clause title (e.g., "PARTIES", "COMMENCEMENT OF EMPLOYMENT")
- `content`: Rich text content (HTML/Markdown) with parameter placeholders
- `description`: Short user-facing description
- `sort_order`: Order of appearance in document (-1 for introduction, 0+ for clauses)
- `condition`: JSON condition for conditional inclusion (see Conditions section)
- `llm_description`: Detailed description for LLM understanding
- `created_at`: Timestamp of clause creation
- `updated_at`: Timestamp of last update

**Special Values:**
- `sort_order = -1`: Introduction section
- `sort_order >= 0`: Regular clauses (0, 1, 2, 3, ...)

**Relationships:**
- One-to-many with `templates` (one template has many clauses)
- One-to-many with `template_paragraphs` (one clause has many paragraphs)

**Example Record:**
```sql
INSERT INTO template_clauses (template_id, title, content, sort_order, condition) VALUES
  (12, 'PARTIES', '<p>This agreement is between...</p>', 1, NULL),
  (12, 'COMMENCEMENT', '<p>Employment begins on {{start_date}}</p>', 2, NULL),
  (12, 'Introduction', '<p>This is the introduction...</p>', -1, NULL);
```

---

### 3. Template Paragraphs Table

Stores paragraphs within clauses for more granular content organization.

```sql
CREATE TABLE template_paragraphs (
  id SERIAL PRIMARY KEY,
  clause_id INTEGER NOT NULL REFERENCES template_clauses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL,
  condition JSONB,
  llm_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-increment primary key
- `clause_id`: Foreign key to `template_clauses` table
- `title`: Paragraph title
- `content`: Rich text content with parameter placeholders
- `description`: Short user-facing description
- `sort_order`: Order within the parent clause (0, 1, 2, 3, ...)
- `condition`: JSON condition for conditional inclusion
- `llm_description`: Detailed description for LLM understanding
- `created_at`: Timestamp of paragraph creation
- `updated_at`: Timestamp of last update

**Relationships:**
- Many-to-one with `template_clauses` (many paragraphs belong to one clause)

**Example Record:**
```sql
INSERT INTO template_paragraphs (clause_id, title, content, sort_order) VALUES
  (1471, 'Employer Details', '<p>Employer: {{employer_name}}</p>', 0),
  (1471, 'Employee Details', '<p>Employee: {{employee_name}}</p>', 1);
```

---

### 4. Parameters Table

Stores all parameters (variables) used in templates. Each parameter is template-specific and has both a database ID and a custom ID.

```sql
CREATE TABLE parameters (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  custom_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type_id INTEGER NOT NULL REFERENCES parameter_types(id),
  display_input_id INTEGER NOT NULL REFERENCES input_types(id),
  priority_id INTEGER NOT NULL REFERENCES priority_levels(id),
  display_group_id INTEGER REFERENCES parameter_groups(id),
  display_subgroup_id INTEGER REFERENCES parameter_subgroups(id),
  display_label VARCHAR(255),
  options TEXT,
  global_default TEXT,
  condition JSONB,
  format VARCHAR(100),
  llm_instructions TEXT,
  llm_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, custom_id)
);
```

**Columns:**
- `id`: Auto-increment primary key (used for database operations)
- `template_id`: Foreign key to `templates` table
- `custom_id`: Custom identifier used in template content (e.g., "start_date", "salary")
- `name`: Human-readable parameter name
- `description`: User-facing description
- `type_id`: Foreign key to `parameter_types` (data type)
- `display_input_id`: Foreign key to `input_types` (UI input type)
- `priority_id`: Foreign key to `priority_levels` (importance level)
- `display_group_id`: Foreign key to `parameter_groups` (nullable, for UI grouping)
- `display_subgroup_id`: Foreign key to `parameter_subgroups` (nullable, for UI sub-grouping)
- `display_label`: Custom label for UI display (defaults to `name`)
- `options`: Comma-separated values for enum/select types (e.g., "Option1,Option2,Option3")
- `global_default`: Default value for the parameter
- `condition`: JSON condition for conditional display
- `format`: Format hint (e.g., "YYYY-MM-DD" for dates)
- `llm_instructions`: Instructions for LLM when filling this parameter
- `llm_description`: Detailed description for LLM understanding
- `created_at`: Timestamp of parameter creation
- `updated_at`: Timestamp of last update

**Key Constraints:**
- `UNIQUE(template_id, custom_id)`: Each custom_id must be unique within a template
- `custom_id` is used for parameter references in template content (e.g., `{{start_date}}`)
- `id` is used for API operations (edit, delete, etc.)

**Relationships:**
- Many-to-one with `templates`
- Many-to-one with `parameter_types`
- Many-to-one with `input_types`
- Many-to-one with `priority_levels`
- Many-to-one with `parameter_groups` (nullable)
- Many-to-one with `parameter_subgroups` (nullable)

**Example Record:**
```sql
INSERT INTO parameters (template_id, custom_id, name, type_id, display_input_id, priority_id, options) VALUES
  (12, 'start_date', 'Employment Start Date', 3, 3, 1, NULL),
  (12, 'employment_type', 'Type of Employment', 5, 5, 1, 'Full-time,Part-time,Contract');
```

**Parameter References in Content:**
Parameters are referenced in clause/paragraph content using double curly braces:
```
{{custom_id}}
```

Example:
```html
<p>Your employment will commence on {{start_date}} as a {{employment_type}} employee.</p>
```

---

### 5. Parameter Groups Table

Organizes parameters into logical groups within a template (e.g., "Employee Information", "Compensation Details").

```sql
CREATE TABLE parameter_groups (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, name)
);
```

**Columns:**
- `id`: Auto-increment primary key
- `template_id`: Foreign key to `templates` table
- `name`: Group name (e.g., "Employee Information")
- `sort_order`: Display order in UI
- `created_at`: Timestamp of group creation
- `updated_at`: Timestamp of last update

**Relationships:**
- Many-to-one with `templates`
- One-to-many with `parameters`
- One-to-many with `parameter_subgroups`

**Example Records:**
```sql
INSERT INTO parameter_groups (template_id, name, sort_order) VALUES
  (12, 'General Parameters', 0),
  (12, 'Employee Information', 1),
  (12, 'Compensation Details', 2);
```

---

### 6. Parameter Subgroups Table

Organizes parameters into sub-categories within groups.

```sql
CREATE TABLE parameter_subgroups (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES parameter_groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, name)
);
```

**Columns:**
- `id`: Auto-increment primary key
- `group_id`: Foreign key to `parameter_groups` table
- `name`: Subgroup name (e.g., "Basic Info", "Contact Details")
- `sort_order`: Display order within the group
- `created_at`: Timestamp of subgroup creation
- `updated_at`: Timestamp of last update

**Relationships:**
- Many-to-one with `parameter_groups`
- One-to-many with `parameters`

**Example Records:**
```sql
INSERT INTO parameter_subgroups (group_id, name, sort_order) VALUES
  (1, 'General', 0),
  (2, 'Basic Info', 0),
  (2, 'Contact Details', 1);
```

---

### 7. Parameter Defaults Table

Stores jurisdiction-specific default values for parameters.

```sql
CREATE TABLE parameter_defaults (
  id SERIAL PRIMARY KEY,
  parameter_id INTEGER NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
  jurisdiction_id INTEGER NOT NULL REFERENCES jurisdictions(id),
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parameter_id, jurisdiction_id)
);
```

**Columns:**
- `id`: Auto-increment primary key
- `parameter_id`: Foreign key to `parameters` table
- `jurisdiction_id`: Foreign key to `jurisdictions` table
- `value`: Default value for this parameter in this jurisdiction
- `created_at`: Timestamp of default creation
- `updated_at`: Timestamp of last update

**Relationships:**
- Many-to-one with `parameters`
- Many-to-one with `jurisdictions`

**Example Records:**
```sql
INSERT INTO parameter_defaults (parameter_id, jurisdiction_id, value) VALUES
  (1, 1, '2 weeks'),  -- Notice period in California
  (1, 2, '4 weeks');  -- Notice period in UK
```

---

## Global Configuration Tables

These tables store configuration data that is shared across all templates.

### 8. Parameter Types Table

Defines the data types for parameters.

```sql
CREATE TABLE parameter_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-increment primary key
- `name`: Type name (e.g., "text", "number", "date", "boolean", "enum")
- `description`: Description of the type
- `created_at`: Timestamp of type creation
- `updated_at`: Timestamp of last update

**Standard Types:**
- `text`: Plain text string
- `number`: Numeric value
- `date`: Date value
- `time`: Time value
- `percent`: Percentage value
- `boolean`: True/false value
- `enum`: Selection from predefined options
- `currency`: Monetary value

**Example Records:**
```sql
INSERT INTO parameter_types (name, description) VALUES
  ('text', 'Plain text'),
  ('number', 'Numeric value'),
  ('date', 'Date value'),
  ('time', 'Time value'),
  ('percent', 'Percentage value'),
  ('boolean', 'Yes/No value'),
  ('enum', 'Selection from options'),
  ('currency', 'Monetary value');
```

---

### 9. Input Types Table

Defines the UI input controls for parameters.

```sql
CREATE TABLE input_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-increment primary key
- `name`: Input type name (e.g., "text", "textarea", "select", "checkbox")
- `description`: Description of the input type
- `created_at`: Timestamp of input type creation
- `updated_at`: Timestamp of last update

**Standard Input Types:**
- `text`: Single-line text input
- `textarea`: Multi-line text input
- `select`: Dropdown selection
- `checkbox`: Checkbox input
- `radio`: Radio button group
- `date`: Date picker
- `time`: Time picker
- `number`: Number input
- `currency`: Currency input

**Example Records:**
```sql
INSERT INTO input_types (name, description) VALUES
  ('text', 'Single-line text input'),
  ('textarea', 'Multi-line text input'),
  ('select', 'Dropdown selection'),
  ('checkbox', 'Checkbox input'),
  ('date', 'Date picker'),
  ('time', 'Time picker'),
  ('number', 'Number input'),
  ('currency', 'Currency input');
```

---

### 10. Priority Levels Table

Defines priority levels for parameters (affects UI prominence and validation).

```sql
CREATE TABLE priority_levels (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-increment primary key
- `level`: Priority level (1 = highest, 5 = lowest)
- `description`: Description of the priority level
- `created_at`: Timestamp of priority level creation
- `updated_at`: Timestamp of last update

**Standard Priority Levels:**
- `1`: Critical (must be filled, prominent in UI)
- `2`: High (important, should be filled)
- `3`: Medium (standard importance)
- `4`: Low (optional, less prominent)
- `5`: Minimal (rarely used, hidden by default)

**Example Records:**
```sql
INSERT INTO priority_levels (level, description) VALUES
  (1, 'Critical - must be filled'),
  (2, 'High - important'),
  (3, 'Medium - standard'),
  (4, 'Low - optional'),
  (5, 'Minimal - rarely used');
```

---

### 11. Jurisdictions Table

Defines legal jurisdictions for jurisdiction-specific defaults and content.

```sql
CREATE TABLE jurisdictions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-increment primary key
- `name`: Jurisdiction name (e.g., "California", "United Kingdom")
- `code`: Jurisdiction code (e.g., "CA", "UK")
- `country`: Country name
- `created_at`: Timestamp of jurisdiction creation
- `updated_at`: Timestamp of last update

**Example Records:**
```sql
INSERT INTO jurisdictions (name, code, country) VALUES
  ('California', 'CA', 'United States'),
  ('New York', 'NY', 'United States'),
  ('United Kingdom', 'UK', 'United Kingdom'),
  ('Ontario', 'ON', 'Canada');
```

---

## Relationships and Foreign Keys

### Template Hierarchy
```
templates (1) ──< (many) template_clauses
                          │
                          └──< (many) template_paragraphs

templates (1) ──< (many) parameters
templates (1) ──< (many) parameter_groups
                          │
                          └──< (many) parameter_subgroups
```

### Parameter Configuration
```
parameters (many) >── (1) parameter_types
parameters (many) >── (1) input_types
parameters (many) >── (1) priority_levels
parameters (many) >── (0..1) parameter_groups
parameters (many) >── (0..1) parameter_subgroups
parameters (1) ──< (many) parameter_defaults
```

### Global References
```
parameter_defaults (many) >── (1) jurisdictions
```

---

## Conditions System

Conditions are stored as JSON in the `condition` column of `template_clauses`, `template_paragraphs`, and `parameters` tables.

### Condition Structure

```json
{
  "type": "boolean",
  "parameter": "custom_id_of_parameter"
}
```

**For Boolean Parameters:**
- Content is included if the parameter value is `true`

**For Enum Parameters:**
```json
{
  "type": "enum",
  "parameter": "custom_id_of_parameter",
  "value": "Expected Value"
}
```
- Content is included if the parameter value matches the specified value

### Examples

**Simple Boolean Condition:**
```json
{
  "type": "boolean",
  "parameter": "probation_enabled"
}
```
This clause/paragraph is included if `probation_enabled` is `true`.

**Enum Condition:**
```json
{
  "type": "enum",
  "parameter": "employment_type",
  "value": "Full-time"
}
```
This clause/paragraph is included if `employment_type` equals "Full-time".

---

## Indexing Strategy

Recommended indexes for optimal performance:

```sql
-- Template clauses
CREATE INDEX idx_template_clauses_template_id ON template_clauses(template_id);
CREATE INDEX idx_template_clauses_sort_order ON template_clauses(template_id, sort_order);

-- Template paragraphs
CREATE INDEX idx_template_paragraphs_clause_id ON template_paragraphs(clause_id);
CREATE INDEX idx_template_paragraphs_sort_order ON template_paragraphs(clause_id, sort_order);

-- Parameters
CREATE INDEX idx_parameters_template_id ON parameters(template_id);
CREATE INDEX idx_parameters_custom_id ON parameters(template_id, custom_id);
CREATE INDEX idx_parameters_group_id ON parameters(display_group_id);
CREATE INDEX idx_parameters_subgroup_id ON parameters(display_subgroup_id);

-- Parameter groups
CREATE INDEX idx_parameter_groups_template_id ON parameter_groups(template_id);

-- Parameter subgroups
CREATE INDEX idx_parameter_subgroups_group_id ON parameter_subgroups(group_id);

-- Parameter defaults
CREATE INDEX idx_parameter_defaults_parameter_id ON parameter_defaults(parameter_id);
CREATE INDEX idx_parameter_defaults_jurisdiction_id ON parameter_defaults(jurisdiction_id);
```

---

## Data Access Patterns

### Fetching a Complete Template

```sql
-- 1. Get template
SELECT * FROM templates WHERE id = 12;

-- 2. Get all clauses (including introduction)
SELECT * FROM template_clauses 
WHERE template_id = 12 
ORDER BY sort_order;

-- 3. Get all paragraphs for the template's clauses
SELECT p.* 
FROM template_paragraphs p
JOIN template_clauses c ON p.clause_id = c.id
WHERE c.template_id = 12
ORDER BY p.clause_id, p.sort_order;

-- 4. Get all parameters
SELECT p.*, 
       pt.name as type_name,
       it.name as input_type_name,
       pl.level as priority_level,
       pg.name as group_name,
       ps.name as subgroup_name
FROM parameters p
LEFT JOIN parameter_types pt ON p.type_id = pt.id
LEFT JOIN input_types it ON p.display_input_id = it.id
LEFT JOIN priority_levels pl ON p.priority_id = pl.id
LEFT JOIN parameter_groups pg ON p.display_group_id = pg.id
LEFT JOIN parameter_subgroups ps ON p.display_subgroup_id = ps.id
WHERE p.template_id = 12
ORDER BY pg.sort_order, ps.sort_order, p.name;
```

### Fetching Parameters with Configuration

```sql
-- Get all parameters for a template with their configuration structure
SELECT 
  p.id,
  p.custom_id,
  p.name,
  p.description,
  pt.name as type,
  it.name as input_type,
  pl.level as priority,
  pg.name as group_name,
  ps.name as subgroup_name,
  p.options,
  p.global_default
FROM parameters p
LEFT JOIN parameter_types pt ON p.type_id = pt.id
LEFT JOIN input_types it ON p.display_input_id = it.id
LEFT JOIN priority_levels pl ON p.priority_id = pl.id
LEFT JOIN parameter_groups pg ON p.display_group_id = pg.id
LEFT JOIN parameter_subgroups ps ON p.display_subgroup_id = ps.id
WHERE p.template_id = 12;
```

---

## API Integration Notes

### Supabase Client Setup

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

### Common Operations

**Fetch Template with Clauses:**
```javascript
const { data: template } = await supabase
  .from('templates')
  .select('*, template_clauses(*)')
  .eq('id', templateId)
  .single();
```

**Fetch Parameters with Related Data:**
```javascript
const { data: parameters } = await supabase
  .from('parameters')
  .select(`
    *,
    parameter_types!fk_parameter_type(name),
    input_types(name),
    priority_levels(level),
    parameter_groups(name),
    parameter_subgroups(name)
  `)
  .eq('template_id', templateId);
```

**Note on Foreign Key Relationships:**
If you have multiple foreign keys pointing to the same table, you need to specify the relationship name:
```javascript
// Use the explicit foreign key name
parameter_types!fk_parameter_type(name)
```

---

## Migration from JSON Files

The system was migrated from JSON file storage to Supabase. Key migration considerations:

### Parameter ID Mapping
- **Old System**: Used prefixed IDs (e.g., `employment_start_date`, `indepcont_start_date`)
- **New System**: Uses `custom_id` without prefix (e.g., `start_date`) + `template_id` for uniqueness

### Parameter References in Content
Content references were updated from:
```
{{employment_start_date}}
```
To:
```
{{start_date}}
```

### Introduction Section
- Stored as a clause with `sort_order = -1`
- This allows it to have the same fields as regular clauses (description, condition, etc.)

---

## Best Practices

### When Creating New Parameters
1. Always use descriptive `custom_id` values (snake_case)
2. Set appropriate `type_id`, `display_input_id`, and `priority_id`
3. For enum types, provide comma-separated `options`
4. Group and subgroup IDs can be `NULL` if not needed

### When Creating Templates
1. Create the template first
2. Create the introduction as a clause with `sort_order = -1`
3. Create other clauses with sequential `sort_order` (0, 1, 2, ...)
4. Create paragraphs with sequential `sort_order` within each clause
5. Create parameters with unique `custom_id` within the template

### When Updating Sort Orders
1. Always update ALL items in the scope (all clauses, or all paragraphs in a clause)
2. Use sequential numbering (0, 1, 2, 3, ...)
3. Never skip numbers in the sequence

### When Handling Conditions
1. Store conditions as proper JSON objects
2. Always validate condition structure before saving
3. Ensure referenced parameters exist in the same template
4. Use `custom_id` (not database `id`) in condition references

---

## Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Security Notes:**
- Use `SUPABASE_SERVICE_ROLE_KEY` for server-side API calls only
- Never expose the service role key to the client
- Use Row Level Security (RLS) policies for client access

---

## Sample Data Structure

### Complete Template Example

```json
{
  "template": {
    "id": 12,
    "title": "Employment Agreement",
    "type": "employment"
  },
  "introduction": {
    "id": 1469,
    "title": "Introduction",
    "content": "This Employment Agreement is entered into...",
    "sort_order": -1
  },
  "clauses": [
    {
      "id": 1471,
      "title": "PARTIES",
      "content": "<p>Employer: {{employer_name}}</p>",
      "sort_order": 1,
      "paragraphs": [
        {
          "id": 6899,
          "title": "Employer Details",
          "content": "...",
          "sort_order": 0
        }
      ]
    },
    {
      "id": 1472,
      "title": "COMMENCEMENT OF EMPLOYMENT",
      "content": "",
      "sort_order": 2,
      "condition": {
        "type": "boolean",
        "parameter": "include_commencement"
      }
    }
  ],
  "parameters": [
    {
      "id": 947,
      "custom_id": "employer_name",
      "name": "Employer Name",
      "type": "text",
      "input_type": "text",
      "priority": 1,
      "group": "General Parameters",
      "subgroup": "Basic Info"
    },
    {
      "id": 948,
      "custom_id": "start_date",
      "name": "Employment Start Date",
      "type": "date",
      "input_type": "date",
      "priority": 1,
      "format": "YYYY-MM-DD"
    }
  ]
}
```

---

## Future Enhancements

Potential areas for expansion:

1. **Versioning**: Track template versions and changes over time
2. **Collaboration**: Multi-user editing with conflict resolution
3. **Audit Logs**: Track all changes to templates and parameters
4. **Template Inheritance**: Allow templates to extend/inherit from base templates
5. **Advanced Conditions**: Support complex boolean logic (AND, OR, NOT)
6. **Localization**: Support multiple languages for template content
7. **Approval Workflows**: Require approval before publishing template changes

---

## Troubleshooting

### Common Issues

**Issue**: "Could not embed because more than one relationship was found"
**Solution**: Use explicit foreign key names in Supabase queries:
```javascript
parameter_types!fk_parameter_type(name)
```

**Issue**: Parameters not appearing in content editor
**Solution**: Ensure parameters are fetched for the correct `template_id`

**Issue**: Sort order inconsistencies
**Solution**: Run the `fix-sort-orders.js` script to renumber all items sequentially

**Issue**: Missing parameter groups/subgroups
**Solution**: Groups and subgroups are nullable - parameters can exist without them

---

## Contact and Support

For questions or issues with this database schema, please refer to:
- Supabase Documentation: https://supabase.com/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/

---

**Last Updated**: January 2025
**Schema Version**: 1.0
**Database Type**: PostgreSQL (Supabase)

