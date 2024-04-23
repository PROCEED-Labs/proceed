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
    selectall: (e) => e.ctrlKey && e.key === 'a',
    esc: (e) => e.key === 'Escape',
    del: (e) => e.key === 'Delete' && ability.can('delete', 'Process'),
    copy: (e) => (e.ctrlKey || e.metaKey) && e.key === 'c' && ability.can('create', 'Process'),
    paste: (e) => (e.ctrlKey || e.metaKey) && e.key === 'v' && ability.can('create', 'Process'),
    controlenter: (e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter',
    shiftenter: (e) => e.shiftKey && e.key === 'Enter',
    enter: (e) => !(e.ctrlKey || e.metaKey) && e.key === 'Enter',
    cut: (e) => (e.ctrlKey || e.metaKey) && e.key === 'x' /* TODO: ability */,
    export: (e) => (e.ctrlKey || e.metaKey) && e.key === 'e',
    import: (e) => (e.ctrlKey || e.metaKey) && e.key === 'i',
  };

  useControler(name, controlChecker);

  // useAddControlCallback(
  //   name,
  //   'selectall',
  //   () => {
  //     console.log(`selectall from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'esc',
  //   () => {
  //     console.log(`esc from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'del',
  //   () => {
  //     console.log(`del from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'copy',
  //   () => {
  //     console.log(`copy from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'paste',
  //   () => {
  //     console.log(`paste from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'controlenter',
  //   () => {
  //     console.log(`controlenter from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'shiftenter',
  //   () => {
  //     console.log(`shiftenter from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'enter',
  //   () => {
  //     console.log(`enter from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'cut',
  //   () => {
  //     console.log(`cut from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'export',
  //   () => {
  //     console.log(`export from ${name}`);
  //   },
  //   { level: 5 },
  // );
  // useAddControlCallback(
  //   name,
  //   'import',
  //   () => {
  //     console.log(`import from ${name}`);
  //   },
  //   { level: 5 },
  // );

  return <></>;
};

export default AddUserControls;
