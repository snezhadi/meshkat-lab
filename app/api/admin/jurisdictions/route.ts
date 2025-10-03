import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Use local data directory for development
const DATA_DIR = path.join(process.cwd(), 'data');
const JURISDICTIONS_FILE = path.join(DATA_DIR, 'jurisdictions.json');

// Ensure directories exist
async function ensureDataDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Initialize with default data if file doesn't exist
async function initializeDefaultData() {
  await ensureDataDirectories();
  
  if (!await fs.access(JURISDICTIONS_FILE).then(() => true).catch(() => false)) {
    const defaultJurisdictions = [
      {
        id: 'CA',
        name: 'Canada',
        description: 'Canadian jurisdiction',
        provinces: [
          { id: 'ON', name: 'Ontario' },
          { id: 'BC', name: 'British Columbia' },
          { id: 'AB', name: 'Alberta' },
          { id: 'QC', name: 'Quebec' }
        ]
      },
      {
        id: 'US',
        name: 'United States',
        description: 'US jurisdiction',
        states: [
          { id: 'CA', name: 'California' },
          { id: 'NY', name: 'New York' },
          { id: 'TX', name: 'Texas' }
        ]
      }
    ];
    
    await fs.writeFile(JURISDICTIONS_FILE, JSON.stringify(defaultJurisdictions, null, 2));
  }
}

// GET /api/admin/jurisdictions - Load jurisdictions
export async function GET() {
  try {
    await initializeDefaultData();
    const jurisdictionsData = await fs.readFile(JURISDICTIONS_FILE, 'utf8');
    const jurisdictions = JSON.parse(jurisdictionsData);
    
    return NextResponse.json(jurisdictions);
  } catch (error) {
    console.error('Error loading jurisdictions:', error);
    return NextResponse.json(
      { error: 'Failed to load jurisdictions' },
      { status: 500 }
    );
  }
}
