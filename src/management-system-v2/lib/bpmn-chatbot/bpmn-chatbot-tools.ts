import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const tools: FunctionDeclaration[] = [
  {
    name: 'append_element',
    description:
      'Create a BPMN element and connect it to an already existing element. The element can either be a task, event or gateway. This automatically places the element and creates a connection from the given source element.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        bpmn_type: {
          type: SchemaType.STRING,
          description:
            "The BPMN type of the element. Possible types are: 'Task','StartEvent','EndEvent','ExclusiveGateway','InclusiveGateway','ParallelGateway'.",
        },
        name: {
          type: SchemaType.STRING,
          description: 'The name of the new element.',
        },
        source_element_id_or_name: {
          type: SchemaType.STRING,
          description:
            'The id or name of the source element which to append to. Use the id if the element already exists in the process, otherwise the name.',
        },
        label: {
          type: SchemaType.STRING,
          description: 'The label of the connection which is automatically created.',
        },
      },
      required: ['bpmn_type', 'name', 'source_element_id_or_name'],
    },
  },
  {
    name: 'create_connection',
    description:
      'Create a connection between two elements. Only needed if the connection has not been created yet.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        source_element_id_or_name: {
          type: SchemaType.STRING,
          description:
            'The id or name of the source element of the connection. User the id if the element already exists in the process, otherwise the name.',
        },
        target_element_id_or_name: {
          type: SchemaType.STRING,
          description:
            'The id or name of the target element of the connection. User the id if the element already exists in the process, otherwise the name.',
        },
        label: {
          type: SchemaType.STRING,
          description: 'The optional label of the connection.',
        },
      },
      required: ['source_element_id_or_name', 'target_element_id_or_name'],
    },
  },
  {
    name: 'remove_elements',
    description:
      'Remove BPMN elements. Removing an element with exactly one incomming and one outgoing connection merges the two connections into one. If the deleted element has more than one incomming or outgoing connection all associated connections will be removed. Connections are also considered elements and can be seperately removed too by including their id here.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        element_ids: {
          type: SchemaType.ARRAY,
          description: 'The ids of the elements to be removed.',
          items: {
            type: SchemaType.STRING,
          },
        },
      },
      required: ['element_ids'],
    },
  },
];
