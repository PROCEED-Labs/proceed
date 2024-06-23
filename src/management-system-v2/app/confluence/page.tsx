import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { Process } from '@/lib/data/process-schema';
import Layout from './layout-client';
import { Environment } from '@/lib/data/environment-schema';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import ManagableProcessList from './managable-process-list';
import { headers, cookies } from 'next/headers';

const ConfluencePage = async ({ params, searchParams }: { params: any; searchParams: any }) => {
  // const jwt = searchParams.jwt;
  // const res = await fetch('https://proceed-test.atlassian.net/wiki/api/v2/pages', {
  //   method: 'GET',
  //   headers: {
  //     Authorization: `JWT ${jwt}`,
  //   },
  // });

  const { userId } = await getCurrentUser();
  const headersList = headers();
  const headersObject = Object.fromEntries(headersList.entries());
  // console.log(headersObject);
  const cookiesList = cookies().getAll();
  console.log(cookiesList);
  // const { ability } = await getCurrentEnvironment(userId);
  // // get all the processes the user has access to
  // const ownedProcesses = (await getProcesses(ability)) as Process[];

  // const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  // userEnvironments.push(
  //   ...getUserOrganizationEnvironments(userId).map((environmentId) =>
  //     getEnvironmentById(environmentId),
  //   ),
  // );

  return (
    // <Layout
    //   hideFooter={true}
    //   loggedIn={!!userId}
    //   layoutMenuItems={[]}
    //   userEnvironments={userEnvironments}
    //   activeSpace={{ spaceId: userId || '', isOrganization: false }}
    // >
    //   <div style={{ padding: '1rem', width: '100%' }}>
    //     <ManagableProcessList processes={ownedProcesses}></ManagableProcessList>
    //   </div>
    // </Layout>
    <div>
      <div>
        <span>COOKIES:</span>
        {cookiesList.map((cookie) => (
          <div key={cookie.name}>
            <span>Name: {cookie.name}</span>
            <span>Value: {cookie.value}</span>
          </div>
        ))}
      </div>
      <div>
        <span>HEADER:</span>
        {Object.keys(headersObject).map((headerKey) => (
          <div key={headerKey}>
            <span>Key: {headerKey}</span>
            <span>Value: {headersObject[headerKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfluencePage;
