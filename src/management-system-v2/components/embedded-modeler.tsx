'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import schema from '@/lib/schema';
import { Button, message } from 'antd';
import { addProcesses } from '@/lib/data/processes';
import { getFinalBpmn } from '@/lib/helpers/processHelpers';
import { ApiData } from '@/lib/fetch-data';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { generateDefinitionsId } from '@proceed/bpmn-helper';

// Conditionally load the BPMN modeler only on the client, because it uses
// "window" reference. It won't be included in the initial bundle, but will be
// immediately loaded when the initial script first executes (not after
// Hydration).
const BPMNModeler =
  typeof window !== 'undefined' ? import('bpmn-js/lib/Modeler').then((mod) => mod.default) : null;

const BPMNViewer =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/NavigatedViewer').then((mod) => mod.default)
    : null;

type ModelerProps = React.HTMLAttributes<HTMLDivElement> & {
  processData: ApiData<'/process/{definitionId}', 'get'>;
};

const EmbeddedModeler = ({ processData }: ModelerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const processBpmn = processData.bpmn;
  const [initialized, setInitialized] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const modeler = useRef<ModelerType | ViewerType | null>(null);

  const setModeler = useModelerStateStore((state) => state.setModeler);
  const setEditingDisabled = useModelerStateStore((state) => state.setEditingDisabled);

  const handleCopyToOwnWorkspace = async () => {
    if (session.status === 'unauthenticated') {
      const callbackUrl = `${window.location.origin}${pathname}?token=${searchParams.get('token')}`;
      const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

      router.replace(loginPath);
    }
    const newDefinitionID = generateDefinitionsId();
    const processToAdd = [
      {
        definitionName: processData.definitionName + 'Copy',
        description: processData.description,
        bpmn: await getFinalBpmn({
          ...processData,
          definitionId: newDefinitionID,
        }),
      },
    ];
    const res = await addProcesses(processToAdd);
    if ('error' in res) {
      message.error(res.error.message);
      return res;
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      router.push(`/processes/${newDefinitionID}`);
    }
  };

  useEffect(() => {
    if (!canvas.current) return;
    const active = { destroy: () => {} };
    modeler.current = active as ModelerType | ViewerType;
    Promise.all([BPMNViewer]).then(([Viewer]) => {
      if (active !== modeler.current) return;

      modeler.current = new Viewer!({
        container: canvas.current!,
        moddleExtensions: {
          proceed: schema,
        },
      });
      setEditingDisabled(true);

      setModeler(modeler.current);
      setInitialized(true);
    });

    return () => {
      modeler.current?.destroy();
    };
  }, [processBpmn, setEditingDisabled, setModeler]);

  useEffect(() => {
    if (!initialized && modeler.current?.importXML && processBpmn) {
      modeler.current.importXML(processBpmn).then(() => {
        (modeler.current!.get('canvas') as any).zoom('fit-viewport', 'auto');
      });
    }
    setInitialized(false);
  }, [initialized, processBpmn]);

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <Button onClick={handleCopyToOwnWorkspace}>Copy to own workspace</Button>
        <div className="modeler" style={{ height: '90vh', width: '90vw' }} ref={canvas} />
      </div>
    </>
  );
};

export default EmbeddedModeler;
