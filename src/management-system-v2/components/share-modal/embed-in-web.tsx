'use client';
import { useEffect, useState } from 'react';
import { IoMdCopy } from 'react-icons/io';
import {
  Button,
  Input,
  Checkbox,
  App,
  Select,
  Space,
  Result,
  message,
  CheckboxChangeEvent,
  Alert,
} from 'antd';
import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';
import { Process } from '@/lib/data/process-schema';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useProcessVersion from './use-process-version';
import { updateShare } from './share-helpers';

const { TextArea } = Input;

type ModelerShareModalOptionEmdedInWebProps = {
  sharedAs: 'public' | 'protected';
  allowIframeTimestamp: number;
  refresh: () => void;
  processes: { id: string; versions: Process['versions'] }[];
};

const ModelerShareModalOptionEmdedInWeb = ({
  sharedAs,
  allowIframeTimestamp,
  refresh,
  processes,
}: ModelerShareModalOptionEmdedInWebProps) => {
  const process = processes[0];

  const app = App.useApp();
  const environment = useEnvironment();
  const [embeddingUrl, setEmbeddingUrl] = useState('');

  const [selectedVersionId, setSelectedVersionId] = useProcessVersion(
    process?.versions,
    undefined,
    false,
  );

  useEffect(() => {
    if (process && allowIframeTimestamp > 0 && selectedVersionId) {
      wrapServerCall({
        fn: () =>
          generateSharedViewerUrl(
            {
              processId: process.id,
              embeddedMode: true,
              timestamp: allowIframeTimestamp,
            },
            selectedVersionId,
          ),
        onSuccess: (url) => {
          setEmbeddingUrl(url);
        },
        app,
      });
    }
  }, [allowIframeTimestamp, environment.spaceId, process, sharedAs, selectedVersionId, app]);

  async function handleAllowEmbeddingChecked(e: CheckboxChangeEvent) {
    if (!process) return;
    await updateShare(
      {
        processId: process.id,
        versionId: selectedVersionId || undefined,
        spaceId: environment.spaceId,
        embeddedMode: true,
        unshare: !e.target.checked,
      },
      {
        app,
        onSuccess: (url) => setEmbeddingUrl(url ?? ''),
      },
    );
    refresh();
  }

  const iframeCode = `<iframe src='${embeddingUrl}' height="100%" width="100%"></iframe>`;

  const handleCopyCodeSection = async () => {
    await navigator.clipboard.writeText(iframeCode);
    message.success('Code copied to you clipboard');
  };

  if (processes.length > 1) {
    return (
      <Alert
        type="info"
        message="Embed sharing is only available when a single process is selected"
      />
    );
  }

  if (process?.versions?.length === 0)
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
        onChange={handleAllowEmbeddingChecked}
        disabled={!process}
      >
        Enable iFrame Embedding
      </Checkbox>

      <Select
        value={selectedVersionId}
        options={(process?.versions || []).map((version) => ({
          value: version.id,
          label: version.name,
        }))}
        onChange={setSelectedVersionId}
        style={{ width: '35%' }}
      />

      {embeddingUrl.length > 0 ? (
        <>
          <Button icon={<IoMdCopy />} onClick={handleCopyCodeSection} title="copy code" />

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
