import { ReactNode } from 'react';
import { Typography } from 'antd';
import { DisplayTable, RelevantInstanceInfo } from './instance-info-panel';
import styles from './element-status.module.scss';

type EntryTextProps = React.ComponentProps<typeof Typography.Text>;
const EntryText = (props: EntryTextProps) => (
  <Typography.Text className={styles.ElementText} {...props} />
);

export function ElementInfo({ info }: { info: RelevantInstanceInfo }) {
  const infoEntries: ReactNode[][] = [];

  infoEntries.push([<EntryText>ProcessName</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([<EntryText>ProcessShortName</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([<EntryText>ProcessVersionName</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([
    <EntryText>ProcessVersionDescription</EntryText>,
    <EntryText>Value</EntryText>,
  ]);
  infoEntries.push([<EntryText>ProcessVersionCreatedOn</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([
    <EntryText>ProcessInstanceInitiatorFullName</EntryText>,
    <EntryText>Value</EntryText>,
  ]);
  infoEntries.push([
    <EntryText>ProcessInstanceInitiatorSpaceName</EntryText>,
    <EntryText>Value</EntryText>,
  ]);
  infoEntries.push([
    <EntryText>ProcessInstanceInitiatorSpaceName</EntryText>,
    <EntryText>Value</EntryText>,
  ]);
  infoEntries.push([<EntryText>InstanceStartTime</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([<EntryText>ProcessStepId</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([<EntryText>ProcessStepName</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([<EntryText>ProcessStepType</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([<EntryText>ActualPerformerName</EntryText>, <EntryText>Value</EntryText>]);
  infoEntries.push([<EntryText>ProcessEngineName</EntryText>, <EntryText>Value</EntryText>]);

  return <DisplayTable data={infoEntries} />;
}
