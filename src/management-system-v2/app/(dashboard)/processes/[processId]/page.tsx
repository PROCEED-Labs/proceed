import React from 'react';
import { FC } from 'react';
import Page from './_page';
import DashboardLayout from '../../layout';

type ProcessProps = {
  params: { processId: string };
};

const Processes: FC<ProcessProps> = ({ params: { processId } }) => {
  // This page uses top-level state but "use client" in pages is buggy in dev
  // mode, so we use a separate file.
  return <Page params={{ processId }} />;
};

export default Processes;
