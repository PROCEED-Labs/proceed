import { FC, useState, useMemo } from 'react';
import { Collapse, Badge, Button, Typography, Space, Tag, Divider, Tooltip, Switch } from 'antd';
import type { CollapseProps } from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  MinusOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { RankedUser, CompetenceMatch } from '../actions/fetch-matches';
import { isOverallCompetence } from '../utils/competence-helpers';
import { getScoreColor } from '../utils/score-helpers';

const { Text, Paragraph } = Typography;

type RankedUserListProps = {
  rankedUsers: RankedUser[];
  currentPerformers: Set<string>; // Set of user IDs who are already performers
  onAddPerformer: (userId: string) => void;
  onRemovePerformer: (userId: string) => void;
};

const CompetenceMatchItem: FC<{
  competence: CompetenceMatch;
  rank: number;
  useBestFit: boolean;
}> = ({ competence, rank, useBestFit }) => {
  const displayScore = useBestFit ? competence.bestFitScore : competence.score;
  const scoreColor = getScoreColor(displayScore);
  const isContradicting = competence.alignment === 'contradicting';
  const isOverall = isOverallCompetence(competence.competenceId);

  // Override display values for overall competence
  const displayName = isOverall ? 'Overall Match Assessment' : competence.competenceName;
  const displayDescription = isOverall
    ? "This assessment considers all of the user's competences together to provide a holistic evaluation of their suitability for the task."
    : competence.competenceDescription;

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: isOverall
          ? '#e6f4ff' // Light blue for overall
          : rank % 2 === 0
            ? '#fafafa'
            : '#ffffff',
        borderRadius: '4px',
        marginBottom: '8px',
        border: isOverall
          ? '2px solid #1890ff' // Blue border for overall
          : isContradicting
            ? '1px solid #faad14'
            : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          {isContradicting && (
            <Tooltip title="This competence might contradict the task requirements">
              <ThunderboltOutlined style={{ color: '#faad14', fontSize: '1rem' }} />
            </Tooltip>
          )}
          <Text strong style={{ fontSize: isOverall ? '1rem' : '0.95rem' }}>
            {displayName}
          </Text>
        </Space>
        <Tag color={scoreColor} style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
          {displayScore}%
        </Tag>
      </div>

      {/* Competence Description */}
      {displayDescription && (
        <div style={{ marginTop: '8px' }}>
          <Text
            type="secondary"
            style={{
              fontSize: '0.85rem',
              fontStyle: isOverall ? 'normal' : 'italic',
              fontWeight: isOverall ? 500 : 'normal',
            }}
          >
            {displayDescription}
          </Text>
        </div>
      )}

      {/* Matching Reasons */}
      {competence.reasons && competence.reasons.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <Text type="secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            AI Matching Analysis:
          </Text>
          <ul style={{ marginTop: '4px', marginBottom: 0, paddingLeft: '20px' }}>
            {competence.reasons.map((reason, idx) => (
              <li key={idx}>
                <Text style={{ fontSize: '0.85rem' }}>{reason}</Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const RankedUserList: FC<RankedUserListProps> = ({
  rankedUsers,
  currentPerformers,
  onAddPerformer,
  onRemovePerformer,
}) => {
  const [useBestFit, setUseBestFit] = useState(false);

  // Sort users based on the selected scoring mode
  const sortedUsers = useMemo(() => {
    return [...rankedUsers].sort((a, b) => {
      const scoreA = useBestFit ? a.bestFitScore : a.score;
      const scoreB = useBestFit ? b.bestFitScore : b.score;
      return scoreB - scoreA;
    });
  }, [rankedUsers, useBestFit]);

  if (rankedUsers.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
        }}
      >
        <Text type="secondary">No matching users found.</Text>
      </div>
    );
  }

  // Create collapse items from ranked users
  const collapseItems: CollapseProps['items'] = sortedUsers.map((user, index) => {
    const rank = index + 1;
    const isPerformer = currentPerformers.has(user.userId);
    const displayScore = useBestFit ? user.bestFitScore : user.score;
    const scoreColor = getScoreColor(displayScore);

    return {
      key: user.userId,
      label: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Space size="middle">
            {/* Rank Badge */}
            <Badge
              count={rank}
              style={{
                backgroundColor: '#d9d9d9',
                color: '#595959',
                fontWeight: 'bold',
              }}
            />

            {/* User Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserOutlined />
                <Text strong style={{ fontSize: '1rem' }}>
                  {user.userName}
                </Text>
                {user.contradicting && (
                  <Tooltip title="Some competences might contradict the task requirements">
                    <WarningOutlined style={{ color: '#faad14', fontSize: '1rem' }} />
                  </Tooltip>
                )}
                {isPerformer && (
                  <Tag color="blue" style={{ marginLeft: '4px' }}>
                    Current Performer
                  </Tag>
                )}
              </div>
              {user.userEmail && (
                <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                  {user.userEmail}
                </Text>
              )}
            </div>
          </Space>

          {/* Score and Action Button */}
          <Space size="small">
            <Tag
              color={scoreColor}
              style={{
                fontWeight: 'bold',
                fontSize: '1rem',
                padding: '4px 12px',
              }}
            >
              {displayScore}%
            </Tag>
            <Button
              type={isPerformer ? 'default' : 'primary'}
              icon={isPerformer ? <MinusOutlined /> : <PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation(); // Prevent collapse toggle
                if (isPerformer) {
                  onRemovePerformer(user.userId);
                } else {
                  onAddPerformer(user.userId);
                }
              }}
              danger={isPerformer}
            >
              {isPerformer ? 'Remove' : 'Add'}
            </Button>
          </Space>
        </div>
      ),
      children: (
        <div style={{ paddingLeft: '8px' }}>
          {/* Debug Output */}
          {/* <details style={{ marginBottom: '16px' }}>
            <summary style={{ cursor: 'pointer', color: '#1890ff', fontWeight: 'bold' }}>
              Debug: View Raw User Data
            </summary>
            <pre
              style={{
                backgroundColor: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.75rem',
                marginTop: '8px',
                maxHeight: '300px',
              }}
            >
              {JSON.stringify(user, null, 2)}
            </pre>
          </details> */}

          <Divider orientation="left" style={{ fontSize: '0.9rem', marginTop: '8px' }}>
            Competence Matches ({user.competenceMatches.length})
          </Divider>

          {user.competenceMatches.length > 0 ? (
            <div>
              {[...user.competenceMatches]
                .sort((a, b) => {
                  const scoreA = useBestFit ? a.bestFitScore : a.score;
                  const scoreB = useBestFit ? b.bestFitScore : b.score;
                  return scoreB - scoreA;
                })
                .map((competence, idx) => (
                  <CompetenceMatchItem
                    key={competence.competenceId}
                    competence={competence}
                    rank={idx}
                    useBestFit={useBestFit}
                  />
                ))}
            </div>
          ) : (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              No specific competence matches found.
            </Text>
          )}
        </div>
      ),
      style: {
        marginBottom: '12px',
        border: isPerformer ? '2px solid #1890ff' : '1px solid #d9d9d9',
        borderRadius: '8px',
      },
    };
  });

  return (
    <div style={{ marginTop: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <Text strong style={{ fontSize: '1.1rem' }}>
          Ranked Users ({rankedUsers.length})
        </Text>
        <Space>
          <Text style={{ fontSize: '0.9rem' }}>Scoring Mode:</Text>
          <Switch
            checkedChildren="Best Fit"
            unCheckedChildren="Average Fit"
            checked={useBestFit}
            onChange={setUseBestFit}
          />
        </Space>
      </div>

      <Collapse accordion={true} bordered={false} items={collapseItems} />
    </div>
  );
};

export default RankedUserList;
