import {
  defaultConfiguration,
  defaultTdsConfigurationTemplate,
  defaultParentConfiguration,
} from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import {
  addParentConfig,
  getParentConfigurations,
  getSpaceOwner,
  validateUniqueConfigMetaData,
} from '@/lib/data/db/machine-config';
import { Config, ConfigMetadata, ConfigMetadataZod } from '@/lib/data/machine-config-schema';
import { NextRequest, NextResponse } from 'next/server';
import { validate } from 'uuid';
export type ListItem = Config;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Answer - Success: 200 OK, Body: List of all existing configurations ([ {id, shortname, name, categories }, ... ])
  try {
    const configurations = (await getParentConfigurations(spaceId)) satisfies ListItem[];
    const filteredConfigurations = configurations.map(
      ({ id, name, category, shortName, description, templateId, ...rest }) => ({
        id,
        name: name.value,
        category: category.value,
        shortName: shortName.value,
        description: description.value,
        templateId,
      }),
    );

    return NextResponse.json(filteredConfigurations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params;
  //TODOs:
  //  - error if transformation of request body to json fails (but no check of content-type header is json)
  //  - error if id is inside body
  //  - error if shortname is not unique

  // Body: Complete configuration, structure same as used for Import but without Config-Set-ID, Short-Name must also be unique
  // Answer - Success: 201 Created, Header: Location field with new Config-Set-ID,
  // Answer - Error: 409 Conflict, Body: contains the reason, e.g. Config-Set-ID was given in request or Short-Name already exists

  const searchParams = request.nextUrl.searchParams;
  try {
    let userId = await getSpaceOwner(spaceId);

    const body: ConfigMetadata = await request.json();
    ConfigMetadataZod.parse(body);
    if (
      body.shortName &&
      !(await validateUniqueConfigMetaData(spaceId, 'shortName', body.shortName))
    ) {
      throw new Error(`shortName already taken.`);
    }
    let newConfig;
    if (searchParams.get('template') == 'TDS') {
      newConfig = defaultTdsConfigurationTemplate(
        spaceId,
        body.name || '',
        body.shortName,
        body.description || '',
        (body.category || '').split(';'),
      );
    } else {
      newConfig = defaultConfiguration(
        spaceId,
        body.name || '',
        body.shortName,
        body.description || '',
        (body.category || '').split(';'),
      );
    }
    const add_return = await addParentConfig(newConfig, spaceId, userId || '');
    if ('error' in add_return) {
      throw add_return.error.message;
    }
    return NextResponse.json(
      { message: 'Success!' },
      {
        status: 201,
        headers: { Location: add_return.storeId },
      },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? error }, { status: 409 });
  }
}
