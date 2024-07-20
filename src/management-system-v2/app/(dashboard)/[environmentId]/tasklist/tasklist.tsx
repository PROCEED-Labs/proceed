'use client';
import { Button, Checkbox, Dropdown, Grid, List, MenuProps, Select, Slider, Space } from 'antd';
import UserTaskCard from './userTaskCard';
import userTaskHTML from './user-task';
import { useMemo, useState } from 'react';

import { FaFilter, FaSort } from 'react-icons/fa6';

import { FaLongArrowAltDown, FaLongArrowAltUp } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';

import styles from './tasklist.module.scss';
import ScrollBar from '@/components/scrollbar';

const StatusSelection = ({
  selectedValues,
  onSelectionChange,
}: {
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
}) => {
  return (
    <Checkbox.Group
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      value={selectedValues}
      onChange={(checkedValues: string[]) => {
        onSelectionChange(checkedValues);
      }}
    >
      <Checkbox value="READY" style={{ marginBottom: '0.25rem' }}>
        READY
      </Checkbox>

      <Checkbox value="ACTIVE" style={{ marginBottom: '0.25rem' }}>
        ACTIVE
      </Checkbox>

      <Checkbox value="COMPLETED" style={{ marginBottom: '0.25rem' }}>
        COMPLETED
      </Checkbox>

      <Checkbox value="PAUSED">PAUSED</Checkbox>
    </Checkbox.Group>
  );
};

const SliderRangeWithText = ({
  min = 0,
  max = 100,
  selectedRangeValues = [0, 100],
  onRangeChange,
}: {
  min?: number;
  max?: number;
  selectedRangeValues?: [number, number];
  onRangeChange: (selectedRangeValues: [number, number]) => void;
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <Slider
        style={{ flexGrow: 1 }}
        range
        value={selectedRangeValues}
        min={min}
        max={max}
        onChange={([newLowerValue, newUpperValue]) => {
          onRangeChange([newLowerValue, newUpperValue]);
        }}
      />
      <span style={{ marginLeft: '1rem' }}>
        {selectedRangeValues[0]} - {selectedRangeValues[1]}
      </span>
    </div>
  );
};

