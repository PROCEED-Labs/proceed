'use client';

import { Card, Typography, Tooltip, Progress, Button } from 'antd';
import {
  FileOutlined,
  ClockCircleOutlined,
  ShareAltOutlined,
  QuestionCircleOutlined,
  FolderOutlined,
  EditOutlined,
  RocketOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useMemo, useRef, useState, useEffect } from 'react';
import type { ProcessMetadata } from '@/lib/data/process-schema';
import type { Folder } from '@/lib/data/folder-schema';

const { Text } = Typography;

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

    // Count processes modified MORE THAN 2 MINUTES after last version
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
        <Card
          bordered={false}
          style={{
            width: '280px',
            minWidth: '280px',
            flexShrink: 0,
            boxShadow:
              '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>
              Total Processes
            </Text>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#1890ff', fontSize: '24px' }}>
                <FileOutlined />
              </div>
              <span style={{ color: '#1890ff', fontSize: '32px', fontWeight: 600, lineHeight: 1 }}>
                {isRootFolder ? analytics.totalProcessesGlobal : analytics.processesInFolder}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <Progress
              percent={100}
              success={{
                percent:
                  analytics.processesInFolder > 0
                    ? (analytics.releasedInFolder / analytics.processesInFolder) * 100
                    : 0,
                strokeColor: '#13c2c2',
              }}
              strokeColor="#eb2f96"
              trailColor="#f0f0f0"
              showInfo={false}
              strokeWidth={8}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: '#13c2c2',
                }}
              />
              <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                Released: {analytics.releasedInFolder}
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: '#eb2f96',
                }}
              />
              <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                Drafts: {analytics.draftsInFolder}
              </Text>
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>
              {isRootFolder ? 'Across all folders' : 'In this folder'}
            </Text>
          </div>
        </Card>

        {/* Executable Card */}
        <Card
          bordered={false}
          style={{
            width: '280px',
            minWidth: '280px',
            flexShrink: 0,
            boxShadow:
              '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Executable</Text>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#7cb305', fontSize: '24px' }}>
                <RocketOutlined />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{ color: '#7cb305', fontSize: '32px', fontWeight: 600, lineHeight: 1 }}
                >
                  {analytics.executableInFolder}
                </span>
                <span style={{ color: '#bfbfbf', fontSize: '20px', fontWeight: 400 }}>
                  / {analytics.processesInFolder}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Progress
              percent={
                analytics.processesInFolder > 0
                  ? (analytics.executableInFolder / analytics.processesInFolder) * 100
                  : 0
              }
              strokeColor="#7cb305"
              trailColor="#f0f0f0"
              showInfo={false}
              strokeWidth={8}
            />
          </div>

          <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>
            {isRootFolder ? 'Ready for execution' : 'In this folder'}
          </Text>
        </Card>

        {/* Needs Release Card */}
        <Card
          bordered={false}
          style={{
            width: '280px',
            minWidth: '280px',
            flexShrink: 0,
            boxShadow:
              '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>
              Needs Release
            </Text>
            <Tooltip title="Processes with unreleased changes. They were modified after their last version was created.">
              <QuestionCircleOutlined
                style={{ color: '#bfbfbf', fontSize: '14px', cursor: 'help' }}
              />
            </Tooltip>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#fa8c16', fontSize: '24px' }}>
                <EditOutlined />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{ color: '#fa8c16', fontSize: '32px', fontWeight: 600, lineHeight: 1 }}
                >
                  {analytics.unversionedInFolder}
                </span>
                <span style={{ color: '#bfbfbf', fontSize: '20px', fontWeight: 400 }}>
                  / {analytics.releasedInFolder}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Progress
              percent={
                analytics.releasedInFolder > 0
                  ? (analytics.unversionedInFolder / analytics.releasedInFolder) * 100
                  : 0
              }
              strokeColor="#fa8c16"
              trailColor="#f0f0f0"
              showInfo={false}
              strokeWidth={8}
            />
          </div>

          <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>
            {isRootFolder ? 'With unreleased changes' : 'In this folder'}
          </Text>
        </Card>

        {/* Folders Card */}
        <Card
          bordered={false}
          style={{
            width: '280px',
            minWidth: '280px',
            flexShrink: 0,
            boxShadow:
              '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>
              {isRootFolder ? 'Folders' : 'In This Folder'}
            </Text>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#52c41a', fontSize: '24px' }}>
                <FolderOutlined />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{ color: '#52c41a', fontSize: '32px', fontWeight: 600, lineHeight: 1 }}
                >
                  {isRootFolder ? analytics.totalFolders : analytics.processesInFolder}
                </span>
                {!isRootFolder && (
                  <span style={{ color: '#bfbfbf', fontSize: '20px', fontWeight: 400 }}>
                    / {analytics.totalProcessesGlobal}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>
            {isRootFolder
              ? 'Organization structure'
              : `Out of ${analytics.totalProcessesGlobal} total`}
          </Text>
        </Card>

        {/* Recent Activity Card */}
        <Card
          bordered={false}
          style={{
            width: '280px',
            minWidth: '280px',
            flexShrink: 0,
            boxShadow:
              '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>
              Recent Activity
            </Text>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#722ed1', fontSize: '24px' }}>
                <ClockCircleOutlined />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{ color: '#722ed1', fontSize: '32px', fontWeight: 600, lineHeight: 1 }}
                >
                  {analytics.recentlyEditedInFolder}
                </span>
                {!isRootFolder && (
                  <span style={{ color: '#bfbfbf', fontSize: '20px', fontWeight: 400 }}>
                    / {analytics.processesInFolder}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>
            {isRootFolder ? 'Edited in last 7 days' : 'In this folder (7 days)'}
          </Text>
        </Card>

        {/* Shared Card */}
        <Card
          bordered={false}
          style={{
            width: '280px',
            minWidth: '280px',
            flexShrink: 0,
            boxShadow:
              '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>Shared</Text>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#096dd9', fontSize: '24px' }}>
                <ShareAltOutlined />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span
                  style={{ color: '#096dd9', fontSize: '32px', fontWeight: 600, lineHeight: 1 }}
                >
                  {analytics.sharedInFolder}
                </span>
                {!isRootFolder && (
                  <span style={{ color: '#bfbfbf', fontSize: '20px', fontWeight: 400 }}>
                    / {analytics.processesInFolder}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>
            {isRootFolder ? 'Public or shared' : 'In this folder'}
          </Text>
        </Card>
      </div>
    </div>
  );
};

export default ProcessAnalyticsCards;
