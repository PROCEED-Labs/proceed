'use client';

import { FC, useEffect, useState } from 'react';
import ScrollBar from './scrollbar';
import { Button, Tour } from 'antd';
import { useTourRefStore } from '@/lib/tourRefStore';

type TutorialTourType = {
  setWindowOpen: (arg: boolean) => void;
  setTour: (arg: any) => void;
  setTourInProgress: (arg: any) => void;
};

const TutorialTour: FC<TutorialTourType> = ({ setWindowOpen, setTour, setTourInProgress }) => {
  const { tourIds, tours } = useTourRefStore();

  return (
    <>
      <ScrollBar>
        {tourIds.map((tourId, _) => {
          return (
            <>
              <Button
                key={tourId}
                onClick={() => {
                  setTour(tours[tourId]);
                  setTourInProgress(true);
                  setWindowOpen(false);
                }}
              >
                {tourId}
              </Button>
              <br />
            </>
          );
        })}
      </ScrollBar>
    </>
  );
};

export default TutorialTour;
