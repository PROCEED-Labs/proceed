'use client';
import { FC } from 'react';
import { StarOutlined } from '@ant-design/icons';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';

type StarType = {
  id: string;
  className?: string;
};

const FavouriteStar: FC<StarType> = ({ id, className }) => {
  const { favourites: favs, updateFavouriteProcesses: updateFavs } = useFavouriteProcesses();

  return (
    <>
      <StarOutlined
        style={{
          color: favs?.includes(id) ? '#FFD700' : undefined,
        }}
        onClick={(e) => {
          e.stopPropagation();
          updateFavs(id);
          console.log(id);
          console.log(favs);
        }}
        className={favs?.includes(id) ? undefined : className}
      />
    </>
  );
};

export default FavouriteStar;
