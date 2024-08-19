import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/data';
import { deleteFile } from '@/lib/data/file-manager';

export async function GET(request: NextRequest) {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const deletableFiles = await db.processArtifacts.findMany({
      where: {
        deletable: true,
        updatedOn: { lte: oneWeekAgo },
      },
      select: { filePath: true, processId: true },
    });

    if (deletableFiles.length > 0) {
      console.log(deletableFiles);
      await Promise.all(
        deletableFiles.map((file) => deleteFile(file.filePath, file.processId, true)),
      );
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
