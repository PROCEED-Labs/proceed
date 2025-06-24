'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modeler from 'bpmn-js/lib/Modeler';
import { Button, Collapse, Card } from 'antd';
import { CloseOutlined, WarningOutlined } from '@ant-design/icons';
import { GanttChartCanvas } from '@/components/gantt-chart-canvas';
import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import useTimelineViewStore from '@/lib/use-timeline-view-store';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { useEnvironment } from '@/components/auth-can';

// Import our separated modules
import type {
  BPMNDefinitions,
  BPMNTimelineProps,
  TransformationError,
  DefaultDurationInfo,
} from './types';
import { transformBPMNToGantt } from './transform';
import { formatGanttElementForLog, formatDependencyForLog } from './utils';

const BPMNTimeline = ({ process, ...props }: BPMNTimelineProps) => {
  const bpmnjsModelerRef = useRef<Modeler | null>(null);
  const disableTimelineView = useTimelineViewStore((state) => state.disableTimelineView);
  const isUnmountingRef = useRef(false);

  const [ganttData, setGanttData] = useState<{
    elements: GanttElementType[];
    dependencies: GanttDependency[];
  }>({ elements: [], dependencies: [] });

  const [errors, setErrors] = useState<TransformationError[]>([]);
  const [defaultDurations, setDefaultDurations] = useState<DefaultDurationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTimestamp, setNowTimestamp] = useState<number>(0);
  const [ganttSettings, setGanttSettings] = useState<{
    enabled: boolean;
    positioningLogic: 'earliest-occurrence' | 'every-occurrence';
    loopDepth: number;
  }>({
    enabled: true,
    positioningLogic: 'earliest-occurrence',
    loopDepth: 1
  });
  
  const { spaceId } = useEnvironment();

  // Fetch gantt view settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getSpaceSettingsValues(spaceId, 'process-documentation');
        const ganttViewSettings = settings?.['gantt-view'];
        setGanttSettings({
          enabled: ganttViewSettings?.enabled ?? true,
          positioningLogic: ganttViewSettings?.['positioning-logic'] ?? 'earliest-occurrence',
          loopDepth: ganttViewSettings?.['loop-depth'] ?? 1
        });
      } catch (error) {
        console.error('Failed to fetch gantt view settings:', error);
        setGanttSettings({
          enabled: true,
          positioningLogic: 'earliest-occurrence',
          loopDepth: 1
        });
      }
    };
    
    fetchSettings();
  }, [spaceId]);

  useEffect(() => {
    // Reset unmounting flag when component mounts/re-mounts
    isUnmountingRef.current = false;
    
    const bpmnjsModeler = new Modeler();
    bpmnjsModelerRef.current = bpmnjsModeler;

    bpmnjsModeler
      .importXML(process.bpmn)
      .then(() => {
        const definitions = bpmnjsModeler.getDefinitions() as BPMNDefinitions;

        // Use a single timestamp for both transformation and red line marker
        const transformationTimestamp = Date.now();
        setNowTimestamp(transformationTimestamp);

        const transformationResult = transformBPMNToGantt(definitions, transformationTimestamp, ganttSettings.positioningLogic, ganttSettings.loopDepth);

        // Calculate total elements in the process (excluding sequence flows)
        const flowElements = definitions.rootElements?.[0]?.flowElements || [];
        const totalElementCount = flowElements.filter(
          (element) => element.$type !== 'bpmn:SequenceFlow',
        ).length;

        setGanttData({
          elements: transformationResult.elements,
          dependencies: transformationResult.dependencies,
        });
        setErrors(transformationResult.errors);
        setDefaultDurations(transformationResult.defaultDurations);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to import BPMN:', error);
        setErrors([
          {
            elementId: 'import',
            elementType: 'BPMN',
            reason: 'Failed to import BPMN XML',
          },
        ]);
        setIsLoading(false);
      });

    return () => {
      // Mark that we're in the cleanup phase
      isUnmountingRef.current = true;
    };
  }, [process.bpmn, disableTimelineView, ganttSettings.positioningLogic, ganttSettings.loopDepth]);

  // Handle component unmount separately from BPMN changes
  useEffect(() => {
    return () => {
      // Use a timeout to ensure this runs after React's cleanup
      // Only disable timeline view if we're truly unmounting (not just re-rendering)
      setTimeout(() => {
        if (isUnmountingRef.current) {
          disableTimelineView();
        }
      }, 0);
    };
  }, [disableTimelineView]);

  const headerTitle = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
          BPMN Timeline View
        </div>
        <div style={{ fontSize: '14px', color: '#666', fontWeight: 400 }}>
          {isLoading && 'Loading...'}
          {!isLoading && (
            <div>
              Mode: {ganttSettings.positioningLogic === 'every-occurrence' ? 'Every Occurrence' : 'Earliest Occurrence'}
            </div>
          )}
        </div>
      </div>
      <Button
        onClick={() => {
          disableTimelineView();
          // Use history to remove the hash while preserving the current URL
          const currentUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', currentUrl);
        }}
        title="Return to BPMN editor view"
      >
        Back to BPMN
      </Button>
    </div>
  );

  return (
    <div
      style={{
        padding: '10px',
        height: '100%',
        minHeight: '400px',
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Card
        {...props}
        title={headerTitle}
        style={{
          height: '100%',
          boxShadow:
            '0px 0px 1px 0px rgba(0, 0, 0, 0.17), 0px 0px 3px 0px rgba(0, 0, 0, 0.08), 0px 7px 14px 0px rgba(0, 0, 0, 0.05)',
          borderRadius: '8px',
          border: 'none',
          ...props.style,
        }}
        styles={{
          body: {
            padding: 0,
            height: 'calc(100% - 80px)', // Account for header
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Error Report */}
        {errors.length > 0 && (
          <div
            style={{
              margin: '16px 16px 0',
              flexShrink: 0,
            }}
          >
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'errors',
                  label: (
                    <div style={{ color: '#f57c00', fontWeight: 600 }}>
                      <WarningOutlined style={{ marginRight: '8px' }} />
                      Unsupported Elements ({errors.length})
                    </div>
                  ),
                  children: (
                    <div
                      style={{
                        padding: '12px',
                        border: '1px solid #ff9800',
                        borderRadius: '6px',
                        backgroundColor: '#fff3e0',
                        marginTop: '8px',
                      }}
                    >
                      <div style={{ fontSize: '13px', marginBottom: '8px', color: '#666' }}>
                        The following elements could not be interpreted and are excluded from the
                        timeline:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                        {errors.map((error, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>
                            <strong>{error.elementName || error.elementId}</strong> (
                            {error.elementType}): {error.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                },
              ]}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
              }}
            />
          </div>
        )}

        {/* Default Duration Information */}
        {defaultDurations.length > 0 && (
          <div
            style={{
              margin: '16px',
              marginTop: errors.length > 0 ? '0' : '16px',
              flexShrink: 0,
            }}
          >
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'defaultDurations',
                  label: (
                    <div style={{ color: '#1976d2', fontWeight: 600 }}>
                      <span style={{ marginRight: '8px' }}>ℹ️</span>
                      Tasks with Default Duration ({defaultDurations.length})
                    </div>
                  ),
                  children: (
                    <div
                      style={{
                        padding: '12px',
                        border: '1px solid #1976d2',
                        borderRadius: '6px',
                        backgroundColor: '#e3f2fd',
                        marginTop: '8px',
                      }}
                    >
                      <div style={{ fontSize: '13px', marginBottom: '8px', color: '#666' }}>
                        The following tasks did not have explicit durations and received the default
                        value of 1 hour:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                        {defaultDurations.map((item, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>
                            <strong>{item.elementName || item.elementId}</strong> (
                            {item.elementType}): 1 hour
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                },
              ]}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
              }}
            />
          </div>
        )}

        {/* Gantt Chart */}
        {!isLoading && ganttData.elements.length > 0 && (
          <div style={{ flex: 1, overflow: 'hidden', minHeight: '400px' }}>
            <GanttChartCanvas
              elements={ganttData.elements}
              dependencies={ganttData.dependencies}
              currentDateMarkerTime={nowTimestamp}
              showInstanceColumn={ganttSettings.positioningLogic === 'every-occurrence'}
              options={{
                showControls: true,
                autoFitToData: true,
                autoFitPadding: 0.1,
              }}
            />
          </div>
        )}

        {/* No data message */}
        {!isLoading && ganttData.elements.length === 0 && errors.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666', flex: 1 }}>
            No supported elements found in the BPMN process.
          </div>
        )}
      </Card>
    </div>
  );
};

export default BPMNTimeline;
