import { getAbilityForUser } from '@/lib/authorization/authorization';
import { env } from '@/lib/ms-config/env-vars';
import { xmcpHandler, withAuth, VerifyToken } from '@xmcp/adapter';
import jwt, { JwtPayload } from 'jsonwebtoken';

const verifyToken: VerifyToken = async (req: Request, bearerToken?: string) => {
  const auth = {
    token: '',
    clientId: 'mcp-client',
    scopes: ['read:authentication'],
    extra: {},
  };

  if (!bearerToken) {
    return auth;
  }

  auth.token = bearerToken;

  const secret = env.IAM_MCP_ACCESS_ENCRYPTION_SECRET;

  if (!secret) {
    console.error(
      'An mcp client wants to access the mcp server but there is no secret set to create/verify access tokens. Please set IAM_GUEST_CONVERSION_REFERENCE_SECRET in the environment if you want to use MCP.',
    );

    return;
  }

  let tokenContent: JwtPayload;
  try {
    const content = jwt.verify(bearerToken, secret);
    if (typeof content === 'string') return;
    tokenContent = content;
  } catch (err) {
    // validation failed
    console.error('MCP token validation failed:', err);
    return auth;
  }

  const { sub: userId, environmentId } = tokenContent;

  if (!userId || !environmentId) return auth;

  const ability = await getAbilityForUser(userId, environmentId);

  if (ability.can('view', 'Process')) auth.scopes.push('read:processes');

  auth.extra = {
    userId: tokenContent.sub,
    spaceId: tokenContent.environmentId,
    ability,
  };

  return {
    token: bearerToken,
    clientId: 'mcp-client',
    scopes: ['read:authentication', 'read:processes'],
    // expiresAt: tokenContent.exp,
    // resource: undefined,
    extra: {
      userId: tokenContent.sub,
      spaceId: tokenContent.environmentId,
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
