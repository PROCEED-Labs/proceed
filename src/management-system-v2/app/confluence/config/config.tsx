'use client';
import { Environment } from '@/lib/data/environment-schema';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { Label } from '@atlaskit/form';
import Select from '@atlaskit/select';
import { createFolder } from '@/lib/data/folders';
import { updateConfluenceClientSelectedSpace } from '@/lib/data/confluence';
import { CSSProperties } from 'react';

const SpaceSelectionTab = ({
  userEnvironments,
  onSelect,
  initialSpaceId,
}: {
  userEnvironments: Environment[];
  onSelect: (value: { label: string; value: string } | null) => void;
  initialSpaceId?: string;
}) => {
  const options = userEnvironments
    .filter((environment) => environment.isOrganization)
    .map((environment) => {
      if (environment.isOrganization) {
        return { label: environment.name, value: environment.id };
      }
      return { label: environment.id, value: environment.id };
    });

  const initialOption = options.find((option) => option.value === initialSpaceId);

  const wrapperStyle: CSSProperties = {
    minHeight: '500px',
    marginBlock: '1rem',
    display: 'flex',
    flexDirection: 'row',
  };

  return (
    <div style={wrapperStyle}>
      <div style={{ minWidth: '300px', marginRight: '2rem' }}>
        <Label htmlFor="single-select-example">Choose for PROCEED Space</Label>
        <Select
          inputId="single-select-example"
          options={options}
          onChange={onSelect}
          defaultValue={initialOption}
        />
      </div>
      <span style={{ marginTop: '1.25rem' }}>
        Processes are stored and managed by PROCEED. Choose for your desired PROCEED Space to store
        the created processes in.
      </span>
    </div>
  );
};

const Config = ({
  userEnvironments,
  clientKey,
  initialSpaceId,
}: {
  userEnvironments: Environment[];
  clientKey: string;
  initialSpaceId?: string;
}) => {
  const getConfluenceURL = () => {
    return new Promise((resolve) => {
      window.AP.context.getContext((response) => {
        const URL = response.url.displayUrl as string;
        resolve(URL);
      });
    }) as Promise<string>;
  };

  const selectSpace = async (selectedSpace: { label: string; value: string } | null) => {
    // Create Confluence Folder in PROCEED which is shared for every user in this space => anyone can create and edit processes
    if (selectedSpace) {
      const confluenceURL = await getConfluenceURL();
      const res = await createFolder({
        name: `Confluence ${confluenceURL}`,
        description: `Folder created for Confluence Domain ${confluenceURL} to share processes between Confluence Users`,
        parentId: null,
        environmentId: selectedSpace.value,
      });

      if ('error' in res) {
        throw new Error('Could not create folder for selected space');
      }

      await updateConfluenceClientSelectedSpace(clientKey, {
        id: selectedSpace.value,
        confluenceFolderId: res.id,
      });
    }
  };

  return (
    <Tabs id="default">
      <TabList>
        <Tab>PROCEED Space</Tab>
        <Tab>Other</Tab>
      </TabList>
      <TabPanel>
        <SpaceSelectionTab
          userEnvironments={userEnvironments}
          initialSpaceId={initialSpaceId}
          onSelect={selectSpace}
        ></SpaceSelectionTab>
      </TabPanel>
      <TabPanel>
        <div>This is the content area of the second tab.</div>
      </TabPanel>
    </Tabs>
  );
};

export default Config;
