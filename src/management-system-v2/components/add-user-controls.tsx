'use client';

import { useAbilityStore } from '@/lib/abilityStore';
import { CheckerType, useAddControlCallback, useControler } from '@/lib/controls-store';
import React, { FC } from 'react';

type ControlComponent = {
  name: string;
  checker?: CheckerType;
};

/**
 * Component for easily adding user controls in Server- or Client-Compnents.
 *
 * @component
 * @param {string} name - The name of the control-area.
 * @param {CheckerType} [checker] - The checker object for handling control events.
 * @returns {JSX.Element} The rendered component.
 */
const AddUserControls: FC<ControlComponent> = ({ name, checker }) => {
  const ability = useAbilityStore((state) => state.ability);

  /* User-Controls */
  const controlChecker: CheckerType = checker ?? {
    selectall: (e) => (e.ctrlKey || e.metaKey) && e.key === 'a',
    esc: (e) => e.key === 'Escape',
    del: (e) => e.key === 'Delete' && ability.can('delete', 'Process'),
    copy: (e) => (e.ctrlKey || e.metaKey) && e.key === 'c' && ability.can('create', 'Process'),
    paste: (e) => (e.ctrlKey || e.metaKey) && e.key === 'v' && ability.can('create', 'Process'),
    'control+enter': (e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter',
    'shift+enter': (e) => e.shiftKey && e.key === 'Enter',
    enter: (e) => !(e.ctrlKey || e.metaKey) && e.key === 'Enter',
    cut: (e) => (e.ctrlKey || e.metaKey) && e.key === 'x' /* TODO: ability */,
    export: (e) => (e.ctrlKey || e.metaKey) && e.key === 'e',
    import: (e) => (e.ctrlKey || e.metaKey) && e.key === 'i',
    'control+arrowup': (e) => (e.ctrlKey || e.metaKey) && e.key === 'ArrowUp',
    'control+arrowdown': (e) => (e.ctrlKey || e.metaKey) && e.key === 'ArrowDown',
    'control+arrowleft': (e) => (e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft',
    'control+arrowright': (e) => (e.ctrlKey || e.metaKey) && e.key === 'ArrowRight',
    undo: (e) => (e.ctrlKey || e.metaKey) && e.key === 'z',
    redo: (e) => (e.ctrlKey || e.metaKey) && e.key === 'y',
    new: (e) => (e.ctrlKey || e.metaKey) && e.key === 'n',
    left: (e) => e.key === 'ArrowLeft',
    right: (e) => e.key === 'ArrowRight',
    up: (e) => e.key === 'ArrowUp',
    down: (e) => e.key === 'ArrowDown',
  };

  useControler(name, controlChecker);
  return <></>;
};

export default AddUserControls;
