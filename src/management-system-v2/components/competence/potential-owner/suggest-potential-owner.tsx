// Component for suggesting potential owners based on competence matching
import { FC, useState, useEffect } from 'react';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { Button, Descriptions, DescriptionsProps, Modal, Alert, Typography, Steps } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { LuInfo } from 'react-icons/lu';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import ProceedLoadingIndicator from '@/components/loading-proceed';
import {
  createCompetenceList,
  createMatching,
  transformMatchResults,
  getAllCompetencesMap,
  type TaskContextData,
  type RankedUser,
} from '../actions/fetch-matches';
import { useParams } from 'next/navigation';
import RankedUserList from './ranked-user-list';
import { useBPMNResources } from './potential-owner';
import { Shape } from 'bpmn-js/lib/model/Types';
import { debugLog } from '../utils/debug';

type SuggestPotentialOwnerProps = {
  selectedElement: ElementLike;
  modeler: BPMNCanvasRef | null;
};

// Cache key format: `competenceList_${environmentId}_${timestamp}`
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Extracts plain data from BPMN element for server action
 * as Server-Actions can't accept complex objects with prototypes
 */
function extractTaskContext(selectedElement: ElementLike): TaskContextData {
  return {
    processName: selectedElement?.businessObject?.$parent?.$parent?.name || 'Unnamed Process',
    processDescription: selectedElement?.businessObject?.$parent?.documentation?.[0]?.text || '',
    taskName: selectedElement?.businessObject?.name || 'Unnamed Task',
    taskDescription: selectedElement?.businessObject?.documentation?.[0]?.text || '',
  };
}

/**
 * Cached matching results structure
 */
type CachedMatchResult = {
  rankedUsers: RankedUser[];
  competenceListId: string;
  timestamp: number;
  taskContext: TaskContextData; // Store to detect if task changed
};

