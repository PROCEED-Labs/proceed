import styles from './selection-actions.module.scss';

type SelectionActionsProps = {
  count?: number;
  children: React.ReactNode;
};

const SelectionActions = ({ count, children }: SelectionActionsProps) => {
  return count ? (
    <span className={styles.SelectedRow} role="note">
      {count} selected:
      <span className={styles.Icons}>{children}</span>
    </span>
  ) : undefined;
};

export default SelectionActions;
