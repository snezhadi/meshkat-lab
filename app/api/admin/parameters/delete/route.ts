import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PARAMETERS_FILE = path.join(process.cwd(), 'data', 'parameters.json');

// POST /api/admin/parameters/delete - Delete a parameter
export async function POST(request: NextRequest) {
  try {
    const { parameterId } = await request.json();

    if (!parameterId) {
      return NextResponse.json(
        { error: 'Parameter ID is required' },
        { status: 400 }
      );
    }

    // Read current parameters
    const parametersData = await fs.readFile(PARAMETERS_FILE, 'utf8');
    const parameters = JSON.parse(parametersData);

    // Check if parameter exists
    const parameterExists = parameters.some((p: any) => p.id === parameterId);
    if (!parameterExists) {
      return NextResponse.json(
        { error: 'Parameter not found' },
        { status: 404 }
      );
    }

    // Create backup before deleting
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(process.cwd(), 'data', `parameters-backup-before-delete-${timestamp}.json`);
    
    try {
      await fs.writeFile(backupFile, parametersData);
      console.log(`Backup created: ${backupFile}`);
    } catch (backupError) {
      console.warn('Failed to create backup:', backupError);
    }

    // Remove the parameter
    const updatedParameters = parameters.filter((p: any) => p.id !== parameterId);

    // Save updated parameters
    await fs.writeFile(PARAMETERS_FILE, JSON.stringify(updatedParameters, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: `Parameter ${parameterId} deleted successfully`,
      backupFile: backupFile
    });
  } catch (error) {
    console.error('Error deleting parameter:', error);
    return NextResponse.json(
      { error: 'Failed to delete parameter' },
      { status: 500 }
    );
  }
}
