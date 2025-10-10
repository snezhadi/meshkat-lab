-- Add all remaining foreign keys to the parameters table
-- Run these in your Supabase SQL Editor

-- Foreign key for type_id
ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_type 
FOREIGN KEY (type_id) REFERENCES parameter_types(id);

-- Foreign key for priority_id
ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_priority 
FOREIGN KEY (priority_id) REFERENCES priority_levels(id);

-- Foreign key for display_input_id
ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_input 
FOREIGN KEY (display_input_id) REFERENCES input_types(id);

-- Foreign key for display_subgroup_id
ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_subgroup 
FOREIGN KEY (display_subgroup_id) REFERENCES parameter_subgroups(id);

-- Also add foreign key for parameter_subgroups.group_id if not exists
ALTER TABLE parameter_subgroups 
ADD CONSTRAINT fk_subgroup_group 
FOREIGN KEY (group_id) REFERENCES parameter_groups(id) ON DELETE CASCADE;

-- After adding these, RELOAD THE SCHEMA CACHE in Supabase:
-- Go to Settings → API → Click "Reload schema cache"
-- Or run: NOTIFY pgrst, 'reload schema';

