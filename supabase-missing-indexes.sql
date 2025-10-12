-- =============================================
-- MISSING DATABASE INDEXES FOR PERFORMANCE
-- =============================================
-- Run this SQL in Supabase SQL Editor to add missing indexes
-- These indexes optimize the most common query patterns
-- =============================================

-- Check if indexes already exist before creating
DO $$ 
BEGIN
  RAISE NOTICE '🔍 Creating missing database indexes for performance...';
END $$;

-- =============================================
-- 1. PARAMETERS TABLE - Additional Indexes
-- =============================================

-- Index for parameter lookups by display_group_id (used in parameter edit page)
CREATE INDEX IF NOT EXISTS idx_parameters_display_group_id 
ON parameters(display_group_id) 
WHERE display_group_id IS NOT NULL;

-- Index for parameter lookups by display_subgroup_id (used in parameter edit page)
CREATE INDEX IF NOT EXISTS idx_parameters_display_subgroup_id 
ON parameters(display_subgroup_id) 
WHERE display_subgroup_id IS NOT NULL;

-- Index for parameter lookups by display_input_id (used in parameter edit page)
CREATE INDEX IF NOT EXISTS idx_parameters_display_input_id 
ON parameters(display_input_id) 
WHERE display_input_id IS NOT NULL;

