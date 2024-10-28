import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/data/db';
import { deleteProcessArtifact } from '@/lib/data/file-manager-facade';

export async function GET(request: NextRequest) {
  try {
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
