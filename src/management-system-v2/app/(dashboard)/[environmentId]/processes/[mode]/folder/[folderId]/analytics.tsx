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
import AnalyticsCard from '@/components/analytics-card';
import { processUnchangedFromBasedOnVersion } from '@/lib/data/processes';

export type AnalyticsItem = ProcessMetadata | (Folder & { type: 'folder' });

interface ProcessAnalyticsCardsProps {
  items: AnalyticsItem[];
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
  totalProcessesGlobal: number;
}

const ProcessAnalyticsCards = ({
  items,
  allProcesses,
  isRootFolder = true,
  spaceId,
}: ProcessAnalyticsCardsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);
  const [unversionedCount, setUnversionedCount] = useState(0);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      // Show left button if scrolled right (more than 5px)
      setShowLeftButton(scrollLeft > 5);

      // Show right button if not at the end (more than 5px from end)
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  // Calculate processes that need release (drafts + released with changes)
  useEffect(() => {
    const calculateUnversioned = async () => {
      const allProcessesGlobal = allProcesses.filter(
        (item) => item.type === 'process',
      ) as ProcessMetadata[];

      const processesInFolder = isRootFolder
        ? allProcessesGlobal
        : (items.filter((item) => item.type === 'process') as ProcessMetadata[]);

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

      setUnversionedCount(count);
    };

    calculateUnversioned();
  }, [items, allProcesses, isRootFolder, spaceId]);

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
  }, [items]);

  const analytics: AnalyticsData = useMemo(() => {
    const allProcessesGlobal = allProcesses.filter(
      (item) => item.type === 'process',
    ) as ProcessMetadata[];

    const processesInFolder = isRootFolder
      ? allProcessesGlobal
      : (items.filter((item) => item.type === 'process') as ProcessMetadata[]);

    // Count all folders from allProcesses
    const allFoldersGlobal = allProcesses.filter((item) => item.type === 'folder');
    // Count all folders on current level
    const foldersInCurrent = items.filter((item) => item.type === 'folder');

    const processesInFolderCount = processesInFolder.length;
    const totalProcessesGlobal = allProcessesGlobal.length;

    const releasedInFolder = processesInFolder.filter(
      (p) => p.versions && p.versions.length > 0,
    ).length;

    const draftsInFolder = processesInFolderCount - releasedInFolder;
    const sharedInFolder = processesInFolder.filter((p) => p.sharedAs !== 'protected').length;
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
      totalProcessesGlobal,
    };
  }, [items, allProcesses, isRootFolder, unversionedCount]);

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
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        />
      )}

      {/* Right Scroll Button */}
      {showRightButton && (
        <Button
          icon={<RightOutlined />}
          onClick={() => scroll('right')}
          size="middle"
          type="default"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
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
          mainValue={isRootFolder ? analytics.totalProcessesGlobal : analytics.processesInFolder}
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
