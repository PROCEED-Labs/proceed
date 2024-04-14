'use client';

import { FC } from 'react';
import { Alert, Typography } from 'antd';
import { FilteredRole } from './role-page';

const UserSiderContent: FC<{ role: FilteredRole | null }> = ({ role }) => {
  return (
    <>
      {role ? (
        <>
          {role.note && (
            <>
              <Typography.Title>Note</Typography.Title>
              <Typography.Text>
                <Alert type="warning" description={role.note} />
              </Typography.Text>
            </>
          )}

          {role.description && (
            <>
              <Typography.Title>Description</Typography.Title>
              <Typography.Text>{role.description}</Typography.Text>
            </>
          )}

          <Typography.Title>Members</Typography.Title>
          <Typography.Text>{role.members.length}</Typography.Text>

          <Typography.Title>Last Edited</Typography.Title>
          <Typography.Text>{role.lastEdited}</Typography.Text>

          <Typography.Title>Created On</Typography.Title>
          <Typography.Text>{role.createdOn}</Typography.Text>
        </>
      ) : (
        <Typography.Text>Select a role.</Typography.Text>
      )}
    </>
  );
};

export default UserSiderContent;
