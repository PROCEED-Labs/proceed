import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ColorOptions, flowElementsStyling } from './instance-coloring';
import { InstanceInfo } from '@/lib/engines/deployment';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';

const useColors = (
  selectedBpmn: { bpmn: string },
  selectedColoring: ColorOptions,
  selectedInstance: InstanceInfo | undefined,
  canvasRef: RefObject<BPMNCanvasRef | null>,
) => {
  const appliedStylingRef = useRef<{ elementId: string; color: string }[]>([]);

  const [timingRecolorTrigger, setTimingRecolorTrigger] = useState(0);

  // provide a function that allows BpmnCanvas to reapply the coloring after the bpmn was imported
  // but prevent unnecessary reimports of the bpmn from occuring every time there is a change in the
  // instance information
  const applyColoringFunctionRef = useRef(() => {});

  useEffect(() => {
    applyColoringFunctionRef.current = () => {
      if (!selectedInstance || !canvasRef.current) return;

      const canvas = canvasRef.current.getCanvas();

      // remove previous styling
      for (const { elementId, color } of appliedStylingRef.current)
        canvas.removeMarker(elementId, color);

      // apply new styling
      appliedStylingRef.current = flowElementsStyling(
        canvasRef.current,
        selectedInstance,
        selectedColoring,
      );
      for (const { elementId, color } of appliedStylingRef.current)
        canvas.addMarker(elementId, color);
    };

    // make sure that the time colors are actually updated even if the instance state and the user
    // selections do not change
    if (selectedColoring == 'timeColors') {
      const interval = setInterval(() => {
        setTimingRecolorTrigger(Date.now());
      }, 1000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [selectedInstance, selectedColoring, canvasRef]);

  const refreshColoring = useCallback(() => {
    if (applyColoringFunctionRef.current) applyColoringFunctionRef.current();
  }, []);

  useEffect(() => {
    if (applyColoringFunctionRef.current) applyColoringFunctionRef.current();
  }, [selectedColoring, selectedInstance, timingRecolorTrigger]);

  useEffect(() => {
    // This is necessary, because bpmn-js throws an error if you try to remove a marker
    // from an element that doesn't exist so we have to make sure to remove the styling before a new
    // bpmn is imported in BpmnCanvas
    appliedStylingRef.current = [];
  }, [selectedBpmn]);

  return { refreshColoring };
};

export default useColors;
