import { Typography } from 'antd';

type EntryTextProps = React.ComponentProps<typeof Typography.Text> & {
  missingColorOverride?: string;
};
/**
 * component to display an antd Typography.Text component,
 * that changes it's look if no children are passed.
 * @param props of component <Typography.Text/>
 */
export const EntryText = (props: EntryTextProps) => {
  return props.children ? (
    <Typography.Text {...props} />
  ) : (
    <Typography.Text
      {...props}
      style={{
        color: props.missingColorOverride || '#aaa',
        fontStyle: 'normal',
        fontSize: 'normal',
        fontWeight: 'normal',
      }}
    >
      N/A
    </Typography.Text>
  );
};
