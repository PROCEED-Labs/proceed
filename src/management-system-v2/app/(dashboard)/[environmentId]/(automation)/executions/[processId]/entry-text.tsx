import { Typography } from 'antd';

type EntryTextProps = React.ComponentProps<typeof Typography.Text> & {
  missingColorOverride?: string;
  missingTextOverride?: string;
};
/**
 * component to display an antd Typography.Text component,
 * that changes it's look if no children are passed.
 * @param props of component <Typography.Text/>
 */
export const EntryText = (props: EntryTextProps) => {
  const { missingColorOverride, missingTextOverride, ...restProps } = props;
  return restProps.children ? (
    <Typography.Text {...restProps} />
  ) : (
    <Typography.Text
      {...restProps}
      style={{
        color: missingColorOverride || '#aaa',
        fontStyle: 'normal',
        fontSize: 'normal',
        fontWeight: 'normal',
      }}
    >
      {missingTextOverride ?? 'N/A'}
    </Typography.Text>
  );
};
