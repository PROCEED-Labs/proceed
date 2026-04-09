import { use, useEffect, useState } from 'react';
import { is as isType } from 'bpmn-js/lib/util/ModelUtil';
import Canvas from 'diagram-js/lib/core/Canvas';
import type ViewerType from 'bpmn-js/lib/Viewer';
import { getRootFromElement, getDefinitionsVersionInformation } from '@proceed/bpmn-helper';
import { getSVGFromBPMN } from '@/lib/process-export/util';
import { getProcess } from '@/lib/data/db/process';
import { ElementInfo } from './table-of-content';
import { VersionInfo } from './process-document';
import {
  getTitle,
  getMetaDataFromBpmnElement,
  getChildElements,
  getViewer,
  getElementSVG,
  markdownEditor,
  ImportsInfo,
} from './documentation-page-utils';

type UseProcessHierarchyOptions = {
  processData: Awaited<ReturnType<typeof getProcess>>;
  availableImports: ImportsInfo;
  // If provided, used as the SVG for the root element instead of the plain export.
  getRootSvg?: (bpmn: string) => Promise<string>;
  // If provided, called after transforming each element to attach extra data.
  enrichElement?: (el: any, node: Omit<ElementInfo, 'instanceStatus'>) => ElementInfo;
};

export function useProcessHierarchy({
  processData,
  availableImports,
  getRootSvg,
  enrichElement,
}: UseProcessHierarchyOptions) {
  const mdEditor = use(markdownEditor);
  const [processHierarchy, setProcessHierarchy] = useState<ElementInfo>();
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({});

  useEffect(() => {
    async function transform(
      bpmnViewer: ViewerType,
      el: any,
      definitions: any,
      currentRootId?: string,
    ): Promise<ElementInfo> {
      const name = getTitle(el);
      const { meta, milestones, description, image } = getMetaDataFromBpmnElement(el, mdEditor);

      let svg: string;
      let nestedSubprocess;
      let importedProcess;
      let oldBpmn: string | undefined;

      const isRoot = isType(el, 'bpmn:Collaboration') || isType(el, 'bpmn:Process');

      if (isRoot) {
        svg = getRootSvg ? await getRootSvg(processData.bpmn!) : await getSVGFromBPMN(bpmnViewer);
      } else {
        ({ svg, el, definitions, oldBpmn, nestedSubprocess, importedProcess, currentRootId } =
          await getElementSVG(
            el,
            bpmnViewer,
            mdEditor,
            definitions,
            availableImports,
            currentRootId,
          ));
      }

      const children: ElementInfo[] = [];
      for (const childEl of getChildElements(el)) {
        children.push(await transform(bpmnViewer, childEl, definitions, currentRootId));
      }

      children.sort((a, b) => {
        const typeOrder = (node: ElementInfo) => {
          const type = node.elementType || '';
          if (type.includes('StartEvent')) return 0;
          if (type.includes('EndEvent')) return 3;
          if (node.children?.length) return 2;
          return 1;
        };
        return typeOrder(a) - typeOrder(b);
      });

      if (oldBpmn) await bpmnViewer.importXML(oldBpmn);

      const node: ElementInfo = {
        svg,
        id: el.id,
        name,
        description,
        meta,
        milestones,
        importedProcess,
        nestedSubprocess,
        children,
        image,
        elementType: el.$type,
      };

      // Let callers attach extra data without forking transform
      return enrichElement ? enrichElement(el, node) : node;
    }

    async function loadHierarchy() {
      const viewer = await getViewer(processData.bpmn!);
      const canvas = viewer.get<Canvas>('canvas');
      const root = canvas.getRootElement();
      const definitions = getRootFromElement(root.businessObject);

      const { versionId, name, description, versionCreatedOn } =
        await getDefinitionsVersionInformation(definitions);
      setVersionInfo({ id: versionId, name, description, versionCreatedOn });

      const hierarchy = await transform(
        viewer,
        root.businessObject,
        root.businessObject.$parent,
        undefined,
      );
      setProcessHierarchy(hierarchy);
      viewer.destroy();
    }

    loadHierarchy();
  }, [mdEditor, processData, availableImports, getRootSvg, enrichElement]);

  return { processHierarchy, versionInfo };
}
