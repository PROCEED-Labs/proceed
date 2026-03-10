import { updateParameter } from '@/lib/data/db/machine-config';
import { NextRequest, NextResponse } from 'next/server';
import {
  getDataObject,
  isErrorResponse,
  parseAndGetChanges,
} from '@/app/api/spaces/[spaceId]/data/helper';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; dataObjectId: string }> },
) {
  // Answer - Success: 200 OK - Returns the full, requested Data Object
  // Answer - Error: 404 Not found - Specified Space or Data Object not found

  const { spaceId, dataObjectId } = await props.params;
  const fetchedData = await getDataObject(spaceId, dataObjectId);
  if (isErrorResponse(fetchedData)) return fetchedData.data;
  else return NextResponse.json(fetchedData.data);
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ spaceId: string; dataObjectId: string }> },
) {
  // Answer - Success: 200 OK - Data Object updated
  // Answer - Error: 404 Invalid input - Specified Space or Data Object not found
  // Answer - Error: 409 Invalid input. Body contains the reason. For example, syntax invalid, etc.

  const { spaceId, dataObjectId } = await props.params;
  try {
    const fetchedData = await getDataObject(spaceId, dataObjectId);
    if (isErrorResponse(fetchedData)) return fetchedData.data;
    const parameterChanges = await parseAndGetChanges(await request.text(), fetchedData.data);
    await updateParameter(parameterChanges.id, parameterChanges.changes, spaceId);
    return NextResponse.json('Success.');
  } catch (error: any) {
    return NextResponse.json(error, { status: 409 });
  }
}
