import { xmcpHandler, withAuth, VerifyToken } from '@xmcp/adapter';

const verifyToken: VerifyToken = async (req: Request, bearerToken?: string) => {
  if (!bearerToken) {
    return {
      token: '',
      clientId: 'mcp-client',
      scopes: ['read:authentication'],
    };
  }

  console.log(bearerToken);

  return {
    token: bearerToken,
    clientId: 'mcp-client',
    scopes: ['read:authentication', 'read:processes'],
    // expiresAt: undefined,
    // resource: undefined,
    extra: {
      userId: '',
      spaceId: '',
    },
  };
};

const options = {
  verifyToken,
  required: true,
  requiredScopes: [],
};

const handler = withAuth(xmcpHandler, options);

export { handler as GET, handler as POST };