-- Index for parameter lookups by priority_id (used in filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_parameters_priority_id 
ON parameters(priority_id) 
WHERE priority_id IS NOT NULL;

-- Composite index for parameter lookups with all foreign keys (optimization for views)
-- This helps PostgreSQL optimize queries that join multiple related tables
CREATE INDEX IF NOT EXISTS idx_parameters_all_fk 
ON parameters(type_id, display_input_id, priority_id, display_group_id, display_subgroup_id);

-- Index for condition-based queries (used in filtering)
-- Using GIN index for JSONB columns for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_parameters_condition 
ON parameters USING GIN(condition) 
WHERE condition IS NOT NULL;

-- Index for full-text search on parameter names (if needed for search)
CREATE INDEX IF NOT EXISTS idx_parameters_name_trgm 
ON parameters USING gin(name gin_trgm_ops);

-- Index for sorting parameters by updated_at (recent parameters)
CREATE INDEX IF NOT EXISTS idx_parameters_updated_at 
ON parameters(template_id, updated_at DESC);

-- =============================================
-- 2. TEMPLATE_CLAUSES TABLE - Additional Indexes
-- =============================================

-- Index for condition-based queries on clauses (used in filtering)
CREATE INDEX IF NOT EXISTS idx_template_clauses_condition 
ON template_clauses USING GIN(condition) 
WHERE condition IS NOT NULL;

-- Composite index for template clauses with sort_order and id (optimization)
CREATE INDEX IF NOT EXISTS idx_template_clauses_composite 
ON template_clauses(template_id, sort_order, id);

-- Index for sorting clauses by updated_at (recent changes)
CREATE INDEX IF NOT EXISTS idx_template_clauses_updated_at 
ON template_clauses(template_id, updated_at DESC);

-- =============================================
-- 3. TEMPLATE_PARAGRAPHS TABLE - Additional Indexes
-- =============================================

-- Index for condition-based queries on paragraphs (used in filtering)
CREATE INDEX IF NOT EXISTS idx_template_paragraphs_condition 
ON template_paragraphs USING GIN(condition) 
WHERE condition IS NOT NULL;

-- Composite index for paragraphs with sort_order and id (optimization)
CREATE INDEX IF NOT EXISTS idx_template_paragraphs_composite 
ON template_paragraphs(clause_id, sort_order, id);

-- Index for sorting paragraphs by updated_at (recent changes)
CREATE INDEX IF NOT EXISTS idx_template_paragraphs_updated_at 
ON template_paragraphs(clause_id, updated_at DESC);

-- =============================================
-- 4. TEMPLATES TABLE - Additional Indexes
-- =============================================

-- Index for active templates (most common query)
CREATE INDEX IF NOT EXISTS idx_templates_active 
ON templates(active, id) 
WHERE active = true;

-- Index for sorting templates by updated_at (recent templates)
CREATE INDEX IF NOT EXISTS idx_templates_updated_at 
ON templates(updated_at DESC);

-- Index for full-text search on template titles
CREATE INDEX IF NOT EXISTS idx_templates_title_trgm 
ON templates USING gin(title gin_trgm_ops);

-- =============================================
-- 5. PARAMETER_GROUPS TABLE - Additional Indexes
-- =============================================

-- Composite index for groups by template and sort_order (already exists but verify)
CREATE INDEX IF NOT EXISTS idx_parameter_groups_template_sort 
ON parameter_groups(template_id, sort_order);

-- Index for group name lookups (used in config building)
CREATE INDEX IF NOT EXISTS idx_parameter_groups_name 
ON parameter_groups(template_id, name);

-- =============================================
-- 6. PARAMETER_SUBGROUPS TABLE - Additional Indexes
-- =============================================

-- Composite index for subgroups by group and sort_order
CREATE INDEX IF NOT EXISTS idx_parameter_subgroups_group_sort 
ON parameter_subgroups(group_id, sort_order);

-- Composite index for subgroups by template (used in parameter edit page)
CREATE INDEX IF NOT EXISTS idx_parameter_subgroups_template_sort 
ON parameter_subgroups(template_id, sort_order);

-- Index for subgroup name lookups (used in config building)
CREATE INDEX IF NOT EXISTS idx_parameter_subgroups_name 
ON parameter_subgroups(group_id, name);

-- =============================================
-- 7. PARAMETER_TYPES TABLE - Additional Indexes
-- =============================================

-- Index for type name lookups (used frequently)
CREATE INDEX IF NOT EXISTS idx_parameter_types_name 
ON parameter_types(name);

-- =============================================
-- 8. INPUT_TYPES TABLE - Additional Indexes
-- =============================================

-- Index for input type name lookups (used frequently)
CREATE INDEX IF NOT EXISTS idx_input_types_name 
ON input_types(name);

-- =============================================
-- 9. PRIORITY_LEVELS TABLE - Additional Indexes
-- =============================================

-- Index for priority level lookups (used frequently)
CREATE INDEX IF NOT EXISTS idx_priority_levels_level 
ON priority_levels(level);

-- =============================================
-- 10. JURISDICTIONS TABLE - Additional Indexes
-- =============================================

-- Index for jurisdiction code lookups (used for unique checks)
CREATE INDEX IF NOT EXISTS idx_jurisdictions_code 
ON jurisdictions(code);

-- Index for country-based queries
CREATE INDEX IF NOT EXISTS idx_jurisdictions_country 
ON jurisdictions(country) 
WHERE country IS NOT NULL;

-- =============================================
-- 11. PARAMETER_DEFAULTS TABLE - Additional Indexes
-- =============================================

-- Composite index for defaults lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_parameter_defaults_composite 
ON parameter_defaults(parameter_id, jurisdiction_id);

-- =============================================
-- ENABLE TRIGRAM EXTENSION (if not already enabled)
-- =============================================
-- This is needed for full-text search indexes (gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- ANALYZE TABLES FOR STATISTICS
-- =============================================
-- Update PostgreSQL statistics for better query planning
ANALYZE parameters;
ANALYZE template_clauses;
ANALYZE template_paragraphs;
ANALYZE templates;
ANALYZE parameter_groups;
ANALYZE parameter_subgroups;
ANALYZE parameter_types;
ANALYZE input_types;
ANALYZE priority_levels;
ANALYZE jurisdictions;
ANALYZE parameter_defaults;

-- =============================================
-- NOTIFY POSTGREST TO RELOAD SCHEMA
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- VERIFY INDEX CREATION
-- =============================================
DO $$ 
DECLARE
  index_count INTEGER;
BEGIN
  -- Count total indexes on main tables
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN (
    'parameters', 
    'template_clauses', 
    'template_paragraphs', 
    'templates',
    'parameter_groups',
    'parameter_subgroups',
    'parameter_types',
    'input_types',
    'priority_levels',
    'jurisdictions',
    'parameter_defaults'
  );
  
  RAISE NOTICE '✅ Missing indexes created successfully!';
  RAISE NOTICE '📊 Total indexes on main tables: %', index_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Performance Improvements:';
  RAISE NOTICE '   - Faster parameter queries with foreign key indexes';
  RAISE NOTICE '   - Faster condition-based filtering with GIN indexes';
  RAISE NOTICE '   - Faster full-text search with trigram indexes';
  RAISE NOTICE '   - Better query planning with composite indexes';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Next Steps:';
  RAISE NOTICE '   1. Test query performance improvements';
  RAISE NOTICE '   2. Monitor slow query logs';
  RAISE NOTICE '   3. Run ANALYZE periodically for updated statistics';
END $$;

-- =============================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================
-- Use these queries to monitor index usage and performance

-- Query 1: Check index usage statistics
-- Uncomment to run:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('parameters', 'template_clauses', 'template_paragraphs', 'templates')
ORDER BY idx_scan DESC;
*/

-- Query 2: Check table sizes and index sizes
-- Uncomment to run:
/*
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('parameters', 'template_clauses', 'template_paragraphs', 'templates')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/

-- Query 3: Check slow queries (requires pg_stat_statements extension)
-- Uncomment to run:
/*
SELECT 
    substring(query, 1, 100) AS short_query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%parameters%' OR query LIKE '%template%'
ORDER BY mean_exec_time DESC
LIMIT 20;
*/

