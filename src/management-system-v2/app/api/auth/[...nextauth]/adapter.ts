import {
  getUserById,
  addUser,
  getUserByEmail,
  updateUser,
  addOauthAccount,
  getOauthAccountByProviderId,
} from '@/lib/data/DTOs';
import {
  saveVerificationToken,
  deleteVerificationToken,
  getVerificationToken,
} from '@/lib/data/legacy/verification-tokens';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { type Adapter, AdapterAccount, VerificationToken } from 'next-auth/adapters';

const Adapter = {
  createUser: async (
    user: Omit<AuthenticatedUser, 'id'> | { email: string; emailVerified: Date },
  ) => {
    return addUser({
      image: null,
      ...user,
      isGuest: false,
      emailVerifiedOn: null,
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
    return saveVerificationToken(token);
  },
  useVerificationToken: async (params: { identifier: string; token: string }) => {
    // next-auth checks if the token is expired
    const token = getVerificationToken(params);
    if (token) deleteVerificationToken(params);

    return token ?? null;
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
    const userAccount = await getOauthAccountByProviderId(
      account.provider,
      account.providerAccountId,
    );

    if (!userAccount) return null;

    return getUserById(userAccount.userId) as unknown as AdapterAccount;
  },
};

export default Adapter as unknown as Adapter;
