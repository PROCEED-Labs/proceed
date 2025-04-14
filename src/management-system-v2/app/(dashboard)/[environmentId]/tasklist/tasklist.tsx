'use client';
import { Button, Grid, MenuProps, Pagination, Space } from 'antd';
import UserTaskCard from './userTaskCard';
import { useEffect, useMemo, useState } from 'react';

import { FaLongArrowAltDown, FaLongArrowAltUp } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';

import styles from './tasklist.module.scss';
import ScrollBar from '@/components/scrollbar';

import { TaskListEntry } from '@/lib/engines/tasklist';
import UserTaskView from './user-task-view';
import { ItemType } from 'antd/es/menu/interface';
import {
  FilterOrSortButton,
  PerformerSelection,
  SliderRangeWithText,
  StatusSelection,
  stateOrder,
} from './components';

const sortValues = ['startTime', 'deadline', 'progress', 'priority', 'state'] as const;
type SortValue = (typeof sortValues)[number];
const sortValueMap = {
  startTime: 'startTime',
  deadline: 'endTime',
  progress: 'progress',
  priority: 'priority',
  state: 'state',
} as const;

const Tasklist = ({ userTasks }: { userTasks: TaskListEntry[] }) => {
  const breakpoint = Grid.useBreakpoint();

  const [selectedUserTaskID, setSelectedUserTaskID] = useState<string | null>(null);
  const [stateSelectionFilter, setStateSelectionFilter] = useState(['READY', 'ACTIVE', 'PAUSED']);
  const [priorityRangeFilter, setPriorityRangeFilter] = useState<[number, number]>([1, 10]);
  const [progressRangeFilter, setProgressRangeFilter] = useState<[number, number]>([0, 100]);
  const [usersFilter, setUsersFilter] = useState<string[]>([]);
  const [groupsFilter, setGroupsFilter] = useState<string[]>([]);
  const [currentListPage, setCurrentListPage] = useState(1);

  const [selectedSortItem, setSelectedSortItem] = useState<{
    ascending: boolean;
    value: SortValue;
  }>({ ascending: true, value: 'startTime' });

  const filteredAndSortedUserTasks = useMemo(() => {
    const showingUserTasks = userTasks.filter((uT) => {
      return (
        stateSelectionFilter.includes(uT.state) &&
        uT.priority >= priorityRangeFilter[0] &&
        uT.priority <= priorityRangeFilter[1] &&
        uT.progress >= progressRangeFilter[0] &&
        uT.progress <= progressRangeFilter[1]
      );
    });

    const getSortFunction = (name: SortValue) => {
      const key = sortValueMap[name];
      return (a: TaskListEntry, b: TaskListEntry) => {
        // tiebreak equal value by comparing the startTime
        if (a[key] === b[key]) {
          return selectedSortItem.ascending ? a.startTime - b.startTime : b.startTime - a.startTime;
        }

        if (key === 'state') {
          const indexA = stateOrder.findIndex((state) => a.state === state);
          const indexB = stateOrder.findIndex((state) => b.state === state);
          return selectedSortItem.ascending ? indexA - indexB : indexB - indexA;
        }

        return selectedSortItem.ascending ? a[key] - b[key] : b[key] - a[key];
      };
    };

    showingUserTasks.sort(getSortFunction(selectedSortItem.value));

    return showingUserTasks;
  }, [stateSelectionFilter, priorityRangeFilter, progressRangeFilter, selectedSortItem, userTasks]);

  const itemsPerPage = 10;
  const pageStartItemIndex = (currentListPage - 1) * itemsPerPage;
  const userTasksToDisplay = filteredAndSortedUserTasks.slice(
    pageStartItemIndex,
    pageStartItemIndex + itemsPerPage,
  );

  const userTaskSelectedOnMobile = selectedUserTaskID && !breakpoint.xl;
  const selectedUserTask = filteredAndSortedUserTasks.find((uT) => uT.id === selectedUserTaskID);

  useEffect(() => {
    if (selectedUserTask) {
      const newIndex = filteredAndSortedUserTasks.findIndex((task) => task === selectedUserTask);
      const newPageIndex = 1 + newIndex / itemsPerPage;
      setCurrentListPage(Math.floor(newPageIndex));
      return;
    }

    const numPages = 1 + (filteredAndSortedUserTasks.length - 1) / itemsPerPage;
    if (numPages < currentListPage) {
      setCurrentListPage(1);
    }
  }, [userTasksToDisplay]);

  const users = ['Max Mustermann', 'John Doe', 'Bob Smith'];
  const groups = ['Example Group A', 'Example Group B', 'Example Group C'];

  const filterDropdownItems: MenuProps['items'] = Object.entries({
    Status: (
      <StatusSelection
        selectedValues={stateSelectionFilter}
        onSelectionChange={(selectedValues) => {
          setStateSelectionFilter(selectedValues);
        }}
      />
    ),
    Priority: (
      <SliderRangeWithText
        min={1}
        max={10}
        selectedRangeValues={priorityRangeFilter}
        onRangeChange={(selectedRangeValues) => {
          setPriorityRangeFilter(selectedRangeValues);
        }}
      />
    ),
    Progress: (
      <SliderRangeWithText
        selectedRangeValues={progressRangeFilter}
        onRangeChange={(selectedRangeValues) => {
          setProgressRangeFilter(selectedRangeValues);
        }}
      />
    ),
    Users: (
      <PerformerSelection
        type="User"
        data={users}
        selected={usersFilter}
        onChange={setUsersFilter}
      />
    ),
    Groups: (
      <PerformerSelection
        type="Group"
        data={groups}
        selected={groupsFilter}
        onChange={setGroupsFilter}
      />
    ),
  }).reduce((curr, [label, content], index) => {
    if (index > 0) {
      curr.push({ type: 'divider' });
    }

    curr.push({
      key: index,
      type: 'group',
      label,
      children: [{ key: `${index}-1`, label: content }],
    });

    return curr;
  }, [] as ItemType[]);

  const sortDropdownItems: MenuProps['items'] = sortValues.map((sortValue, index) => {
    const currentlySelected = selectedSortItem.value === sortValue;
    const ascending = selectedSortItem.ascending;

    return {
      key: index,
      label: (
        <div
          className={styles.SortListEntry}
          onClick={() => {
            const sortAscending = currentlySelected ? !ascending : true;
            setSelectedSortItem({ ascending: sortAscending, value: sortValue });
          }}
        >
          <span>{sortValue}</span>
          {currentlySelected && <>{ascending ? <FaLongArrowAltUp /> : <FaLongArrowAltDown />}</>}
        </div>
      ),
    };
  });

  return (
    <div className={styles.Tasklist}>
      <div
        className={styles.ControlSection}
        style={{ flexGrow: !breakpoint.xl && !selectedUserTaskID ? 1 : undefined }}
      >
        {userTaskSelectedOnMobile ? (
          <div className={styles.MobileHeader}>
            <div className={styles.SelectedCardOnMobile}>
              <UserTaskCard userTaskData={selectedUserTask!} />
            </div>
            <Button
              icon={<IoArrowBack />}
              onClick={() => {
                setSelectedUserTaskID(null);
              }}
            />
          </div>
        ) : (
          <Space.Compact className={styles.FilterAndSort}>
            <FilterOrSortButton type="Filter" items={filterDropdownItems} />
            <FilterOrSortButton type="Sort" items={sortDropdownItems} />
          </Space.Compact>
        )}
        {!userTaskSelectedOnMobile && (
          <div className={styles.UserTaskCardList}>
            <div className={styles.ScrollableSection}>
              <ScrollBar>
                <div
                  style={{
                    maxWidth: breakpoint.xl ? '300px' : undefined,
                  }}
                  className={styles.CardList}
                >
                  {userTasksToDisplay.map((item) => (
                    <UserTaskCard
                      key={item.id}
                      userTaskData={item}
                      selected={item.id === selectedUserTaskID}
                      clickHandler={() =>
                        setSelectedUserTaskID(selectedUserTaskID === item.id ? null : item.id)
                      }
                    />
                  ))}
                </div>
              </ScrollBar>
            </div>
            <Pagination
              style={{ alignSelf: 'center' }}
              current={currentListPage}
              onChange={setCurrentListPage}
              size="small"
              responsive
              pageSize={itemsPerPage}
              total={filteredAndSortedUserTasks.length}
            />
          </div>
        )}
      </div>
      {(selectedUserTaskID ?? breakpoint.xl) && <UserTaskView task={selectedUserTask} />}
    </div>
  );
};

export default Tasklist;
