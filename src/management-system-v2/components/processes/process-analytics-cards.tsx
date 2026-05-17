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
import AnalyticsCard from '../process-analytics-card';

export type AnalyticsItem = ProcessMetadata | (Folder & { type: 'folder' });

interface ProcessAnalyticsCardsProps {
  items: AnalyticsItem[];
  allProcesses: AnalyticsItem[];
  isRootFolder?: boolean;
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
  totalProcessesGlobal: number;
}

const ProcessAnalyticsCards = ({
  items,
  allProcesses,
  isRootFolder = true,
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

    // Count processes modified more than 2 minutes after last version
    const unversionedInFolder = processesInFolder.filter((p) => {
      if (!p.versions || p.versions.length === 0) {
        return false;
      }

      const latestVersionDate = p.versions.reduce((latest, version) => {
        const versionDate = new Date(version.createdOn);
        return versionDate > latest ? versionDate : latest;
      }, new Date(0));

      if (p.lastEditedOn) {
        const lastEditDate = new Date(p.lastEditedOn);
        const timeDiffInMinutes =
          (lastEditDate.getTime() - latestVersionDate.getTime()) / (1000 * 60);
        return timeDiffInMinutes > 2;
      }

      return false;
    }).length;

    return {
      processesInFolder: processesInFolderCount,
      releasedInFolder,
      draftsInFolder,
      unversionedInFolder,
      recentlyEditedInFolder,
      sharedInFolder,
      executableInFolder,
      totalFolders: foldersInCurrent.length,
      totalProcessesGlobal,
    };
  }, [items, allProcesses, isRootFolder]);

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
          gap: '16px',
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d9d9d9 #f0f0f0',
        }}
      >
        {/* Total Processes Card */}
        <AnalyticsCard
          title="Total Processes"
          icon={<FileOutlined />}
          iconColor="#1890ff"
          mainValue={isRootFolder ? analytics.totalProcessesGlobal : analytics.processesInFolder}
          showProgress={true}
          progressPercent={100}
          successPercent={
            analytics.processesInFolder > 0
              ? (analytics.releasedInFolder / analytics.processesInFolder) * 100
              : 0
          }
          successColor="#13c2c2"
          progressColor="#eb2f96"
          legend={[
            { color: '#13c2c2', label: 'Released', value: analytics.releasedInFolder },
            { color: '#eb2f96', label: 'Drafts', value: analytics.draftsInFolder },
          ]}
          subtitle={isRootFolder ? 'Across all folders' : 'In this folder'}
        />

        {/* Executable Card */}
        <AnalyticsCard
          title="Executable"
          icon={<RocketOutlined />}
          iconColor="#7cb305"
          mainValue={analytics.executableInFolder}
          secondaryValue={analytics.processesInFolder}
          showProgress={true}
          progressPercent={
            analytics.processesInFolder > 0
              ? (analytics.executableInFolder / analytics.processesInFolder) * 100
              : 0
          }
          progressColor="#7cb305"
          subtitle={isRootFolder ? 'Ready for Automation' : 'Ready for Automation (In this folder)'}
        />

        {/* Needs Release Card */}
        <AnalyticsCard
          title="Needs Release"
          icon={<EditOutlined />}
          iconColor="#fa8c16"
          mainValue={analytics.unversionedInFolder}
          secondaryValue={analytics.releasedInFolder}
          showProgress={true}
          progressPercent={
            analytics.releasedInFolder > 0
              ? (analytics.unversionedInFolder / analytics.releasedInFolder) * 100
              : 0
          }
          progressColor="#fa8c16"
          tooltip="Processes with unreleased changes. They were modified after their last version was created."
          subtitle={
            isRootFolder
              ? 'Number of Process with unreleased changes'
              : 'Number of Process with unreleased changes (In this folder)'
          }
        />

        {/* Folders Card */}
        <AnalyticsCard
          title={isRootFolder ? 'Folders' : 'In This Folder'}
          icon={<FolderOutlined />}
          iconColor="#52c41a"
          mainValue={isRootFolder ? analytics.totalFolders : analytics.processesInFolder}
          secondaryValue={!isRootFolder ? analytics.totalProcessesGlobal : undefined}
          subtitle={
            isRootFolder
              ? 'Organization structure'
              : `Out of ${analytics.totalProcessesGlobal} total`
          }
        />

        {/* Recent Activity Card */}
        <AnalyticsCard
          title="Recent Activity"
          icon={<ClockCircleOutlined />}
          iconColor="#722ed1"
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
          iconColor="#096dd9"
          mainValue={analytics.sharedInFolder}
          secondaryValue={!isRootFolder ? analytics.processesInFolder : undefined}
          subtitle={isRootFolder ? 'Public or shared' : 'Public or shared (In this folder)'}
        />
      </div>
    </div>
  );
};

export default ProcessAnalyticsCards;
