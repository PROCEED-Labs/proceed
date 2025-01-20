'use client';
import { useEffect, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, Checkbox, App, Select, Space, Result } from 'antd';
import { useParams, useSearchParams } from 'next/navigation';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';
import { Process } from '@/lib/data/process-schema';

const { TextArea } = Input;

type ModelerShareModalOptionEmdedInWebProps = {
  sharedAs: 'public' | 'protected';
  allowIframeTimestamp: number;
  refresh: () => void;
  processVersions: Process['versions'];
};

const ModelerShareModalOptionEmdedInWeb = ({
  sharedAs,
  allowIframeTimestamp,
  refresh,
  processVersions,
}: ModelerShareModalOptionEmdedInWebProps) => {
  const { processId } = useParams();
  const environment = useEnvironment();
  const [embeddingUrl, setEmbeddingUrl] = useState('');
  const { message } = App.useApp();

  const query = useSearchParams();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => {
    const queryVersion = query.get('version');
    if (queryVersion && processVersions.find((version) => version.id === queryVersion))
      return queryVersion;
    else return processVersions[0]?.id;
  });

  useEffect(() => {
    const initialize = async () => {
      if (allowIframeTimestamp > 0 && selectedVersionId) {
        try {
          // generate an url with a token that contains the currently active embedding timestamp
          const url = await generateSharedViewerUrl(
            {
              processId,
              embeddedMode: true,
              timestamp: allowIframeTimestamp,
            },
            selectedVersionId,
          );
          setEmbeddingUrl(url);
        } catch (error) {
          console.error('Error while generating the url for embedding:', error);
        }
      }
    };
    initialize();
  }, [allowIframeTimestamp, environment.spaceId, processId, sharedAs, selectedVersionId]);

  const handleAllowEmbeddingChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      try {
        const timestamp = Date.now();
        // generate an url containing a token with the newly generated timestamp
        const url = await generateSharedViewerUrl(
          {
            processId,
            embeddedMode: true,
            timestamp,
          },
          selectedVersionId!,
        );
        setEmbeddingUrl(url);
        // activate embedding for that specific timestamp
        await updateProcessGuestAccessRights(
          processId,
          {
            sharedAs: 'public',
            allowIframeTimestamp: timestamp,
          },
          environment.spaceId,
        );
      } catch (err) {
        message.error('An error occurred while enabling embedding.');
      }
    } else {
      // deactivate embedding
      try {
        await updateProcessGuestAccessRights(
          processId,
          { allowIframeTimestamp: 0 },
          environment.spaceId,
        );
        setEmbeddingUrl('');
      } catch (err) {
        message.error('An error occurred while disabling embedding.');
      }
    }
    refresh();
  };

  const iframeCode = `<iframe src='${embeddingUrl}' height="100%" width="100%"></iframe>`;

  const handleCopyCodeSection = async () => {
    await navigator.clipboard.writeText(iframeCode);
    message.success('Code copied to you clipboard');
  };

  if (processVersions.length === 0)
    return (
      <Result
        status="warning"
        title="No Process Versions"
        subTitle="You can only embed process versions"
      />
    );

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        defaultValue={selectedVersionId}
        options={processVersions.map((version) => ({ value: version.id, label: version.name }))}
        onChange={(value) => setSelectedVersionId(value)}
      />
      <Checkbox
        checked={embeddingUrl.length > 0 && allowIframeTimestamp > 0}
        onChange={(e) => handleAllowEmbeddingChecked(e)}
      >
        Allow iframe Embedding
      </Checkbox>
      {embeddingUrl.length > 0 ? (
        <>
          <div>
            <Button
              icon={<CopyOutlined />}
              style={{ border: '1px solid black', float: 'right' }}
              onClick={handleCopyCodeSection}
              title="copy code"
            />
          </div>
          <div className="code">
            <TextArea
              rows={2}
              value={iframeCode}
              // @ts-expect-error fieldSizing works but isn't recognized as a valid field
              style={{ backgroundColor: 'rgb(245,245,245)', fieldSizing: 'content' }}
            />
          </div>
        </>
      ) : null}
    </Space>
  );
};

export default ModelerShareModalOptionEmdedInWeb;
