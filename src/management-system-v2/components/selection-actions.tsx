import styles from './selection-actions.module.scss';
import cn from 'classnames';

type SelectionActionsProps = {
  count?: number;
  children: React.ReactNode;
  readOnly?: boolean;
};

const SelectionActions = ({ count, children, readOnly = false }: SelectionActionsProps) => {
  return count ? (
    <span
      className={cn(
        styles.SelectedRow,
        count == 1 ? styles['one-row'] : styles['multiple-rows'],
        !readOnly && styles.editable,
      )}
      // role="note"
    >
      <span role="note" className={cn(styles.counter)}>
        {count} selected:
      </span>
      <span className={styles.Icons}>{children}</span>
    </span>
  ) : undefined;
};

export default SelectionActions;
