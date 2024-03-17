import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFavouritesProcessIds } from './data/processes';
import { useEffect, useState } from 'react';
import { updateUser } from './data/users';

export const useFavouriteProcesses = () => {
  const queryClient = useQueryClient();
  const { data: favourites } = useQuery({
    queryKey: ['user', 'processes', 'favourites'],
    queryFn: async () => {
      return await getFavouritesProcessIds();
    },
  });

  const [updateFavouriteProcesses, setUpdateFavouriteProcesses] = useState(() => {});
  useEffect(() => {
    const update = (id: string) => {
      if (favourites?.includes(id)) {
        // remove from favourites
        updateUser({ favourites: favourites.filter((fav) => fav !== id) as string[] });
      } else if (favourites == undefined) {
        updateUser({ favourites: [id] });
      } else {
        // add to favourites
        updateUser({ favourites: [...favourites, id] as string[] });
      }
      queryClient.invalidateQueries({ queryKey: ['user', 'processes', 'favourites'] });
    };
    setUpdateFavouriteProcesses((id) => update);
  }, [favourites, queryClient]);

  return [favourites, updateFavouriteProcesses];
};
