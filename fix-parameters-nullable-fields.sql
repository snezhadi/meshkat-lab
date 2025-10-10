-- Fix parameters table to allow NULL values for display fields
-- These fields should be nullable since not all parameters need to be in groups/subgroups

-- Make display_group_id nullable
ALTER TABLE parameters ALTER COLUMN display_group_id DROP NOT NULL;

-- Make display_subgroup_id nullable  
ALTER TABLE parameters ALTER COLUMN display_subgroup_id DROP NOT NULL;

-- Make display_label nullable (since it can default to name if not provided)
ALTER TABLE parameters ALTER COLUMN display_label DROP NOT NULL;

-- Reload schema cache so PostgREST recognizes the changes
NOTIFY pgrst, 'reload schema';