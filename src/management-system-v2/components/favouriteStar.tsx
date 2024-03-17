'use client';
import { FC } from 'react';
import { StarOutlined } from '@ant-design/icons';
import { useFavouriteProcesses } from '@/lib/useFavouriteProcesses';

type StartType = {
  id: string;
  hovered?: boolean;
};

const FavouriteStar: FC<StartType> = ({ id, hovered }) => {
  const [favs, updateFavs] = useFavouriteProcesses();

  return (
    <>
      <StarOutlined
        style={{
          color: favs?.includes(id) ? '#FFD700' : undefined,
          opacity: hovered || favs?.includes(id) ? 1 : 0,
        }}
        onClick={(e) => {
          e.stopPropagation();
          updateFavs(id);
        }}
      />
    </>
  );
};

export default FavouriteStar;
