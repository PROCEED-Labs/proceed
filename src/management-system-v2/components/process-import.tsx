'use client';

import React, { useState } from 'react';

import { Button, Upload } from 'antd';
import type { ButtonProps } from 'antd';

import {
  generateBpmnId,
  getDefinitionsName,
  getProcessDocumentation,
  initXml,
  setProceedElement,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import ProcessModal from './process-modal';
import { addProcesses } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import type { ShapeLike } from 'diagram-js/lib/core/Types';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

export type ProcessData = {
  name: string;
  description: string;
  bpmn: string;
};

type JSONProcessSchema = {
  work_plan: {
    product_name: string;
    product_id: string;
    process: JSONProcessTaskSchema[];
  };
};

type JSONProcessTaskSchema = {
  process_id: number;
  process_name: string;
  process_position_ID: number;
  production_facility: Array<string>;
  production_process: string;
  results: Array<{
    feature_name: string;
    feature_id: number;
    face_ID: Array<string>;
  }>;
};

// TODO: maybe show import errors and warnings like in the old MS (e.g. id collisions if an existing process is reimported or two imports use the same id)

const ProcessImportButton: React.FC<ButtonProps> = ({ ...props }) => {
  const [importProcessData, setImportProcessData] = useState<ProcessData[]>([]);
  const router = useRouter();
  const environment = useEnvironment();

  const createTaskShape = (
    bpmnModeler: BpmnModeler,
    taskInfo: JSONProcessTaskSchema,
    taskPosition: { x: number; y: number },
  ) => {
    const modeling = bpmnModeler.get('modeling') as Modeling;
    const elementFactory = bpmnModeler.get('elementFactory') as ElementFactory;
    const bpmnFactory = bpmnModeler.get('bpmnFactory') as BpmnFactory;
    const rootElement = (bpmnModeler.get('canvas') as Canvas).getRootElement();

    let taskDescription =
      '| feature_name | feature_id | face_ID |' + '\n' + '| ------------ | ---------- | ------- |';

    taskInfo.results.forEach((result: any) => {
      taskDescription +=
        '\n' + `| ${result.feature_name} | ${result.feature_id} | ${result.face_ID.join(', ')} |`;
    });

    const isUserTask = taskInfo.production_facility.includes('Human');
    const taskShape = modeling.createShape(
      elementFactory.createShape({
        type: isUserTask ? 'bpmn:UserTask' : 'bpmn:ServiceTask',
      }),
      taskPosition,
      rootElement as any,
    );
    taskShape.businessObject.name = taskInfo.process_name
      .replace(/_/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
    taskShape.businessObject.documentation = [
      bpmnFactory.create('bpmn:Documentation', {
        text: taskDescription,
      }),
    ];
    setProceedElement(taskShape.businessObject, 'property', taskInfo.production_facility[0], {
      name: 'production_facility',
    });
    setProceedElement(taskShape.businessObject, 'property', taskInfo.production_process, {
      name: 'production_process',
    });

    return taskShape;
  };

  const importJsonProcess = async (json: string) => {
    const processInfo = JSON.parse(json) as JSONProcessSchema;

    const sortedTasks = processInfo.work_plan.process
      .sort((taskA, taskB) => taskA.process_position_ID - taskB.process_position_ID)
      .reduce<{ positionID: number; tasks: JSONProcessTaskSchema[] }[]>((acc, curr) => {
        const isAlreadyAdded = acc.find((t) => t.positionID === curr.process_position_ID);
        if (isAlreadyAdded) {
          return acc;
        }

        const parallelTasks = processInfo.work_plan.process.filter(
          (t) => t.process_position_ID === curr.process_position_ID,
        );

        return [...acc, { positionID: curr.process_position_ID, tasks: parallelTasks }];
      }, []);

    const processId = `Process_${generateBpmnId()}`;
    const startEventId = `StartEvent_${generateBpmnId()}`;
    const bpmn = initXml(processId, startEventId);

    const bpmnModeler = new BpmnModeler();
    await bpmnModeler.importXML(bpmn);

    const modeling = bpmnModeler.get('modeling') as Modeling;
    const elementRegistry = bpmnModeler.get('elementRegistry') as ElementRegistry;
    const elementFactory = bpmnModeler.get('elementFactory') as ElementFactory;
    const rootElement = (bpmnModeler.get('canvas') as Canvas).getRootElement() as any;

    setProceedElement(rootElement.businessObject, 'property', processInfo.work_plan.product_name, {
      name: 'product_name',
    });

    const startEvent = elementRegistry.get(startEventId)! as ShapeLike;
    const yPosition = startEvent.y + startEvent.height / 2;
    const xPositionOffset = 150;
    const yPositionOffset = 150;

    sortedTasks.reduce<{
      createdShapes: ShapeLike[];
      currentXPosition: number;
    }>(
      ({ createdShapes, currentXPosition }, { tasks: currentPositionIDTasks }, sortedTaskIdx) => {
        const newShapes: ShapeLike[] = [];
        let newCurrentXPosition = currentXPosition;

        if (currentPositionIDTasks.length > 1) {
          // Create Parallel Gateway for parallel Tasks with same position ID
          const parallelGatewayOutgoing = modeling.createShape(
            elementFactory.createShape({
              type: 'bpmn:ParallelGateway',
            }),
            { x: (newCurrentXPosition += xPositionOffset), y: yPosition },
            rootElement,
          );

          const minYPosition =
            currentPositionIDTasks.length % 2 === 0
              ? yPosition +
                yPositionOffset / 2 -
                (currentPositionIDTasks.length / 2) * yPositionOffset
              : yPosition - Math.floor(currentPositionIDTasks.length / 2) * yPositionOffset;

          const parallelTaskShapes: ShapeLike[] = [];
          newCurrentXPosition += xPositionOffset;

          currentPositionIDTasks.forEach((task, index) => {
            const parallelTaskShape = createTaskShape(bpmnModeler, task, {
              x: newCurrentXPosition,
              y: minYPosition + yPositionOffset * index,
            });
            modeling.createConnection(
              parallelGatewayOutgoing,
              parallelTaskShape,
              {
                type: 'bpmn:SequenceFlow',
              },
              rootElement,
            );

            parallelTaskShapes.push(parallelTaskShape);
          });

          const parallelGatewayIncoming = modeling.createShape(
            elementFactory.createShape({
              type: 'bpmn:ParallelGateway',
            }),
            { x: (newCurrentXPosition += xPositionOffset), y: yPosition },
            rootElement,
          );

          parallelTaskShapes.forEach((taskShape) => {
            modeling.createConnection(
              taskShape as any,
              parallelGatewayIncoming,
              {
                type: 'bpmn:SequenceFlow',
              },
              rootElement,
            );
          });

          newShapes.push(parallelGatewayOutgoing, ...parallelTaskShapes, parallelGatewayIncoming);
        } else {
          const task = currentPositionIDTasks[0];
          const taskShape = createTaskShape(bpmnModeler, task, {
            x: (newCurrentXPosition += xPositionOffset),
            y: yPosition,
          });

          newShapes.push(taskShape);
        }

        // Connect shape of previous iteration to first shape created in this iteration (either task or outgoing parallel gateway)
        modeling.createConnection(
          createdShapes[createdShapes.length - 1] as any,
          newShapes[0] as any,
          {
            type: 'bpmn:SequenceFlow',
          },
          rootElement,
        );

        if (sortedTaskIdx === sortedTasks.length - 1) {
          // Create end event and connect to last shape created in this iteration
          const endEvent = modeling.createShape(
            elementFactory.createShape({
              type: 'bpmn:EndEvent',
            }),
            { x: (newCurrentXPosition += xPositionOffset), y: yPosition },
            rootElement,
          );
          modeling.createConnection(
            newShapes[newShapes.length - 1] as any,
            endEvent,
            {
              type: 'bpmn:SequenceFlow',
            },
            rootElement,
          );

          newShapes.push(endEvent);
        }

        return {
          createdShapes: [...createdShapes, ...newShapes],
          currentXPosition: newCurrentXPosition,
        };
      },
      { createdShapes: [startEvent], currentXPosition: startEvent.x },
    );

    const { xml } = await bpmnModeler.saveXML({ format: true });

    if (!xml) {
      throw new Error('Could not retrieve XML from modeler');
    }

    return xml;
  };

  return (
    <>
      <Upload
        accept={process.env.PROCEED_PUBLIC_PROJECTS_HTA2 ? '.bpmn,.json' : '.bpmn'}
        multiple
        showUploadList={false}
        beforeUpload={async (_, fileList) => {
          const processesData = await Promise.all(
            fileList.map(async (file) => {
              const fileText = await file.text();
              const bpmn =
                process.env.PROCEED_PUBLIC_PROJECTS_HTA2 && file.type === 'application/json'
                  ? await importJsonProcess(fileText)
                  : fileText;

              const bpmnObj = await toBpmnObject(bpmn);

              return {
                name: (await getDefinitionsName(bpmnObj)) || '',
                description: await getProcessDocumentation(bpmn),
                bpmn,
              };
            }),
          );
          setImportProcessData(processesData);
          return false;
        }}
      >
        {/* <span>Import Process</span> */}
        <Button {...props}></Button>
      </Upload>
      <ProcessModal
        open={importProcessData.length > 0}
        title={`Import Process${importProcessData.length > 1 ? 'es' : ''}`}
        okText="Import"
        onCancel={() => setImportProcessData([])}
        onSubmit={async (processesData) => {
          const res = await addProcesses(processesData, environment.spaceId);
          // Let modal handle errors
          if ('error' in res) {
            return res;
          }
          setImportProcessData([]);
          router.refresh();
        }}
        initialData={importProcessData}
      />
    </>
  );
};

export default ProcessImportButton;
