'use client';
import { useEffect, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, Checkbox, App, Select, Space, Result, message } from 'antd';
import { useParams, useSearchParams } from 'next/navigation';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';
import { Process } from '@/lib/data/process-schema';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { isUserErrorResponse } from '@/lib/user-error';

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
  const app = App.useApp();
  const { processId } = useParams();
  const environment = useEnvironment();
  const [embeddingUrl, setEmbeddingUrl] = useState('');

  const query = useSearchParams();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => {
    const queryVersion = query.get('version');
    if (queryVersion && processVersions.find((version) => version.id === queryVersion))
      return queryVersion;
    else return processVersions[0]?.id;
  });

  useEffect(() => {
    if (allowIframeTimestamp > 0 && selectedVersionId) {
      wrapServerCall({
        fn: () =>
          generateSharedViewerUrl(
            {
              processId,
              embeddedMode: true,
              timestamp: allowIframeTimestamp,
            },
            selectedVersionId,
          ),
        onSuccess: (url) => setEmbeddingUrl(url),
        app,
      });
    }
  }, [allowIframeTimestamp, environment.spaceId, processId, sharedAs, selectedVersionId, app]);

  const handleAllowEmbeddingChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      // create embedding
      const timestamp = Date.now();
      await wrapServerCall({
        fn: async () => {
          const url = await generateSharedViewerUrl(
            {
              processId,
              embeddedMode: true,
              timestamp,
            },
            selectedVersionId!,
          );
          if (isUserErrorResponse(url)) return url;

          const accessUpdateResult = await updateProcessGuestAccessRights(
            processId,
            {
              sharedAs: 'public',
              allowIframeTimestamp: timestamp,
            },
            environment.spaceId,
          );
          if (isUserErrorResponse(accessUpdateResult)) return accessUpdateResult;

          return url;
        },
        onSuccess: (url) => setEmbeddingUrl(url),
        app,
      });
    } else {
      // deactivate embedding
      await wrapServerCall({
        fn: () =>
          updateProcessGuestAccessRights(
            processId,
            { allowIframeTimestamp: 0 },
            environment.spaceId,
          ),
        onSuccess: () => setEmbeddingUrl(''),
        app,
      });
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
      <Checkbox
        checked={embeddingUrl.length > 0 && allowIframeTimestamp > 0}
        onChange={(e) => handleAllowEmbeddingChecked(e)}
      >
        Enable iFrame Embedding
      </Checkbox>
      {embeddingUrl.length > 0 ? (
        <>
          <Select
            defaultValue={selectedVersionId}
            options={processVersions.map((version) => ({ value: version.id, label: version.name }))}
            onChange={(value) => setSelectedVersionId(value)}
            style={{ width: '35%' }}
          />

          <Button icon={<CopyOutlined />} onClick={handleCopyCodeSection} title="copy code" />

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
