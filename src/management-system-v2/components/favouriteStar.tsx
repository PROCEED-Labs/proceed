'use client';
import { FC, useCallback } from 'react';
import { StarOutlined } from '@ant-design/icons';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';
import { isUserGuest as ServerActionIsUserGuest } from '@/lib/data/users';
import { App } from 'antd';

type StarType = {
  id: string;
  className?: string;
  viewOnly?: boolean;
};

const FavouriteStar: FC<StarType> = ({ id, className, viewOnly = false }) => {
  const { favourites: favs, updateFavouriteProcesses } = useFavouriteProcesses();
  const { message } = App.useApp();

  const updateFavs = useCallback(
    async (id: string) => {
      if (await ServerActionIsUserGuest()) {
        message.info({
          content: 'To save your favourite processes permanantly, you need to sign in.',
          duration: 5,
        });
      }

      updateFavouriteProcesses(id);
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
