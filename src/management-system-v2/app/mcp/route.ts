import { env } from '@/lib/ms-config/env-vars';
import { xmcpHandler, withAuth, VerifyToken } from '@xmcp/adapter';
import jwt from 'jsonwebtoken';

const verifyToken: VerifyToken = async (req: Request, bearerToken?: string) => {
  if (!bearerToken) {
    return {
      token: '',
      clientId: 'mcp-client',
      scopes: ['read:authentication'],
    };
  }

  console.log(bearerToken);

  const secret = env.IAM_MCP_ACCESS_ENCRYPTION_SECRET;

  if (!secret) {
    console.error(
      'An mcp client wants to access the mcp server but there is no secret set to create/verify access tokens. Please set IAM_GUEST_CONVERSION_REFERENCE_SECRET in the environment if you want to use MCP.',
    );

    return;
  }

  console.log(jwt.verify(bearerToken, secret));

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
