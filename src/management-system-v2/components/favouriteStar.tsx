'use client';
import { FC, useCallback } from 'react';
import { StarOutlined } from '@ant-design/icons';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';
import { App } from 'antd';
import { useSession } from './auth-can';

type StarType = {
  id: string;
  className?: string;
  viewOnly?: boolean;
};

const FavouriteStar: FC<StarType> = ({ id, className, viewOnly = false }) => {
  const { favourites: favs, updateFavouriteProcesses } = useFavouriteProcesses();
  const { message } = App.useApp();
  const session = useSession();

  const updateFavs = useCallback(
    async (id: string) => {
      if (session.status !== 'authenticated' || session.data.user.isGuest) {
        message.info({
          content:
            'To save Processes / Folder as your favourites permanently, you need to Sign In.',
          duration: 5,
        });
      } else {
        updateFavouriteProcesses(id);
      }
    },
    [id],
  );

  return (
    <>
      <StarOutlined
        style={{
          color: favs?.includes(id) ? '#FFD700' : undefined,
        }}
        onClick={
          viewOnly
            ? undefined
            : (e) => {
                e.stopPropagation();
                updateFavs(id);
              }
        }
        className={favs?.includes(id) ? undefined : className}
      />
    </>
  );
};

export default FavouriteStar;
