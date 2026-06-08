'use client';

import { Button } from 'antd';
import {
  FileOutlined,
  ClockCircleOutlined,
  ShareAltOutlined,
  FolderOutlined,
  EditOutlined,
  RocketOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useMemo, useRef, useState, useEffect } from 'react';
import type { ProcessMetadata } from '@/lib/data/process-schema';
import type { Folder } from '@/lib/data/folder-schema';
import { processUnchangedFromBasedOnVersion } from '@/lib/data/processes';
import AnalyticsCard from '@/components/analytics-card';
import styles from './analytics.module.css';
import { useQuery } from '@tanstack/react-query';

export type AnalyticsItem = ProcessMetadata | (Folder & { type: 'folder' });

interface ProcessAnalyticsCardsProps {
  folderContents: AnalyticsItem[];
  allProcesses: AnalyticsItem[];
  isRootFolder?: boolean;
  spaceId: string;
}

interface AnalyticsData {
  processesInFolder: number;
  releasedInFolder: number;
  draftsInFolder: number;
  unversionedInFolder: number;
  recentlyEditedInFolder: number;
  sharedInFolder: number;
  executableInFolder: number;
  totalFolders: number;
  foldersInCurrentLevel: number;
}

async function calculateNeedsRelease(
  processesInFolder: ProcessMetadata[],
  spaceId: string,
): Promise<number> {
  let count = 0;

  for (const p of processesInFolder) {
    // increament for drafts
    if (!p.versions || p.versions.length === 0) {
      count++;
      continue;
    }

    // For released processes, check if they have unreleased changes
    const result = await processUnchangedFromBasedOnVersion(p.id, spaceId);
    if (result === undefined) {
      count++;
    }
  }

  return count;
}

