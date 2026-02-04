import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/data/db';
import { deleteProcessArtifact } from '@/lib/data/file-manager-facade';

export async function POST(request: NextRequest) {
  try {
    // Extract and validate the Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== process.env.SWEEPER_TRIGGER_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Bearer token' }, { status: 403 });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const deletableFiles = await db.artifact.findMany({
      where: {
        deletable: true,
        deletedOn: { lte: oneWeekAgo },
      },
      select: { filePath: true },
    });

    if (deletableFiles.length > 0) {
      await Promise.all(deletableFiles.map((file) => deleteProcessArtifact(file.filePath, true)));
    }

    return NextResponse.json(
      {
        message: `${deletableFiles.length} files deleted successfully`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting files:', error);
    return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 });
  }
}
