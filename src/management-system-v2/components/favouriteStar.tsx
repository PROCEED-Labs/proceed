'use client';
import { FC } from 'react';
import { StarOutlined } from '@ant-design/icons';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';

type StarType = {
  id: string;
  className?: string;
  viewOnly?: boolean;
};

const FavouriteStar: FC<StarType> = ({ id, className, viewOnly = false }) => {
  const { favourites: favs, updateFavouriteProcesses: updateFavs } = useFavouriteProcesses();

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
