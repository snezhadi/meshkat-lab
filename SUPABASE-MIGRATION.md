# Supabase Migration Guide

This guide explains how to migrate your JSON data files to Supabase (PostgreSQL).

## Prerequisites

1. **Supabase Project**: Create a new project at [supabase.com](https://supabase.com)
2. **Node.js Dependencies**: Install the Supabase client
   ```bash
   pnpm add @supabase/supabase-js
   ```

## Setup

### 1. Environment Variables

Copy the environment template:
```bash
cp env.supabase.example .env.local
```

Fill in your Supabase details in `.env.local` (server-side only):
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Note**: The migration script only runs server-side, so we only need the service role key, not the anon key.

### 2. Create Database Schema

Run the schema file in your Supabase SQL editor:
```bash
# Copy the contents of supabase-schema.sql and run in Supabase Dashboard > SQL Editor
```

Or use the Supabase CLI:
```bash
supabase db reset --db-url "your-database-url"
psql "your-database-url" -f supabase-schema.sql
```

## Migration Process

### 1. Run Migration Script

```bash
node scripts/migrate-to-supabase.js
```

### 2. Verify Migration

Check your Supabase dashboard to ensure all data was migrated correctly.

## Schema Overview

### Global Tables (shared across templates):
- `parameter_types` - Available parameter types (boolean, text, number, etc.)
- `input_types` - Available input types (textbox, dropdown, etc.)
- `priority_levels` - Priority levels (0, 1, 2, 3)
- `jurisdictions` - Available jurisdictions (Ontario, Quebec, etc.)

### Template-Specific Tables:
- `templates` - Document templates
- `template_clauses` - Template clauses (introduction has sort_order = -1)
- `template_paragraphs` - Paragraphs within clauses
- `parameters` - Template parameters
- `parameter_groups` - Parameter grouping
- `parameter_subgroups` - Parameter sub-grouping
- `parameter_defaults` - Jurisdiction-specific parameter defaults

## Key Features

### Auto-increment IDs
- All tables use `SERIAL PRIMARY KEY` for efficient relationships
- Parameters have both `id` (auto-increment) and `custom_id` (for placeholders)

### Data Relationships
- Templates → Clauses → Paragraphs (hierarchical)
- Templates → Parameters → Defaults (configuration)
- Global types referenced by templates

### Performance Optimizations
- Indexes on frequently queried columns
- Foreign key constraints for data integrity
- Efficient joins with integer IDs

## Migration Notes

### Key Features Implemented:

1. **Parameter-Template Mapping**: Parameters are automatically assigned to templates based on their ID prefix:
   - `employment_*` parameters → Employment Agreement template
   - `indepcont_*` parameters → Independent Contractor Agreement template
   - Prefixes are removed from `custom_id` field (e.g., `employment_effective_date` → `effective_date`)

2. **Introduction Handling**: Introduction is stored as a clause with `sort_order = -1`. This keeps the schema consistent.

3. **Options Format**: Parameter options are stored as comma-separated text for enum parameters.

4. **JSON Conditions**: Conditions are stored as JSONB for complex conditional logic.

5. **Jurisdiction Defaults**: Skipped for now as requested - only jurisdiction table is populated.

6. **Template Structure**: Handles both single template objects and arrays of templates.

## Post-Migration Tasks

1. **Update API Routes**: Modify your API routes to use Supabase instead of JSON files
2. **Update Frontend**: Change data fetching to use Supabase client
3. **Test Functionality**: Verify all features work with the new database
4. **Backup**: Keep your JSON files as backup until fully migrated

## Rollback Plan

If you need to rollback:
1. Keep your JSON files unchanged
2. Use feature flags to switch between JSON and Supabase
3. The migration script can be run multiple times safely

## Troubleshooting

### Common Issues:

1. **Missing Environment Variables**: Ensure all Supabase credentials are set
2. **Duplicate Data**: The script handles duplicates gracefully with warnings
3. **Foreign Key Errors**: Check that referenced data exists before inserting
4. **Permission Issues**: Use service role key for migration, not anon key

### Debug Mode:

Add logging to see detailed migration progress:
```javascript
// In migrate-to-supabase.js, uncomment console.log statements
```