function getCachedCompetenceListId(environmentId: string): string | null {
  if (typeof window === 'undefined') return null;

  const cacheKey = `competenceList_${environmentId}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (!cached) return null;

  try {
    const { competenceListId, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp < CACHE_DURATION_MS) {
      return competenceListId;
    } else {
      // Cache expired, remove it
      sessionStorage.removeItem(cacheKey);
      return null;
    }
  } catch {
    return null;
  }
}

function setCachedCompetenceListId(environmentId: string, competenceListId: string): void {
  if (typeof window === 'undefined') return;

  const cacheKey = `competenceList_${environmentId}`;
  const cacheData = {
    competenceListId,
    timestamp: Date.now(),
  };

  sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
}

/**
 * Get cached match results for a specific task
 */
function getCachedMatchResults(
  environmentId: string,
  taskContext: TaskContextData,
): CachedMatchResult | null {
  if (typeof window === 'undefined') return null;

  const cacheKey = `matchResults_${environmentId}_${taskContext.taskName}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (!cached) return null;

  try {
    const cachedData: CachedMatchResult = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - cachedData.timestamp < CACHE_DURATION_MS) {
      // Verify task context hasn't changed significantly
      if (
        cachedData.taskContext.taskName === taskContext.taskName &&
        cachedData.taskContext.taskDescription === taskContext.taskDescription
      ) {
        return cachedData;
      }
    }

    // Cache invalid or task changed
    sessionStorage.removeItem(cacheKey);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache match results
 */
function setCachedMatchResults(
  environmentId: string,
  taskContext: TaskContextData,
  rankedUsers: RankedUser[],
  competenceListId: string,
): void {
  if (typeof window === 'undefined') return;

  const cacheKey = `matchResults_${environmentId}_${taskContext.taskName}`;
  const cacheData: CachedMatchResult = {
    rankedUsers,
    competenceListId,
    timestamp: Date.now(),
    taskContext,
  };

  sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
}

/**
 * Clear cached match results (for refresh)
 */
function clearCachedMatchResults(environmentId: string, taskContext: TaskContextData): void {
  if (typeof window === 'undefined') return;
  const cacheKey = `matchResults_${environmentId}_${taskContext.taskName}`;
  sessionStorage.removeItem(cacheKey);
}

// Little helper function to get rid of all potential '\', '\n', '\t', etc
function createDisplayString(text: string): string {
  // remove backslashes entirely, replace newlines/tabs/etc with a single space,
  // collapse consecutive whitespace and trim
  return text
    .replace(/\\/g, '')
    .replace(/[\n\r\t\f\v]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type NotificationState = {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
} | null;

type ProgressStep = {
  title: string;
  description?: string;
  status: 'wait' | 'process' | 'finish' | 'error';
};

export const SuggestPotentialOwner: FC<SuggestPotentialOwnerProps> = ({
  selectedElement,
  modeler,
}) => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const [open, setOpen] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [notification, setNotification] = useState<NotificationState>(null);
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    {
      title: 'Building Competence List',
      description: 'Creating list of users and their competences',
      status: 'wait',
    },
    {
      title: 'Matching Task to Users',
      description: 'Analyzing which users match the task',
      status: 'wait',
    },
    { title: 'Complete', description: 'Results ready', status: 'wait' },
  ]);
  const [currentStep, setCurrentStep] = useState(0);

  // Get current performers from BPMN element
  const { user: currentPerformerPaths } = useBPMNResources(selectedElement, 'bpmn:PotentialOwner');

  // Extract user IDs from the paths (format: ['all-user', 'user|<id>'])
  const currentPerformerIds = new Set(
    currentPerformerPaths.map((path) => path[1]?.replace('user|', '')).filter(Boolean),
  );

  // Task context data
  const taskContext = extractTaskContext(selectedElement);

  const userTaskContextInfo: DescriptionsProps['items'] = [
    // Process Name
    {
      label: 'Process:',
      span: 1,
      children: createDisplayString(taskContext.processName),
    },
    // Process Description
    {
      label: 'Process Description:',
      span: 2,
      children: createDisplayString(taskContext.processDescription),
    },
    // Task Name
    {
      label: 'Task:',
      span: 1,
      children: createDisplayString(taskContext.taskName),
    },
    // Task Description
    {
      label: 'Task Description:',
      span: 2,
      children: createDisplayString(taskContext.taskDescription),
    },
  ];

  // Main matching function
  const runMatchingProcess = async (forceRefresh: boolean = false) => {
    debugLog('SuggestPotentialOwner', 'Starting matching process, forceRefresh:', forceRefresh);

    // Check for cached results first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedResults = getCachedMatchResults(environmentId, taskContext);
      if (cachedResults) {
        debugLog('SuggestPotentialOwner', 'Using cached results:', cachedResults);
        setRankedUsers(cachedResults.rankedUsers);
        setLoadingMatches(false);
        setProgressSteps([
          {
            title: 'Building Competence List',
            description: 'Creating list of users and their competences',
            status: 'finish',
          },
          {
            title: 'Matching Task to Users',
            description: 'Analyzing which users match the task',
            status: 'finish',
          },
          { title: 'Complete', description: 'Results ready (from cache)', status: 'finish' },
        ]);
        setCurrentStep(2);
        return;
      }
    } else {
      // Clear both caches when forcing refresh
      clearCachedMatchResults(environmentId, taskContext);
      // Also clear the competence list cache to get fresh competences
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`competenceList_${environmentId}`);
      }
    }

    setLoadingMatches(true);
    setNotification(null);
    setRankedUsers([]);

    // Reset progress steps
    setProgressSteps([
      {
        title: 'Building Competence List',
        description: 'Creating list of users and their competences',
        status: 'process',
      },
      {
        title: 'Matching Task to Users',
        description: 'Analyzing which users match the task',
        status: 'wait',
      },
      { title: 'Complete', description: 'Results ready', status: 'wait' },
    ]);
    setCurrentStep(0);

    try {
      // Check for cached competence list (unless forcing refresh)
      const cachedListId = forceRefresh ? null : getCachedCompetenceListId(environmentId);
      debugLog('SuggestPotentialOwner', 'Cached competence list ID:', cachedListId);

      let competenceListId: string;

      // Step 1: Create or use cached competence list
      if (cachedListId) {
        debugLog('SuggestPotentialOwner', 'Using cached competence list');
        competenceListId = cachedListId;

        // Mark step 1 as complete immediately
        setProgressSteps([
          {
            title: 'Building Competence List',
            description: 'Creating list of users and their competences',
            status: 'finish',
          },
          {
            title: 'Matching Task to Users',
            description: 'Analyzing which users match the task',
            status: 'process',
          },
          { title: 'Complete', description: 'Results ready', status: 'wait' },
        ]);
        setCurrentStep(1);
      } else {
        debugLog('SuggestPotentialOwner', 'Creating new competence list...');
        const listResult = await createCompetenceList(environmentId);

        if (!listResult.success) {
          debugLog('SuggestPotentialOwner', 'Competence list creation failed:', listResult);

          // Handle specific error for no resources
          if (listResult.reason === 'no-resources') {
            setNotification({
              type: 'info',
              title: 'No Competences Available',
              message:
                'There are currently no users in this space who have claimed any competences. To use the matching feature, users need to add competences to their profiles first.',
            });
          } else {
            setNotification({
              type: 'error',
              title: 'Competence List Creation Failed',
              message: 'Failed to create the competence list. Please try again.',
            });
          }

          setProgressSteps((prev) =>
            prev.map((step, idx) => (idx === 0 ? { ...step, status: 'error' } : step)),
          );
          return;
        }

        competenceListId = listResult.competenceListId;
        debugLog('SuggestPotentialOwner', 'Competence list created:', competenceListId);

        // Cache the new competence list ID
        setCachedCompetenceListId(environmentId, competenceListId);

        // Mark step 1 as complete, move to step 2
        setProgressSteps([
          {
            title: 'Building Competence List',
            description: 'Creating list of users and their competences',
            status: 'finish',
          },
          {
            title: 'Matching Task to Users',
            description: 'Analyzing which users match the task',
            status: 'process',
          },
          { title: 'Complete', description: 'Results ready', status: 'wait' },
        ]);
        setCurrentStep(1);
      }

      // Step 2: Create matching job
      debugLog('SuggestPotentialOwner', 'Creating matching job...');
      const matchResult = await createMatching(environmentId, taskContext, competenceListId);

      if (!matchResult.success) {
        debugLog('SuggestPotentialOwner', 'Matching failed:', matchResult);
        setNotification({
          type: 'error',
          title: 'Matching Failed',
          message: 'Failed to match users to the task. Please try again.',
        });

        setProgressSteps((prev) =>
          prev.map((step, idx) => (idx === 1 ? { ...step, status: 'error' } : step)),
        );
        return;
      }

      debugLog('SuggestPotentialOwner', 'Matching succeeded!');

      // Update to step 3 (preparing results)
      setProgressSteps([
        {
          title: 'Building Competence List',
          description: 'Creating list of users and their competences',
          status: 'finish',
        },
        {
          title: 'Matching Task to Users',
          description: 'Analyzing which users match the task',
          status: 'finish',
        },
        { title: 'Complete', description: 'Preparing results...', status: 'process' },
      ]);
      setCurrentStep(2);

      debugLog('SuggestPotentialOwner', 'Fetching competences for transformation...');
      const competenceMap = await getAllCompetencesMap(environmentId);
      debugLog('SuggestPotentialOwner', 'Fetched', competenceMap.size, 'competences');

      debugLog('SuggestPotentialOwner', 'Transforming results...');
      const transformed = await transformMatchResults(
        matchResult.result,
        environmentId,
        competenceMap,
      );
      debugLog('SuggestPotentialOwner', 'Transformed results:', transformed);
      setRankedUsers(transformed);

      // Cache the results
      setCachedMatchResults(environmentId, taskContext, transformed, competenceListId);

      // Mark all steps complete
      setProgressSteps([
        {
          title: 'Building Competence List',
          description: 'Creating list of users and their competences',
          status: 'finish',
        },
        {
          title: 'Matching Task to Users',
          description: 'Analyzing which users match the task',
          status: 'finish',
        },
        { title: 'Complete', description: 'Results ready', status: 'finish' },
      ]);
      setCurrentStep(2);
    } catch (error: any) {
      debugLog('Error fetching matches:', error);

      setProgressSteps((prev) =>
        prev.map((step, idx) => (idx === currentStep ? { ...step, status: 'error' } : step)),
      );

      setNotification({
        type: 'error',
        title: 'Matching Failed',
        message: error.message || 'An unexpected error occurred',
      });
    } finally {
      setLoadingMatches(false);
    }
  };

  // Fetch matches when modal opens
  useEffect(() => {
    if (!open) return;
    runMatchingProcess();
  }, [open, environmentId, selectedElement]);

  const handleCancel = () => {
    setOpen(false);
    // Reset state when closing
    setLoadingMatches(false);
    setNotification(null);
    setRankedUsers([]);
    setProgressSteps([
      {
        title: 'Building Competence List',
        description: 'Creating list of users and their competences',
        status: 'wait',
      },
      {
        title: 'Matching Task to Users',
        description: 'Analyzing which users match the task',
        status: 'wait',
      },
      { title: 'Complete', description: 'Results ready', status: 'wait' },
    ]);
    setCurrentStep(0);
  };

  // Add a user as a performer
  const handleAddPerformer = (userId: string) => {
    if (!modeler) return;

    const modeling = modeler.getModeling();
    const factory = modeler.getFactory();
    const element = selectedElement as Shape;

    // Get current resources
    const currentResources = element.businessObject?.resources || [];
    const potentialOwnerResource = currentResources.find(
      (r: any) => r.$type === 'bpmn:PotentialOwner',
    );

    let userIds: string[] = [];
    let roleIds: string[] = [];

    // Parse existing resources
    if (potentialOwnerResource?.resourceAssignmentExpression?.expression?.body) {
      try {
        const parsed = JSON.parse(
          potentialOwnerResource.resourceAssignmentExpression.expression.body,
        );
        userIds = parsed.user || [];
        roleIds = parsed.roles || [];
      } catch {
        // Ignore parse errors
      }
    }

    // Add new user if not already present
    if (!userIds.includes(userId)) {
      userIds.push(userId);

      // Create new resource
      const expression = factory.create('bpmn:Expression', {
        body: JSON.stringify({ user: userIds, roles: roleIds }),
      });
      const resourceAssignmentExpression = factory.create('bpmn:ResourceAssignmentExpression', {
        expression,
      });
      const resource = factory.create('bpmn:PotentialOwner', {
        resourceAssignmentExpression,
      });

      // Update resources (remove old PotentialOwner, add new one)
      const newResources = currentResources.filter((r: any) => r.$type !== 'bpmn:PotentialOwner');
      newResources.push(resource);

      modeling.updateModdleProperties(element, element.businessObject, {
        resources: newResources,
      });
    }
  };

  // Remove a user as a performer
  const handleRemovePerformer = (userId: string) => {
    if (!modeler) return;

    const modeling = modeler.getModeling();
    const factory = modeler.getFactory();
    const element = selectedElement as Shape;

    // Get current resources
    const currentResources = element.businessObject?.resources || [];
    const potentialOwnerResource = currentResources.find(
      (r: any) => r.$type === 'bpmn:PotentialOwner',
    );

    if (!potentialOwnerResource) return;

    let userIds: string[] = [];
    let roleIds: string[] = [];

    // Parse existing resources
    if (potentialOwnerResource?.resourceAssignmentExpression?.expression?.body) {
      try {
        const parsed = JSON.parse(
          potentialOwnerResource.resourceAssignmentExpression.expression.body,
        );
        userIds = (parsed.user || []).filter((id: string) => id !== userId);
        roleIds = parsed.roles || [];
      } catch {
        return;
      }
    }

    // Update resources
    const newResources = currentResources.filter((r: any) => r.$type !== 'bpmn:PotentialOwner');

    // Only add back if there are still users or roles
    if (userIds.length > 0 || roleIds.length > 0) {
      const expression = factory.create('bpmn:Expression', {
        body: JSON.stringify({ user: userIds, roles: roleIds }),
      });
      const resourceAssignmentExpression = factory.create('bpmn:ResourceAssignmentExpression', {
        expression,
      });
      const resource = factory.create('bpmn:PotentialOwner', {
        resourceAssignmentExpression,
      });
      newResources.push(resource);
    }

    modeling.updateModdleProperties(element, element.businessObject, {
      resources: newResources,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <div>or</div>
      <Button
        onClick={() => setOpen(true)}
        style={{ fontSize: '0.75rem', width: '100%', borderStyle: 'dashed' }}
        icon={<LuInfo />}
      >
        <span>Get Suggestions...</span>
      </Button>

      <Modal
        title={`Generate and Find Matches for ${taskContext.taskName}`}
        width={'75%'}
        open={open}
        onOk={handleCancel}
        onCancel={handleCancel}
        centered
        footer={[
          rankedUsers.length > 0 && !loadingMatches && (
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={() => runMatchingProcess(true)}
              loading={loadingMatches}
            >
              Run Matching Again
            </Button>
          ),
          <Button key="close" onClick={handleCancel}>
            Close
          </Button>,
        ]}
      >
        {/* Modal-Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          {/* UserTask-Stats & context */}
          <Descriptions
            bordered
            column={3}
            size="small"
            title={'Overview of Context Information'}
            items={userTaskContextInfo}
          />

          {/* Notification Display (Info/Warning/Error) */}
          {notification && (
            <Alert
              message={notification.title}
              description={notification.message}
              type={notification.type}
              showIcon
              closable
              onClose={() => setNotification(null)}
            />
          )}

          {/* Loading State with Progress Steps */}
          {loadingMatches && (
            <div
              style={{
                width: '95%',
                // backgroundColor: 'red',
                // maxWidth: '60%',
                marginTop: '24px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',

                gap: '16px',
              }}
            >
              <Steps
                current={currentStep}
                items={progressSteps}
                direction="vertical"
                size="small"
                style={{
                  maxWidth: '350px',
                }}
              />
              <div
                style={{
                  width: 400,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: '24px',
                  flexDirection: 'column',
                  flex: 1,
                }}
              >
                <ProceedLoadingIndicator
                  loading={true}
                  scale="160%"
                  width={500}
                  height={200}
                  position={{ y: 20 }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                }}
              >
                {/* Empty html symbol: */}
                &nbsp;
              </div>
            </div>
          )}

          {/* Results Display */}
          {!loadingMatches && !notification && rankedUsers.length > 0 && (
            <RankedUserList
              rankedUsers={rankedUsers}
              currentPerformers={currentPerformerIds}
              onAddPerformer={handleAddPerformer}
              onRemovePerformer={handleRemovePerformer}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SuggestPotentialOwner;
