# Data Directory

This directory contains production data files that are **NOT tracked by git**.

## Files (excluded from git)

- `parameters.json` - Parameter definitions and configurations
- `parameter-config.json` - Parameter type and group configurations
- `document-templates.json` - Document template definitions
- `jurisdictions.json` - Jurisdiction-specific data
- `backups/` - Backup files created by the application

## Important Notes

1. **Local Development**: The application will create default data files on first run if they don't exist.

2. **Production (VPS)**: 
   - Data files persist through the Docker volume mount: `./data:/app/data`
   - Pulling new code from git will **NOT** overwrite your production data
   - Make sure data files have correct permissions (owned by 1001:1001)

3. **File Permissions on VPS**:
   ```bash
   # If you have permission issues, run:
   sudo chown -R 1001:1001 ./data
   sudo chmod -R u+rw,g+r,o+r ./data
   sudo find ./data -type d -exec chmod 755 {} \;
   ```

4. **Backups**: The application automatically creates backups in `backups/` directory when saving parameters or creating checkpoints.

## Initial Setup

When deploying to a new environment:

1. The app will automatically create default data files on first run
2. Or, you can copy data files from another environment manually
3. Ensure proper file permissions (see above)

## Troubleshooting

If you see `EACCES: permission denied` errors:
- Check file ownership: `ls -la ./data/`
- Fix permissions using commands above
- Restart containers: `docker-compose restart`

