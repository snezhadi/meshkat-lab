import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Use local data directory for development
const DATA_DIR = path.join(process.cwd(), 'data');
const DOCUMENT_TEMPLATES_FILE = path.join(DATA_DIR, 'document-templates.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure directories exist
async function ensureDataDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    // Directories might already exist
  }
}

// Initialize with default data if file doesn't exist
async function initializeDefaultData() {
  await ensureDataDirectories();

  const fileExists = await fs.access(DOCUMENT_TEMPLATES_FILE)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    const defaultTemplates = [
      {
        id: 'employment_agreement',
        name: 'Employment Agreement',
        description: 'Standard employment agreement template',
        jurisdiction: 'CA',
        clauses: [
          {
            id: 'definitions',
            title: 'Definitions',
            content: 'In this Agreement, the following terms have the meanings set out below...',
            description: 'Define key terms used in the agreement',
            condition: null,
            paragraphs: [],
          },
        ],
      },
    ];

    await fs.writeFile(DOCUMENT_TEMPLATES_FILE, JSON.stringify(defaultTemplates, null, 2), 'utf8');
  }
}

export async function GET() {
  try {
    await initializeDefaultData();
    const data = await fs.readFile(DOCUMENT_TEMPLATES_FILE, 'utf8');
    const documentTemplates = JSON.parse(data);
    
    console.log(`GET request - Returning ${documentTemplates.length} templates`);
    if (documentTemplates.length > 0) {
      console.log(`Template IDs in file: ${documentTemplates.map(t => t.id).join(', ')}`);
    }
    
    return NextResponse.json({ success: true, data: documentTemplates });
  } catch (error) {
    console.error('Error reading document templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read document templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDefaultData();
    const { documentTemplates, createCheckpoint } = await request.json();

    console.log(`POST request received - Templates count: ${documentTemplates?.length || 0}`);
    if (documentTemplates && documentTemplates.length > 0) {
      console.log(`Template IDs: ${documentTemplates.map(t => t.id).join(', ')}`);
    }

    if (!documentTemplates) {
      return NextResponse.json(
        { success: false, error: 'Document templates data is required' },
        { status: 400 }
      );
    }

    // Create backup if requested
    if (createCheckpoint) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(BACKUP_DIR, `document-templates-checkpoint-${timestamp}.json`);

      try {
        const currentTemplates = await fs.readFile(DOCUMENT_TEMPLATES_FILE, 'utf8');
        await fs.writeFile(backupFile, currentTemplates, 'utf8');
        console.log(`Created checkpoint: ${backupFile}`);
      } catch (backupError) {
        console.warn('Failed to create backup:', backupError);
      }
    }

    // Write the new document templates
    const jsonData = JSON.stringify(documentTemplates, null, 2);
    
    try {
      // Ensure directories exist
      await ensureDataDirectories();
      console.log(`Data directory is ready: ${DATA_DIR}`);
      
      // Write the file
      await fs.writeFile(DOCUMENT_TEMPLATES_FILE, jsonData, 'utf8');
      console.log(`File written successfully: ${DOCUMENT_TEMPLATES_FILE}`);
      
      // Verify the write was successful by reading it back
      const verifyData = await fs.readFile(DOCUMENT_TEMPLATES_FILE, 'utf8');
      const parsedData = JSON.parse(verifyData);
      
      console.log(`Document templates saved successfully. Count: ${parsedData.length}`);
      if (documentTemplates.length > 0) {
        console.log(`Latest template ID: ${documentTemplates[documentTemplates.length - 1].id}`);
      }
    } catch (writeError: any) {
      console.error('Error writing document templates:', writeError);
      console.error('Error details:', {
        code: writeError.code,
        errno: writeError.errno,
        syscall: writeError.syscall,
        path: writeError.path
      });
      throw writeError;
    }

    return NextResponse.json({
      success: true,
      message: 'Document templates saved successfully',
      checkpoint: createCheckpoint
        ? `document-templates-checkpoint-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        : null,
      templateCount: documentTemplates.length,
    });
  } catch (error) {
    console.error('Error saving document templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save document templates' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = request;
    const checkpointName = new URL(url).searchParams.get('checkpoint');

    if (!checkpointName) {
      return NextResponse.json(
        { success: false, error: 'Checkpoint name is required' },
        { status: 400 }
      );
    }

    const checkpointFile = path.join(BACKUP_DIR, checkpointName);

    const fileExists = await fs.access(checkpointFile)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return NextResponse.json({ success: false, error: 'Checkpoint not found' }, { status: 404 });
    }

    await fs.unlink(checkpointFile);

    return NextResponse.json({
      success: true,
      message: 'Checkpoint deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete checkpoint' },
      { status: 500 }
    );
  }
}
