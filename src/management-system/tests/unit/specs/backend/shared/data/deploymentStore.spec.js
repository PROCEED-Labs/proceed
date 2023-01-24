import {
  getDeployments,
  updateDeployment,
  removeDeployment,
  getInstances,
  updateInstance,
  removeInstance,
} from '@/backend/shared-electron-server/data/deployment.js';

jest.mock('@/backend/shared-electron-server/data/store.js', () => ({
  set: jest.fn(),
  get: jest.fn().mockReturnValue({}),
}));

import eventHandler from '../../../../../../src/frontend/backend-api/event-system/EventHandler.js';

describe('the store for deployment information on known machines', () => {
  describe('deployment info handling', () => {
    describe('updateDeployment()', () => {
      it('allows new deployments to be added', () => {
        expect(getDeployments()).toStrictEqual({});

        updateDeployment('test', { deployment: 'info' });

        expect(getDeployments()).toStrictEqual({
          test: { deployment: 'info' },
        });
      });

      it('allows information of a known deployment to be updated', () => {
        updateDeployment('test', { deployment: 'info' });

        updateDeployment('test', { other: 'data' });

        expect(getDeployments()).toStrictEqual({
          test: { other: 'data' },
        });
      });

      it('will emit an event when a deployment is updated with new information', () => {
        const updateEventCallback = jest.fn();

        eventHandler.on('deployment_changed', updateEventCallback);

        updateDeployment('test', { deployment: 'info' });
        updateDeployment('test', { other: 'data' });

        expect(updateEventCallback).toHaveBeenCalledTimes(2);

        expect(updateEventCallback).toBeCalledWith({
          processDefinitionsId: 'test',
          info: { deployment: 'info' },
        });

        expect(updateEventCallback).toBeCalledWith({
          processDefinitionsId: 'test',
          info: { other: 'data' },
        });
      });

      it('will not emit an event when a deployment is updated with already existing information', () => {
        const updateEventCallback = jest.fn();

        eventHandler.on('deployment_changed', updateEventCallback);

        updateDeployment('test', { deployment: 'info' });
        updateDeployment('test', { deployment: 'info' });

        expect(updateEventCallback).toHaveBeenCalledTimes(1);

        expect(updateEventCallback).toBeCalledWith({
          processDefinitionsId: 'test',
          info: { deployment: 'info' },
        });
      });
    });

    describe('removeDeployment()', () => {
      it('will remove a deployment from the deployments list', () => {
        updateDeployment('test', { deployment: 'info' });

        expect(getDeployments()).toStrictEqual({ test: { deployment: 'info' } });

        removeDeployment('test');

        expect(getDeployments()).toStrictEqual({});
      });

      it('will emit an event when a deployment is removed from the list', () => {
        updateDeployment('test', { deployment: 'info' });

        expect(getDeployments()).toStrictEqual({ test: { deployment: 'info' } });

        const removeEventCallback = jest.fn();

        eventHandler.on('deployment_removed', removeEventCallback);

        removeDeployment('test');

        expect(removeEventCallback).toHaveBeenCalledWith('test');
      });

      it('will not emit an event when a deployment is removed that does not exist', () => {
        expect(getDeployments()).toStrictEqual({});

        const removeEventCallback = jest.fn();

        eventHandler.on('deployment_removed', removeEventCallback);

        removeDeployment('test');

        expect(removeEventCallback).not.toHaveBeenCalled();
      });
    });
  });

  describe('instance info handling', () => {
    describe('updateInstance()', () => {
      it('allows new instances to be added', () => {
        expect(getInstances()).toStrictEqual({});

        updateInstance('test', { instance: 'info' });

        expect(getInstances()).toStrictEqual({
          test: { instance: 'info' },
        });
      });

      it('allows information of a known instance to be updated', () => {
        updateInstance('test', { instance: 'info' });

        updateInstance('test', { other: 'data' });

        expect(getInstances()).toStrictEqual({
          test: { other: 'data' },
        });
      });

      it('will emit an event when an instance is updated with new information', () => {
        const updateEventCallback = jest.fn();

        eventHandler.on('instance_changed', updateEventCallback);

        updateInstance('test', { instance: 'info' });
        updateInstance('test', { other: 'data' });

        expect(updateEventCallback).toHaveBeenCalledTimes(2);

        expect(updateEventCallback).toBeCalledWith({
          instanceId: 'test',
          info: { instance: 'info' },
        });

        expect(updateEventCallback).toBeCalledWith({
          instanceId: 'test',
          info: { other: 'data' },
        });
      });

      it('will not emit an event when an instance is updated with already existing information', () => {
        const updateEventCallback = jest.fn();

        eventHandler.on('instance_changed', updateEventCallback);

        updateInstance('test', { instance: 'info' });
        updateInstance('test', { instance: 'info' });

        expect(updateEventCallback).toHaveBeenCalledTimes(1);

        expect(updateEventCallback).toBeCalledWith({
          instanceId: 'test',
          info: { instance: 'info' },
        });
      });
    });

    describe('removeInstance()', () => {
      it('will remove an instance from the instance list', () => {
        updateInstance('test', { instance: 'info' });

        expect(getInstances()).toStrictEqual({ test: { instance: 'info' } });

        removeInstance('test');

        expect(getInstances()).toStrictEqual({});
      });

      it('will emit an event when an instance is removed from the list', () => {
        updateInstance('test', { processId: 'process1', instance: 'info' });

        expect(getInstances()).toStrictEqual({ test: { processId: 'process1', instance: 'info' } });

        const removeEventCallback = jest.fn();

        eventHandler.on('instance_removed', removeEventCallback);

        removeInstance('test');

        expect(removeEventCallback).toHaveBeenCalledWith({
          definitionId: 'process1',
          instanceId: 'test',
        });
      });

      it('will not emit an event when an instance is removed that does not exist', () => {
        expect(getInstances()).toStrictEqual({});

        const removeEventCallback = jest.fn();

        eventHandler.on('instance_removed', removeEventCallback);

        removeInstance('test');

        expect(removeEventCallback).not.toHaveBeenCalled();
      });
    });
  });
});