const Tasklist = ({
  userTasks,
}: {
  userTasks: {
    id: number;
    name: string;
    status: string;
    owner: string;
    startTime: number;
    endTime: number;
    priority: number;
    progress: number;
  }[];
}) => {
  const breakpoint = Grid.useBreakpoint();

  const [selectedUserTaskID, setSelectedUserTaskID] = useState<number | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [statusSelectionFilter, setStatusSelectionFilter] = useState([
    'READY',
    'ACTIVE',
    'COMPLETED',
    'PAUSED',
  ]);
  const [priorityRangeFilter, setPriorityRangeFilter] = useState<[number, number]>([1, 10]);
  const [progressRangeFilter, setProgressRangeFilter] = useState<[number, number]>([0, 100]);
  const [usersFilter, setUsersFilter] = useState<string[]>([]);
  const [groupsFilter, setGroupsFilter] = useState<string[]>([]);
  const [selectedSortItem, setSelectedSortItem] = useState({ ascending: true, value: 'startTime' });

  const filteredAndSortedUserTasks = useMemo(() => {
    const showingUserTasks = userTasks.filter((uT) => {
      return (
        statusSelectionFilter.includes(uT.status) &&
        uT.priority >= priorityRangeFilter[0] &&
        uT.priority <= priorityRangeFilter[1] &&
        uT.progress >= progressRangeFilter[0] &&
        uT.progress <= progressRangeFilter[1]
      );
    });

    switch (selectedSortItem.value) {
      case 'startTime':
        showingUserTasks.sort((a, b) =>
          selectedSortItem.ascending ? a.startTime - b.startTime : b.startTime - a.startTime,
        );
        break;
      case 'deadline':
        showingUserTasks.sort((a, b) => {
          if (a.endTime === b.endTime) {
            selectedSortItem.ascending ? a.startTime - b.startTime : b.startTime - a.startTime;
          }
          return selectedSortItem.ascending ? a.endTime - b.endTime : b.endTime - a.endTime;
        });
        break;
      case 'progress':
        showingUserTasks.sort((a, b) => {
          if (a.progress === b.progress) {
            selectedSortItem.ascending ? a.startTime - b.startTime : b.startTime - a.startTime;
          }
          return selectedSortItem.ascending ? a.progress - b.progress : b.progress - a.progress;
        });
        break;
      case 'priority':
        showingUserTasks.sort((a, b) => {
          if (a.priority === b.priority) {
            selectedSortItem.ascending ? a.startTime - b.startTime : b.startTime - a.startTime;
          }
          return selectedSortItem.ascending ? a.priority - b.priority : b.priority - a.priority;
        });
        break;
      case 'state':
        showingUserTasks.sort((a, b) => {
          const stateOrder = ['READY', 'ACTIVE', 'COMPLETED', 'PAUSED'];
          if (a.status === b.status) {
            selectedSortItem.ascending ? a.startTime - b.startTime : b.startTime - a.startTime;
          }
          const indexA = stateOrder.findIndex((state) => a.status === state);
          const indexB = stateOrder.findIndex((state) => b.status === state);
          return selectedSortItem.ascending ? indexA - indexB : indexB - indexA;
        });
        break;
    }

    return showingUserTasks;
  }, [
    statusSelectionFilter,
    priorityRangeFilter,
    progressRangeFilter,
    usersFilter,
    groupsFilter,
    selectedSortItem,
    userTasks,
  ]);

  const users = ['Max Mustermann', 'John Doe', 'Bob Smith'];

  const groups = ['Example Group A', 'Example Group B', 'Example Group C'];

  const filterDropdownItems: MenuProps['items'] = [
    {
      key: '1',
      type: 'group',
      label: 'Status',
      children: [
        {
          key: '1-1',
          label: (
            <StatusSelection
              selectedValues={statusSelectionFilter}
              onSelectionChange={(selectedValues) => {
                setStatusSelectionFilter(selectedValues);
              }}
            ></StatusSelection>
          ),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: '2',
      type: 'group',
      label: 'Priority',
      children: [
        {
          key: '2-1',
          label: (
            <SliderRangeWithText
              min={1}
              max={10}
              selectedRangeValues={priorityRangeFilter}
              onRangeChange={(selectedRangeValues) => {
                setPriorityRangeFilter(selectedRangeValues);
              }}
            />
          ),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      type: 'group',
      label: 'Progress',
      children: [
        {
          key: '3-1',
          label: (
            <SliderRangeWithText
              selectedRangeValues={progressRangeFilter}
              onRangeChange={(selectedRangeValues) => {
                setProgressRangeFilter(selectedRangeValues);
              }}
            />
          ),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: '4',
      type: 'group',
      label: 'Users',
      children: [
        {
          key: '4-1',
          label: (
            <Select
              mode="multiple"
              allowClear
              placeholder="Select User(s)"
              maxTagCount={5}
              options={users.map((user) => ({ label: user, value: user }))}
              value={usersFilter}
              style={{ width: '100%' }}
              onChange={(_, selectedUsers) => {
                setUsersFilter(
                  (selectedUsers as { label: string; value: string }[]).map((user) => user.value),
                );
              }}
            ></Select>
          ),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: '5',
      type: 'group',
      label: 'Groups',
      children: [
        {
          key: '5-1',
          label: (
            <Select
              mode="multiple"
              allowClear
              placeholder="Select Group(s)"
              maxTagCount={5}
              options={groups.map((group) => ({ label: group, value: group }))}
              value={groupsFilter}
              style={{ width: '100%' }}
              onChange={(_, selectedGroups) => {
                setGroupsFilter(
                  (selectedGroups as { label: string; value: string }[]).map(
                    (group) => group.value,
                  ),
                );
              }}
            ></Select>
          ),
        },
      ],
    },
  ];

  const sortValues = ['startTime', 'deadline', 'progress', 'priority', 'state'];

  const sortDropdownItems: MenuProps['items'] = sortValues.map((sortValue, index) => {
    return {
      key: index,
      label: (
        <div
          style={{ display: 'flex', alignItems: 'center' }}
          onClick={() => {
            if (selectedSortItem.value === sortValue) {
              setSelectedSortItem({ ascending: !selectedSortItem.ascending, value: sortValue });
            } else {
              setSelectedSortItem({ ascending: true, value: sortValue });
            }
          }}
        >
          <span style={{ marginRight: '0.25rem' }}>{sortValue}</span>
          {selectedSortItem.value === sortValue && selectedSortItem.ascending && (
            <FaLongArrowAltUp></FaLongArrowAltUp>
          )}
          {selectedSortItem.value === sortValue && !selectedSortItem.ascending && (
            <FaLongArrowAltDown></FaLongArrowAltDown>
          )}
        </div>
      ),
    };
  });

  return (
    <div className={styles.Tasklist}>
      <div className={selectedUserTaskID !== null ? `${styles.list} selected` : styles.list}>
        <div className={styles.actionWrapper}>
          {selectedUserTaskID && !breakpoint.xl ? (
            <Button
              className={styles.backButton}
              icon={<IoArrowBack></IoArrowBack>}
              onClick={() => {
                setSelectedUserTaskID(null);
              }}
            ></Button>
          ) : (
            <Space.Compact className={styles.dropdownWrapper}>
              <Dropdown
                open={filterDropdownOpen}
                onOpenChange={(nextOpen: boolean, info: { source: string }) => {
                  if (info.source === 'trigger' || nextOpen) {
                    setFilterDropdownOpen(nextOpen);
                  }
                }}
                autoFocus
                trigger={['click']}
                menu={{ items: filterDropdownItems }}
                overlayStyle={{ width: '18rem' }}
              >
                <Button>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaFilter style={{ marginRight: '0.25rem' }}> </FaFilter>
                    {breakpoint.sm && <span>Filter Tasks</span>}
                  </div>
                </Button>
              </Dropdown>
              <Dropdown
                open={sortDropdownOpen}
                onOpenChange={(nextOpen: boolean, info: { source: string }) => {
                  if (info.source === 'trigger' || nextOpen) {
                    setSortDropdownOpen(nextOpen);
                  }
                }}
                autoFocus
                trigger={['click']}
                menu={{ items: sortDropdownItems }}
              >
                <Button>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaSort style={{ marginRight: '0.25rem' }}> </FaSort>
                    {breakpoint.sm && <span>Sort Tasks</span>}
                  </div>
                </Button>
              </Dropdown>
            </Space.Compact>
          )}
        </div>
        <div className={styles.cardWrapper}>
          {selectedUserTaskID !== null && !breakpoint.xl ? (
            <div style={{ minWidth: '300px', maxWidth: '600px', margin: 'auto' }}>
              <div style={{ marginInline: '1rem' }}>
                <UserTaskCard
                  userTaskData={
                    filteredAndSortedUserTasks.find((uT) => uT.id === selectedUserTaskID)!
                  }
                ></UserTaskCard>
              </div>
            </div>
          ) : (
            <ScrollBar>
              <List
                split={false}
                style={{ maxWidth: breakpoint.xl ? '300px' : undefined }}
                bordered={false}
                dataSource={filteredAndSortedUserTasks}
                pagination={{
                  size: 'small',
                  position: 'bottom',
                  align: 'center',
                  responsive: true,
                  pageSize: 20,
                  showSizeChanger: false,
                }}
              >
                <div className={styles.cardList}>
                  {filteredAndSortedUserTasks.map((item) => {
                    return (
                      <UserTaskCard
                        key={item.id}
                        userTaskData={filteredAndSortedUserTasks.find((uT) => uT.id === item.id)!}
                        selected={item.id === selectedUserTaskID}
                        clickHandler={() => {
                          if (selectedUserTaskID === item.id) {
                            setSelectedUserTaskID(null);
                          } else {
                            setSelectedUserTaskID(item.id);
                          }
                        }}
                      ></UserTaskCard>
                    );
                  })}
                </div>
              </List>
            </ScrollBar>
          )}
        </div>
      </div>
      {(selectedUserTaskID ?? breakpoint.xl) && (
        <div className={styles.taskView}>
          {selectedUserTaskID ?? (
            <iframe
              srcDoc={userTaskHTML}
              style={{ width: '100%', height: '100%', border: 0 }}
            ></iframe>
          )}
        </div>
      )}
    </div>
  );
};

export default Tasklist;
