import { Avatar as AntDesignAvatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { ComponentProps, forwardRef, useEffect, useState } from 'react';
import Avatar from 'boring-avatars';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';

type UserAvatarProps = {
  user?: {
    id: string;
    isGuest?: boolean | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImage?: string | null;
  };
} & ComponentProps<typeof AntDesignAvatar>;

const UserAvatar = forwardRef<HTMLElement, UserAvatarProps>(({ user, ...props }, ref) => {
  const { download: getProfileUrl } = useFileManager({ entityType: EntityType.PROFILE_PICTURE });
  const [avatarUrl, setAvatarURl] = useState<string | undefined>();

  useEffect(() => {
    async function getUrl() {
      if (!user?.profileImage || user.profileImage.startsWith('https')) return;

      try {
        // Technically user.profileImage is not needed, but it generates a new URl and causes the
        // image to update
        const response = await getProfileUrl({ entityId: user.id, filePath: user.profileImage });
        if (response.fileUrl) {
          setAvatarURl(response.fileUrl);
        }
      } catch (e) {}
    }
    getUrl();

    return () => setAvatarURl(undefined);
    // getProfileUrl is a new function on each render
  }, [user]); // eslint-disable-line

  if (!user) return <AntDesignAvatar {...props} />;

  if (user.isGuest) return <AntDesignAvatar icon={<UserOutlined />} {...props} />;

  let icon;
  if (avatarUrl) icon = <img src={avatarUrl} alt="avatar" />;
  else if (user?.profileImage?.startsWith('https') && user.profileImage)
    icon = <img src={user.profileImage} alt="avatar" />;
  else
    icon = (
      <Avatar
        size={64}
        name={user.id}
        variant="marble"
        colors={['#51843A', '#599140', '#62A046', '#780116', '#982D28', '#B85939', '#F7B05B']}
      />
    );

  return (
    <AntDesignAvatar
      style={{ position: 'relative' }}
      src={
        <>
          {icon}
          <Typography.Text
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {!(avatarUrl || user?.profileImage?.startsWith('https'))
              ? (user.firstName || '').slice(0, 1) + (user.lastName || '').slice(0, 1)
              : null}
          </Typography.Text>
        </>
      }
      {...props}
      ref={ref}
    />
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
