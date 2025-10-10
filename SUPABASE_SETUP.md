# Supabase Setup Guide

## Step 1: Verify Foreign Keys Exist

Run this in your Supabase SQL Editor to check if foreign keys are set up:

```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('parameters', 'parameter_groups', 'parameter_subgroups')
ORDER BY tc.table_name;
```

## Step 2: Add Missing Foreign Keys (if needed)

If the query above shows no results for `parameters` table, run these:

```sql
-- Add foreign key constraints to parameters table
ALTER TABLE parameters 
  ADD CONSTRAINT parameters_type_id_fkey 
  FOREIGN KEY (type_id) 
  REFERENCES parameter_types(id);

ALTER TABLE parameters 
  ADD CONSTRAINT parameters_priority_id_fkey 
  FOREIGN KEY (priority_id) 
  REFERENCES priority_levels(id);

ALTER TABLE parameters 
  ADD CONSTRAINT parameters_display_input_id_fkey 
  FOREIGN KEY (display_input_id) 
  REFERENCES input_types(id);

ALTER TABLE parameters 
  ADD CONSTRAINT parameters_display_group_id_fkey 
  FOREIGN KEY (display_group_id) 
  REFERENCES parameter_groups(id);

ALTER TABLE parameters 
  ADD CONSTRAINT parameters_display_subgroup_id_fkey 
  FOREIGN KEY (display_subgroup_id) 
  REFERENCES parameter_subgroups(id);
```

## Step 3: Reload Supabase Schema Cache

After adding foreign keys, you need to reload the PostgREST schema cache. 

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Click "Reload schema cache" button

**Option B: Via SQL**
```sql
NOTIFY pgrst, 'reload schema';
```

## Step 4: Test the API

After reloading the schema cache, test the parameters endpoint:

```bash
curl 'http://localhost:3000/api/admin/parameters?templateId=12'
```

## Common Issues

### Issue: "Could not find a relationship" error
**Cause**: Foreign keys not properly registered in PostgREST schema cache

**Solution**: 
1. Verify foreign keys exist (Step 1)
2. Add missing foreign keys (Step 2)
3. **Important**: Reload schema cache (Step 3)

### Issue: Foreign keys exist but still getting errors
**Cause**: Schema cache not refreshed

**Solution**: Reload schema cache using one of the methods in Step 3

## Verification

Once setup is complete, this query should work in the Supabase dashboard:

```sql
SELECT 
  p.*,
  pt.name as type_name,
  pl.level as priority_level,
  it.name as input_name,
  pg.name as group_name,
  ps.name as subgroup_name
FROM parameters p
LEFT JOIN parameter_types pt ON p.type_id = pt.id
LEFT JOIN priority_levels pl ON p.priority_id = pl.id
LEFT JOIN input_types it ON p.display_input_id = it.id
LEFT JOIN parameter_groups pg ON p.display_group_id = pg.id
LEFT JOIN parameter_subgroups ps ON p.display_subgroup_id = ps.id
WHERE p.template_id = 12
LIMIT 5;
```

If this query works in Supabase SQL Editor, then the PostgREST API should also work.

