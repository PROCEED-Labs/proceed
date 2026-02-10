import {
  addParentConfig,
  getConfigIdFromShortName,
  getDeepConfigurationById,
  getSpaceOwner,
  removeParentConfiguration,
  validateUniqueConfigField,
} from '@/lib/data/db/machine-config';
import { Config, ConfigZod } from '@/lib/data/machine-config-schema';
import { asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { NextRequest, NextResponse } from 'next/server';
import { validate as uuidValidate } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; configSetId: string }> },
) {
  // Answer - Success: 200 OK, Body: List of all versions of one configuration [ "1", "2", "latest"]
  // Answer - Error: 404 Not Found
  try {
    const { spaceId, configSetId } = await params;
    //TODO: find and return versions
    let queryId = uuidValidate(configSetId)
      ? configSetId
      : await getConfigIdFromShortName(configSetId, spaceId);
    const config = await getDeepConfigurationById(queryId);
    return NextResponse.json(['latest']);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; configSetId: string }> },
) {
  // Answer - Success: 200 OK
  // Answer - Error: 409 Invalid input. Body contains the reason. For example, id was given, shortName already exists, syntax invalid, etc.
  try {
    const { spaceId, configSetId } = await params;
    const body: Config = await request.json();
    ConfigZod.parse(body);
    let usingId = uuidValidate(configSetId);
    if (usingId) {
      if (!(await validateUniqueConfigField(spaceId, 'id', configSetId))) {
        throw new Error(
          'Config ID already exists. Please first delete the existing Configuration Set first.',
        );
      }
      if (body.id !== configSetId) {
        throw new Error('ID of the config and query ID do not match.');
      }
    } else {
      console.log('USING SN!');
      if (!(await validateUniqueConfigField(spaceId, 'shortName', configSetId))) {
        throw new Error(
          'ShortName already exists. Please first delete the existing Configuration Set first.',
        );
      }
      if (body.shortName.value !== configSetId) {
        throw new Error(
          `The shortName '${body.shortName.value}' of the config and query shortName '${configSetId}' do not match.`,
        );
      }
    }

    let userId = await getSpaceOwner(spaceId);
    const add_return = await addParentConfig(body, spaceId, userId || '');
    if ('error' in add_return) {
      throw add_return.error.message;
    }
    return NextResponse.json('Success.');
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ configSetId: string }> },
) {
  // Answer - Success: 200 OK
  // Answer - Error: 400 Bad Request, Body: contains the reason

  try {
    const { configSetId } = await params;
    await removeParentConfiguration(configSetId, false);
    return NextResponse.json({ message: 'Success!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
