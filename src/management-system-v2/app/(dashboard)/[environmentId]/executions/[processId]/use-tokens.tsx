import { RefObject, useCallback, useEffect, useRef } from 'react';

import { InstanceInfo } from '@/lib/engines/deployment';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { addToken } from './instance-tokens';

const useTokens = (instance: InstanceInfo | null, canvasRef: RefObject<BPMNCanvasRef | null>) => {
  // provide a function that allows BpmnCanvas to reapply the tokens after the bpmn was imported
  // but prevent unnecessary reimports of the bpmn from occuring every time there is a change in the
  // instance information
  const applyTokensFunctionRef = useRef(() => {});

  const appliedTokensRef = useRef<{ [tokenId: string]: string }>({});

  useEffect(() => {
    applyTokensFunctionRef.current = () => {
      const newOverlays: { [tokenId: string]: string } = {};

      if (canvasRef.current) {
        // remove the previously applied tokens
        const overlayHandler = canvasRef.current.getOverlays();
        for (const tokenId in appliedTokensRef.current) {
          overlayHandler.remove(appliedTokensRef.current[tokenId]);
        }

        if (instance?.tokens) {
          const { tokens } = instance;

          for (const token of tokens) {
            if (!canvasRef.current.getElement(token.currentFlowElementId)) continue;

            newOverlays[token.tokenId] = addToken(token, instance, canvasRef.current);
          }
        }
      }
      appliedTokensRef.current = newOverlays;
    };
  }, [instance, canvasRef]);

  const refreshTokens = useCallback(() => {
    if (applyTokensFunctionRef.current) applyTokensFunctionRef.current();
  }, []);

  useEffect(() => {
    if (applyTokensFunctionRef.current) applyTokensFunctionRef.current();
  }, [instance]);

  return { refreshTokens };
};

export default useTokens;
