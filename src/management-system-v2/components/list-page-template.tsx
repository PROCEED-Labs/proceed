'use client';

import styles from './processes.module.scss';
import React, { useEffect, useState } from 'react';
import { Grid, App } from 'antd';
import Bar from './bar';
import { useUserPreferences } from '@/lib/user-preferences';
import { useAbilityStore } from '@/lib/abilityStore';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import { useRouter } from 'next/navigation';
import { Process } from '@/lib/data/process-schema';

//TODO stop using external process
export type ProcessListProcess = ReplaceKeysWithHighlighted<
  Omit<Process, 'bpmn'>,
  'name' | 'description'
>;

type ListPageTemplate = {
  processes: Omit<Process, 'bpmn'>[];
  list: any;
};

const ListPageTemplate = ({ processes, list }: ListPageTemplate) => {
  const ability = useAbilityStore((state) => state.ability);

  const [selectedRowElements, setSelectedRowElements] = useState<ProcessListProcess[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);
  const canDeleteSelected = selectedRowElements.every((element) => ability.can('delete', element));

  const router = useRouter();
  const { message } = App.useApp();

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();

  const breakpoint = Grid.useBreakpoint();

  const {
    filteredData,
    searchQuery: searchTerm,
    setSearchQuery: setSearchTerm,
  } = useFuzySearch({
    data: processes ?? [],
    keys: ['name', 'description'],
    highlightedKeys: ['name', 'description'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  return (
    <>
      <div
        className={breakpoint.xs ? styles.MobileView : ''}
        style={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}
      >
        <div style={{ flex: '1' }}>
          <Bar
            leftNode={
              <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  {breakpoint.xs ? null : <>{actionButtons}</>}

                  {selectedRowKeys.length ? (
                    <span className={styles.SelectedRow}>
                      {selectedRowKeys.length} selected:
                      <span className={styles.Icons}>{actionBar}</span>
                    </span>
                  ) : undefined}
                </span>

                {<span>{toggleButtons}</span>}

                {/* <!-- FloatButtonGroup needs a z-index of 101
              since BPMN Logo of the viewer has an z-index of 100 --> */}
                {breakpoint.xl ? undefined : { floatButtons }}
              </span>
            }
            searchProps={{
              onChange: (e) => setSearchTerm(e.target.value),
              onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
              placeholder: searchTermPlaceholder,
            }}
          />

          {iconView ? { iconList } : { list }}
        </div>

        {/*Meta Data Panel*/}
        {breakpoint.xl ? { MetaDataPanel } : { MetaDataDrawer }}
      </div>
    </>
  );
};

export default Processes;
