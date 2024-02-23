import {
  getUserById,
  addUser,
  getUserByEmail,
  updateUser,
  addOauthAccount,
  getOauthAccountByProviderId,
} from '@/lib/data/legacy/iam/users';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { Adapter, AdapterAccount, VerificationToken } from 'next-auth/adapters';

const invitationTokens = new Map<string, VerificationToken>();

const Adapter = {
  createUser: async (
    user: Omit<AuthenticatedUser, 'id'> | { email: string; emailVerified: Date },
  ) => {
    return addUser({
      image: null,
      ...user,
      guest: false,
    });
  },
  getUser: async (id: string) => {
    return getUserById(id);
  },
  updateUser: async (user: AuthenticatedUser) => {
    return updateUser(user.id, user);
  },
  getUserByEmail: async (email: string) => {
    return getUserByEmail(email) ?? null;
  },
  createVerificationToken: async (token: VerificationToken) => {
    invitationTokens.set(token.identifier, token);
    return token;
  },
  useVerificationToken: async ({ identifier }: { identifier: string; token: string }) => {
    // next-auth checks if the token is expired
    const storedToken = invitationTokens.get(identifier);
    invitationTokens.delete(identifier);

    return storedToken ?? null;
  },
  linkAccount: async (account: AdapterAccount) => {
    return addOauthAccount({
      userId: account.userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    });
  },
  getUserByAccount: async (account: AdapterAccount) => {
    const userAccount = getOauthAccountByProviderId(account.provider, account.providerAccountId);

    if (!userAccount) return null;

    return getUserById(userAccount.userId) as unknown as AdapterAccount;
  },
};

export default Adapter as unknown as Adapter;
