import React from 'react';

import { Button as AntButton, Row } from 'antd';

import { Element, useEditor, NodeTree, WithoutPrivateActions } from '@craftjs/core';

import Text from './Text';
import Container from './Container';
import Input from './Input';
import Header from './Header';
import Column from './Column';
import Table from './Table';

function selectOnCreation(nodeTree: NodeTree, actions: WithoutPrivateActions<null>) {
  const newNode = Object.values(nodeTree.nodes || {}).find((el) => el.data.name !== 'Row');

  if (newNode) {
    actions.selectNode(newNode.id);
  }
}

export const Toolbox = () => {
  const { connectors, query, actions } = useEditor();

  return (
    <Row>
      <AntButton
        ref={(r) =>
          connectors.create(
            r,
            <Column>
              <Header text="Double Click Me" />
            </Column>,
            {
              onCreate: (nodeTree) => {
                selectOnCreation(nodeTree, actions);
              },
            },
          )
        }
        style={{ width: '100%' }}
      >
        Header
      </AntButton>
      <AntButton
        ref={(r) =>
          connectors.create(
            r,
            <Column>
              <Text text="Double Click Me" />
            </Column>,
            {
              onCreate: (nodeTree) => {
                selectOnCreation(nodeTree, actions);
              },
            },
          )
        }
        style={{ width: '100%' }}
      >
        Text
      </AntButton>
      <AntButton
        ref={(r) =>
          connectors.create(
            r,
            <Column>
              <Input type="text" label="Double Click Me" />
            </Column>,
            {
              onCreate: (nodeTree) => {
                selectOnCreation(nodeTree, actions);
              },
            },
          )
        }
        style={{ width: '100%' }}
      >
        Input
      </AntButton>
      <AntButton
        ref={(r) =>
          connectors.create(
            r,
            <Column>
              <Table />
            </Column>,
            {
              onCreate: (nodeTree) => {
                selectOnCreation(nodeTree, actions);
              },
            },
          )
        }
        style={{ width: '100%' }}
      >
        Table
      </AntButton>
      <AntButton
        ref={(r) =>
          connectors.create(
            r,
            <Column>
              <Element is={Container} padding={20} canvas />
            </Column>,
            {
              onCreate: (nodeTree) => {
                selectOnCreation(nodeTree, actions);
              },
            },
          )
        }
        style={{ width: '100%' }}
      >
        Container
      </AntButton>
    </Row>
  );
};

export const SettingsPanel = () => {
  const { selected, deleteId, actions } = useEditor((state) => {
    const currentNodeId = Array.from(state.events.selected).find(
      (id) => state.nodes[id]?.data.name !== 'Column',
    );
    const currentColumn = Array.from(state.events.selected)
      .map((id) => state.nodes[id])
      .find((node) => node && node.data.name === 'Column');

    let selected;

    if (currentNodeId) {
      selected = {
        id: currentNodeId,
        name: state.nodes[currentNodeId].data.name,
        settings: state.nodes[currentNodeId].related && state.nodes[currentNodeId].related.settings,
      };
    }

    let deleteId;

    if (currentColumn) {
      const parentRow = currentColumn.data.parent && state.nodes[currentColumn.data.parent];
      if (parentRow && parentRow.data.nodes.length === 1) {
        deleteId = parentRow.id;
      } else {
        deleteId = currentColumn.id;
      }
    }

    return { selected, deleteId };
  });

  return (
    <>
      {selected ? (
        selected.settings && React.createElement(selected.settings)
      ) : (
        <Row>No settings available</Row>
      )}
      {deleteId && (
        <Row>
          <AntButton danger onClick={() => actions.delete(deleteId)}>
            Delete
          </AntButton>
        </Row>
      )}
    </>
  );
};
