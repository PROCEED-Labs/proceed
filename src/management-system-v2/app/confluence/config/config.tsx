'use client';
import { Environment } from '@/lib/data/environment-schema';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { Label } from '@atlaskit/form';
import Select from '@atlaskit/select';
import { createFolder } from '@/lib/data/folders';
import { updateConfluenceClientSelectedSpace } from '@/lib/data/confluence';

const SpaceSelectionTab = ({
  userEnvironments,
  onSelect,
  initialSpace,
}: {
  userEnvironments: Environment[];
  onSelect: (value: { label: string; value: string } | null) => void;
  initialSpace: string;
}) => {
  const options = userEnvironments
    .filter((environment) => environment.organization)
    .map((environment) => {
      if (environment.organization) {
        return { label: environment.name, value: environment.id };
      }
      return { label: environment.id, value: environment.id };
    });

  const initialOption = options.find((option) => option.value === initialSpace);

  return (
    <div style={{ minHeight: '500px' }}>
      <div
        style={{
          marginBlock: '1rem',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'end',
        }}
      >
        <div style={{ minWidth: '300px', marginRight: '2rem' }}>
          <Label htmlFor="single-select-example">Choose for PROCEED Space</Label>
          <Select
            inputId="single-select-example"
            options={options}
            onChange={onSelect}
            defaultValue={initialOption}
          />
        </div>
        <span>
          Processes are stored and managed by PROCEED. Choose for your desired PROCEED Space to
          store the created processes in.
        </span>
      </div>
    </div>
  );
};

const Config = ({
  userEnvironments,
  clientKey,
  initialSpace,
}: {
  userEnvironments: Environment[];
  clientKey: string;
  initialSpace: string;
}) => {
  console.log('environments', userEnvironments);
  const selectSpace = async (selectedSpace: { label: string; value: string } | null) => {
    console.log('selectedSpace', selectedSpace);
    // Create Confluence Folder in PROCEED which is shared for every user in this space => anyone can create and edit processes
    if (selectedSpace) {
      const confluenceURL = await getConfluenceURL();
      const res = await createFolder({
        name: `Confluence ${confluenceURL}`,
        description: `Folder created for Confluence Domain ${confluenceURL} to share processes between Confluence Users`,
        parentId: null,
        environmentId: selectedSpace.value,
      });
      console.log('res', res);
      await updateConfluenceClientSelectedSpace(clientKey, selectedSpace.value);
    }
    const users = JSON.parse((await getConfluenceUsers()) as string).results;
    const atlassianUsers = users.filter(
      (user: { accountType: string }) => user.accountType === 'atlassian',
    );
    console.log('atlassianUsers', atlassianUsers);
    console.log('users', users);
  };

  const getConfluenceURL = () => {
    return new Promise((resolve) => {
      window.AP.context.getContext((response) => {
        console.log('response', response);
        const URL = response.url.displayUrl as string;
        resolve(URL);
      });
    }) as Promise<string>;
  };

  const getConfluenceUsers = () => {
    return new Promise((resolve) => {
      window.AP.request({
        url: '/rest/api/group/50ac3cda-c74a-4eca-8a5f-772b5f16bc41/membersByGroupId',
        type: 'GET',
        success: function (responseText: string) {
          resolve(responseText);
        },
      });
    });
  };

  return (
    <Tabs onChange={(index) => console.log('Selected Tab', index + 1)} id="default">
      <TabList>
        <Tab>PROCEED Space</Tab>
        <Tab>User Management</Tab>
        <Tab>Other</Tab>
      </TabList>
      <TabPanel>
        <SpaceSelectionTab
          userEnvironments={userEnvironments}
          initialSpace={initialSpace}
          onSelect={selectSpace}
        ></SpaceSelectionTab>
      </TabPanel>
      <TabPanel>
        <div>This is the content area of the second tab.</div>
      </TabPanel>
      <TabPanel>
        <div>This is the content area of the third tab.</div>
      </TabPanel>
    </Tabs>
  );
};

export default Config;
