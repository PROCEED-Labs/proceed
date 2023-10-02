import { ComponentProps } from 'react';
import { AuthCan, AuthCanProps } from './iamComponents';

export default function Auth(authOptions: AuthCanProps, Component: FC<any>) {
  function wrappedComponent(props: ComponentProps<typeof Component>) {
    return (
      <AuthCan {...authOptions}>
        <Component {...props} />
      </AuthCan>
    );
  }

  return wrappedComponent;
}
