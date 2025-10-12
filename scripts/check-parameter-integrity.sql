-- Check for parameter integrity issues
-- This script identifies parameters that reference non-existent values in config tables

-- 1. Check for invalid parameter types
SELECT 
    'Invalid Parameter Type' as issue_type,
    p.id,
    p.custom_id,
    p.name,
    p.type_id,
    'Parameter type ID ' || p.type_id || ' not found in parameter_types table' as description
FROM parameters p
LEFT JOIN parameter_types pt ON p.type_id = pt.id
WHERE pt.id IS NULL;

-- 2. Check for invalid input types
SELECT 
    'Invalid Input Type' as issue_type,
    p.id,
    p.custom_id,
    p.name,
    p.display_input_id,
    'Input type ID ' || p.display_input_id || ' not found in input_types table' as description
FROM parameters p
LEFT JOIN input_types it ON p.display_input_id = it.id
WHERE it.id IS NULL;

-- 3. Check for invalid priority levels
SELECT 
    'Invalid Priority Level' as issue_type,
    p.id,
    p.custom_id,
    p.name,
    p.priority_id,
    'Priority level ID ' || p.priority_id || ' not found in priority_levels table' as description
FROM parameters p
LEFT JOIN priority_levels pl ON p.priority_id = pl.id
WHERE pl.id IS NULL;

-- 4. Check for invalid display groups (only if not null)
SELECT 
    'Invalid Display Group' as issue_type,
    p.id,
    p.custom_id,
    p.name,
    p.display_group_id,
    'Display group ID ' || p.display_group_id || ' not found in parameter_groups table' as description
FROM parameters p
LEFT JOIN parameter_groups pg ON p.display_group_id = pg.id
WHERE p.display_group_id IS NOT NULL AND pg.id IS NULL;

-- 5. Check for invalid display subgroups (only if not null)
SELECT 
    'Invalid Display Subgroup' as issue_type,
    p.id,
    p.custom_id,
    p.name,
    p.display_subgroup_id,
    'Display subgroup ID ' || p.display_subgroup_id || ' not found in parameter_subgroups table' as description
FROM parameters p
LEFT JOIN parameter_subgroups ps ON p.display_subgroup_id = ps.id
WHERE p.display_subgroup_id IS NOT NULL AND ps.id IS NULL;

-- 6. Check for orphaned parameter groups (groups without parameters)
SELECT 
    'Orphaned Parameter Group' as issue_type,
    pg.id,
    NULL as custom_id,
    pg.name,
    pg.id,
    'Parameter group "' || pg.name || '" has no associated parameters' as description
FROM parameter_groups pg
LEFT JOIN parameters p ON pg.id = p.display_group_id
WHERE p.display_group_id IS NULL;

-- 7. Check for orphaned parameter subgroups (subgroups without parameters)
SELECT 
    'Orphaned Parameter Subgroup' as issue_type,
    ps.id,
    NULL as custom_id,
    ps.name,
    ps.id,
    'Parameter subgroup "' || ps.name || '" has no associated parameters' as description
FROM parameter_subgroups ps
LEFT JOIN parameters p ON ps.id = p.display_subgroup_id
WHERE p.display_subgroup_id IS NULL;

-- 8. Summary count of all issues
SELECT 
    'SUMMARY' as issue_type,
    NULL as id,
    NULL as custom_id,
    NULL as name,
    COUNT(*) as total_issues,
    'Total data integrity issues found' as description
FROM (
    -- Invalid parameter types
    SELECT 1 FROM parameters p
    LEFT JOIN parameter_types pt ON p.type_id = pt.id
    WHERE pt.id IS NULL
    
    UNION ALL
    
    -- Invalid input types
    SELECT 1 FROM parameters p
    LEFT JOIN input_types it ON p.display_input_id = it.id
    WHERE it.id IS NULL
    
    UNION ALL
    
    -- Invalid priority levels
    SELECT 1 FROM parameters p
    LEFT JOIN priority_levels pl ON p.priority_id = pl.id
    WHERE pl.id IS NULL
    
    UNION ALL
    
    -- Invalid display groups
    SELECT 1 FROM parameters p
    LEFT JOIN parameter_groups pg ON p.display_group_id = pg.id
    WHERE p.display_group_id IS NOT NULL AND pg.id IS NULL
    
    UNION ALL
    
    -- Invalid display subgroups
    SELECT 1 FROM parameters p
    LEFT JOIN parameter_subgroups ps ON p.display_subgroup_id = ps.id
    WHERE p.display_subgroup_id IS NOT NULL AND ps.id IS NULL
) as all_issues;
