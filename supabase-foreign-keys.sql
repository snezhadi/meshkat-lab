-- Add Foreign Key Constraints to Supabase Schema
-- Run these commands in your Supabase SQL Editor to enable JOIN queries

-- Note: The base tables and columns should already exist from the main schema file
-- These statements add the foreign key relationships that enable Supabase's automatic JOINs

-- Parameters foreign keys
ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_type 
FOREIGN KEY (type_id) REFERENCES parameter_types(id);

ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_priority 
FOREIGN KEY (priority_id) REFERENCES priority_levels(id);

ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_input_type 
FOREIGN KEY (display_input_id) REFERENCES input_types(id);

ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_group 
FOREIGN KEY (display_group_id) REFERENCES parameter_groups(id);

ALTER TABLE parameters 
ADD CONSTRAINT fk_parameter_subgroup 
FOREIGN KEY (display_subgroup_id) REFERENCES parameter_subgroups(id);

-- Parameter groups foreign key
ALTER TABLE parameter_groups 
ADD CONSTRAINT fk_group_template 
FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;

-- Parameter subgroups foreign keys
ALTER TABLE parameter_subgroups 
ADD CONSTRAINT fk_subgroup_template 
FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;

ALTER TABLE parameter_subgroups 
ADD CONSTRAINT fk_subgroup_group 
FOREIGN KEY (group_id) REFERENCES parameter_groups(id) ON DELETE CASCADE;

-- After running these, you can use JOIN syntax like:
-- SELECT * FROM parameters, parameter_groups!display_group_id(name)