const ProcessAnalyticsCards = ({
  folderContents,
  allProcesses,
  isRootFolder = true,
  spaceId,
}: ProcessAnalyticsCardsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      // Show left button if scrolled right (more than 5px)
      setShowLeftButton(scrollLeft > 5);

      // Show right button if not at the end (more than 5px from end)
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const allProcessesGlobal = useMemo(
    () => allProcesses.filter((item) => item.type === 'process') as ProcessMetadata[],
    [allProcesses],
  );

  const processesInFolder = useMemo(
    () =>
      isRootFolder
        ? allProcessesGlobal
        : (folderContents.filter((item) => item.type === 'process') as ProcessMetadata[]),
    [folderContents, allProcessesGlobal, isRootFolder],
  );

  const { data: unversionedCount = 0, isLoading: isUnversionedLoading } = useQuery({
    queryKey: ['needsRelease', processesInFolder, spaceId],
    queryFn: () => calculateNeedsRelease(processesInFolder, spaceId),
    enabled: processesInFolder.length > 0 && !!spaceId,
  });

  useEffect(() => {
    // Check buttons on mount and when items change
    checkScrollButtons();

    // Add scroll listener
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollButtons);

      // Also check on window resize
      window.addEventListener('resize', checkScrollButtons);

      return () => {
        scrollElement.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [folderContents]);

  const analytics: AnalyticsData = useMemo(() => {
    // Count all folders from allProcesses
    const allFoldersGlobal = allProcesses.filter((item) => item.type === 'folder');
    // Count all folders on current level
    const foldersInCurrent = folderContents.filter((item) => item.type === 'folder');

    const processesInFolderCount = processesInFolder.length;

    const releasedInFolder = processesInFolder.filter(
      (p) => p.versions && p.versions.length > 0,
    ).length;

    const draftsInFolder = processesInFolderCount - releasedInFolder;
    const sharedInFolder = processesInFolder.filter(
      (p) => p.shareTimestamp && p.shareTimestamp > 0,
    ).length;
    const executableInFolder = processesInFolder.filter((p) => p.executable).length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyEditedInFolder = processesInFolder.filter(
      (p) => p.lastEditedOn && new Date(p.lastEditedOn) > sevenDaysAgo,
    ).length;

    return {
      processesInFolder: processesInFolderCount,
      releasedInFolder,
      draftsInFolder,
      unversionedInFolder: unversionedCount,
      recentlyEditedInFolder,
      sharedInFolder,
      executableInFolder,
      totalFolders: allFoldersGlobal.length,
      foldersInCurrentLevel: foldersInCurrent.length,
    };
  }, [unversionedCount, processesInFolder, allProcesses, folderContents]);
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 350;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div style={{ marginBottom: '24px', position: 'relative' }}>
      {/* Left Scroll Button */}
      {showLeftButton && (
        <Button
          icon={<LeftOutlined />}
          onClick={() => scroll('left')}
          size="middle"
          type="default"
          className={`${styles.scrollButton} ${styles.scrollButtonLeft}`}
        />
      )}

      {/* Right Scroll Button */}
      {showRightButton && (
        <Button
          icon={<RightOutlined />}
          onClick={() => scroll('right')}
          size="middle"
          type="default"
          className={`${styles.scrollButton} ${styles.scrollButtonRight}`}
        />
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d9d9d9 #f0f0f0',
        }}
      >
        {/* Total Processes Card */}
        <AnalyticsCard
          title="Total Processes"
          icon={<FileOutlined />}
          mainValue={analytics.processesInFolder}
          showProgress={true}
          progressPercent={100}
          successPercent={
            analytics.processesInFolder > 0
              ? (analytics.releasedInFolder / analytics.processesInFolder) * 100
              : 0
          }
          legend={[
            {
              label: 'Released',
              value: analytics.releasedInFolder,
              tooltip: 'Processes that have at least one released version and are ready for use',
            },
            {
              label: 'Drafts',
              value: analytics.draftsInFolder,
              tooltip: 'Processes that have never been released (no versions created yet)',
            },
          ]}
          subtitle={isRootFolder ? 'Across all folders' : 'In this folder'}
        />

        {/* Executable Card */}
        <AnalyticsCard
          title="Executable"
          icon={<RocketOutlined />}
          mainValue={analytics.executableInFolder}
          secondaryValue={analytics.processesInFolder}
          showProgress={true}
          progressPercent={
            analytics.processesInFolder > 0
              ? (analytics.executableInFolder / analytics.processesInFolder) * 100
              : 0
          }
          subtitle={isRootFolder ? 'Ready for Automation' : 'Ready for Automation (In this folder)'}
        />

        {/* Needs Release Card */}
        <AnalyticsCard
          title="Needs Release"
          icon={<EditOutlined />}
          mainValue={analytics.unversionedInFolder}
          tooltip="Processes that need to be released. Includes drafts (never released) and released processes with unreleased changes."
          subtitle={
            isRootFolder
              ? 'Number of updated Processes that need release'
              : 'Number of updated Processes that need release (In this folder)'
          }
        />

        {/* Folders Card */}
        <AnalyticsCard
          title={isRootFolder ? 'Folders' : 'Folders in This Level'}
          icon={<FolderOutlined />}
          mainValue={isRootFolder ? analytics.totalFolders : analytics.foldersInCurrentLevel}
          subtitle={
            isRootFolder
              ? 'Number of accessible Folders and Subfolders'
              : 'Number of accessible Subfolders (In this folder)'
          }
        />

        {/* Recent Activity Card */}
        <AnalyticsCard
          title="Recent Activity"
          icon={<ClockCircleOutlined />}
          mainValue={analytics.recentlyEditedInFolder}
          secondaryValue={!isRootFolder ? analytics.processesInFolder : undefined}
          subtitle={
            isRootFolder
              ? 'Number of processes edited in the last 7 days'
              : 'Number of processes edited in the last 7 days (In this folder)'
          }
        />

        {/* Shared Card */}
        <AnalyticsCard
          title="Shared"
          icon={<ShareAltOutlined />}
          mainValue={analytics.sharedInFolder}
          secondaryValue={!isRootFolder ? analytics.processesInFolder : undefined}
          subtitle={
            isRootFolder
              ? 'Number of public or shared processes'
              : 'Number of public or shared processes (In this folder)'
          }
        />
      </div>
    </div>
  );
};

export default ProcessAnalyticsCards;
