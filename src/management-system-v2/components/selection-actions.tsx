import styles from './selection-actions.module.scss';
import cn from 'classnames';

type SelectionActionsProps = {
  count?: number;
  children: React.ReactNode;
};

const SelectionActions = ({ count, children }: SelectionActionsProps) => {
  return count ? (
    <span
      className={cn(styles.SelectedRow, count == 1 ? styles['one-row'] : styles['multiple-rows'])}
      role="note"
    >
      {count} selected:
      <span className={styles.Icons}>{children}</span>
    </span>
  ) : undefined;
};

export default SelectionActions;
