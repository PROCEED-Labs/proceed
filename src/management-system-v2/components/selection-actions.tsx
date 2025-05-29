import styles from './selection-actions.module.scss';
import cn from 'classnames';

type SelectionActionsProps = {
  count?: number;
  children: React.ReactNode;
  readOnly?: boolean;
};

const SelectionActions = ({ count, children, readOnly = false }: SelectionActionsProps) => {
  return count ? (
    <span className={cn(styles.SelectedRow, !readOnly && styles.editable)}>
      <span role="note" className={cn(styles.counter)}>
        {count} selected:
      </span>
      <span className={styles.Icons}>{children}</span>
    </span>
  ) : undefined;
};

export default SelectionActions;
