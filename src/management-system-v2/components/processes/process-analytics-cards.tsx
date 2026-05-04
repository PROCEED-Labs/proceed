'use client';

import { Card, Row, Col, Typography, Tooltip, Progress } from 'antd';
import {
  FileOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ClockCircleOutlined,
  ShareAltOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  FolderOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useMemo } from 'react';
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

    const unversionedInFolder = processesInFolder.filter((p) => {
      if (!p.versions || p.versions.length === 0) {
        return false;
      }

      const latestVersionDate = p.versions.reduce((latest, version) => {
        const versionDate = new Date(version.createdOn);
        return versionDate > latest ? versionDate : latest;
      }, new Date(0));

      if (p.lastEditedOn) {
        return new Date(p.lastEditedOn) > latestVersionDate;
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

  const StatCard = ({
    title,
    value,
    total,
    icon,
    color,
    subtitle,
    showProgress = false,
    tooltip,
  }: {
    title: string;
    value: number;
    total?: number;
    icon: React.ReactNode;
    color: string;
    subtitle: string;
    showProgress?: boolean;
    tooltip?: string;
  }) => (
    <Card
      bordered={false}
      style={{
        height: '100%',
        boxShadow:
          '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
      }}
      bodyStyle={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Title */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Text style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>{title}</Text>
          {tooltip && (
            <Tooltip title={tooltip}>
              <QuestionCircleOutlined
                style={{ color: '#bfbfbf', fontSize: '14px', cursor: 'help' }}
              />
            </Tooltip>
          )}
        </div>

        {/* Value */}
        <div style={{ marginBottom: showProgress ? '12px' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color, fontSize: '24px' }}>{icon}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ color, fontSize: '32px', fontWeight: 600, lineHeight: '1' }}>
                {value}
              </span>
              {total !== undefined && (
                <span style={{ color: '#bfbfbf', fontSize: '20px', fontWeight: 400 }}>
                  / {total}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && total !== undefined && total > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <Progress
              percent={(value / total) * 100}
              strokeColor={color}
              trailColor="#f0f0f0"
              showInfo={false}
              strokeWidth={8}
            />
          </div>
        )}

        {/* Subtitle */}
        <div style={{ marginTop: 'auto' }}>
          <Text style={{ color: '#bfbfbf', fontSize: '13px' }}>{subtitle}</Text>
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ marginBottom: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* Total Processes */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <StatCard
            title="Total Processes"
            value={analytics.totalProcessesGlobal}
            icon={<FileOutlined />}
            color="#1890ff"
            subtitle="Across all folders"
          />
        </Col>

        {/* Folders or In This Folder */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          {isRootFolder ? (
            <StatCard
              title="Folders"
              value={analytics.totalFolders}
              icon={<FolderOutlined />}
              color="#c4a81aff"
              subtitle="Organization structure"
            />
          ) : (
            <StatCard
              title="In This Folder"
              value={analytics.processesInFolder}
              total={analytics.totalProcessesGlobal}
              icon={<FolderOutlined />}
              color="#52c41a"
              subtitle={`Out of ${analytics.totalProcessesGlobal} total`}
            />
          )}
        </Col>

        {/* Recent Activity */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <StatCard
            title="Recent Activity"
            value={analytics.recentlyEditedInFolder}
            total={!isRootFolder ? analytics.processesInFolder : undefined}
            icon={<ClockCircleOutlined />}
            color="#722ed1"
            subtitle={isRootFolder ? 'Edited in last 7 days' : 'In this folder (7 days)'}
          />
        </Col>

        {/* Shared */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <StatCard
            title="Shared"
            value={analytics.sharedInFolder}
            total={!isRootFolder ? analytics.processesInFolder : undefined}
            icon={<ShareAltOutlined />}
            color="#096dd9"
            subtitle={isRootFolder ? 'Public or shared' : 'In this folder'}
          />
        </Col>

        {/* Released */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <StatCard
            title="Released"
            value={analytics.releasedInFolder}
            total={analytics.processesInFolder}
            icon={<CheckCircleOutlined />}
            color="#13c2c2"
            subtitle={isRootFolder ? 'With at least one version' : 'In this folder'}
            showProgress={true}
          />
        </Col>

        {/* Unversioned */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <StatCard
            title="Unversioned"
            value={analytics.unversionedInFolder}
            total={analytics.processesInFolder}
            icon={<EditOutlined />}
            color="#fa8c16"
            subtitle={isRootFolder ? 'Modified after last release' : 'In this folder'}
            showProgress={true}
            tooltip="Processes modified since their last version was created. These changes are not yet released."
          />
        </Col>

        {/* Drafts */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <StatCard
            title="Drafts"
            value={analytics.draftsInFolder}
            total={analytics.processesInFolder}
            icon={<FileTextOutlined />}
            color="#eb2f2fff"
            subtitle={isRootFolder ? 'No versions created yet' : 'In this folder'}
            showProgress={true}
          />
        </Col>

        {/* Executable */}
        <Col xs={24} sm={12} lg={8} xl={6}>
          <StatCard
            title="Executable"
            value={analytics.executableInFolder}
            total={analytics.processesInFolder}
            icon={<RocketOutlined />}
            color="#7cb305"
            subtitle={isRootFolder ? 'Ready for execution' : 'In this folder'}
            showProgress={true}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ProcessAnalyticsCards;
