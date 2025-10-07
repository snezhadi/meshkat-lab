import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cwd = process.cwd();
    const dataDir = path.join(cwd, 'data');
    
    // Check if directories exist
    const cwdExists = await fs.access(cwd).then(() => true).catch(() => false);
    const dataDirExists = await fs.access(dataDir).then(() => true).catch(() => false);
    
    // Try to list data directory contents
    let dataDirContents: string[] = [];
    if (dataDirExists) {
      try {
        dataDirContents = await fs.readdir(dataDir);
      } catch (error) {
        dataDirContents = [`Error reading directory: ${error}`];
      }
    }
    
    // Check file paths
    const templatesFile = path.join(dataDir, 'document-templates.json');
    const parametersFile = path.join(dataDir, 'parameters.json');
    
    const templatesExists = await fs.access(templatesFile).then(() => true).catch(() => false);
    const parametersExists = await fs.access(parametersFile).then(() => true).catch(() => false);
    
    // Get file stats if they exist
    let templatesSize = 0;
    let parametersSize = 0;
    let templatesModified = null;
    let parametersModified = null;
    
    if (templatesExists) {
      const stats = await fs.stat(templatesFile);
      templatesSize = stats.size;
      templatesModified = stats.mtime;
    }
    
    if (parametersExists) {
      const stats = await fs.stat(parametersFile);
      parametersSize = stats.size;
      parametersModified = stats.mtime;
    }
    
    // Try to write a test file
    const testFile = path.join(dataDir, 'test-write.json');
    let writeTest = 'failed';
    try {
      await fs.writeFile(testFile, JSON.stringify({ test: true, timestamp: new Date().toISOString() }));
      writeTest = 'success';
      // Clean up test file
      await fs.unlink(testFile).catch(() => {});
    } catch (error: any) {
      writeTest = `failed: ${error.message}`;
    }
    
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      paths: {
        cwd,
        dataDir,
        templatesFile,
        parametersFile,
      },
      existence: {
        cwdExists,
        dataDirExists,
        templatesExists,
        parametersExists,
      },
      dataDirContents,
      fileInfo: {
        templates: {
          size: templatesSize,
          modified: templatesModified,
        },
        parameters: {
          size: parametersSize,
          modified: parametersModified,
        },
      },
      writeTest,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

