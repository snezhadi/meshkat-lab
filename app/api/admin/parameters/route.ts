import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Use local data directory for development
const DATA_DIR = path.join(process.cwd(), 'data');
const PARAMETERS_FILE = path.join(DATA_DIR, 'parameters.json');
const CONFIG_FILE = path.join(DATA_DIR, 'parameter-config.json');

// Ensure directories exist
async function ensureDataDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Initialize with default data if files don't exist
async function initializeDefaultData() {
  await ensureDataDirectories();

  if (
    !(await fs
      .access(PARAMETERS_FILE)
      .then(() => true)
      .catch(() => false))
  ) {
    const defaultParameters = [
      {
        id: 'employee_name',
        name: 'Employee Name',
        type: 'text',
        group: 'Employee Information',
        subgroup: 'Personal Details',
        priority: 1,
        description: 'Full name of the employee',
        condition: null,
        defaults: {
          jurisdictions: [],
        },
      },
    ];

    await fs.writeFile(PARAMETERS_FILE, JSON.stringify(defaultParameters, null, 2));
  }

  if (
    !(await fs
      .access(CONFIG_FILE)
      .then(() => true)
      .catch(() => false))
  ) {
    const defaultConfig = {
      groups: ['Employee Information', 'Company Information', 'Legal Terms'],
      subgroups: {
        'Employee Information': ['Personal Details', 'Contact Information'],
        'Company Information': ['Business Details', 'Address Information'],
        'Legal Terms': ['Employment Terms', 'Termination Clauses'],
      },
      types: ['text', 'number', 'date', 'boolean', 'select', 'textarea'],
      priorities: [1, 2, 3, 4, 5],
      inputs: ['text', 'number', 'date', 'checkbox', 'select', 'textarea'],
    };

    await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
}

// GET /api/admin/parameters - Load parameters and config
export async function GET() {
  try {
    await initializeDefaultData();

    const [parametersData, configData] = await Promise.all([
      fs.readFile(PARAMETERS_FILE, 'utf8'),
      fs.readFile(CONFIG_FILE, 'utf8'),
    ]);

    const parameters = JSON.parse(parametersData);
    const config = JSON.parse(configData);

    return NextResponse.json({
      parameters,
      config,
    });
  } catch (error) {
    console.error('Error loading parameters:', error);
    return NextResponse.json({ error: 'Failed to load parameters' }, { status: 500 });
  }
}

// POST /api/admin/parameters - Save parameters
export async function POST(request: NextRequest) {
  try {
    await initializeDefaultData();
    const { parameters, config } = await request.json();

    // Validate the data
    if (!Array.isArray(parameters)) {
      return NextResponse.json({ error: 'Parameters must be an array' }, { status: 400 });
    }

    // Create backup before saving
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(DATA_DIR, `parameters-backup-${timestamp}.json`);

    try {
      const currentData = await fs.readFile(PARAMETERS_FILE, 'utf8');
      await fs.writeFile(backupFile, currentData);
      console.log(`Backup created: ${backupFile}`);
    } catch (backupError) {
      console.warn('Failed to create backup:', backupError);
    }

    // Log environment info
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Data directory path: ${DATA_DIR}`);
    console.log(`Parameters file path: ${PARAMETERS_FILE}`);
    console.log(`Writing ${parameters.length} parameters...`);

    // Save parameters
    await fs.writeFile(PARAMETERS_FILE, JSON.stringify(parameters, null, 2));
    console.log(`Parameters file written successfully`);

    // Save config if provided
    if (config) {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log(`Config file written successfully`);
    }

    // Verify the write by reading back
    const verifyData = await fs.readFile(PARAMETERS_FILE, 'utf8');
    const parsedData = JSON.parse(verifyData);
    console.log(`Verified ${parsedData.length} parameters saved`);

    return NextResponse.json({
      success: true,
      message: 'Parameters saved successfully',
      backupFile: backupFile,
      parameterCount: parsedData.length,
    });
  } catch (error) {
    console.error('Error saving parameters:', error);
    return NextResponse.json({ error: 'Failed to save parameters' }, { status: 500 });
  }
}
