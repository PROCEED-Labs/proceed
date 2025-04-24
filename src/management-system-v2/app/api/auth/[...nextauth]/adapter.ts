import {
  getUserById,
  addUser,
  getUserByEmail,
  updateUser,
  addOauthAccount,
  getOauthAccountByProviderId,
} from '@/lib/data/db/iam/users';
import {
  saveVerificationToken,
  deleteVerificationToken,
  getVerificationToken,
} from '@/lib/data/db/iam/verificaiton-tokens';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { type Adapter, AdapterAccount, VerificationToken } from 'next-auth/adapters';

const Adapter = {
  createUser: async (
    user: Omit<AuthenticatedUser, 'id'> | { email: string; emailVerified: Date },
  ) => {
    return addUser({
      ...user,
      profileImage: 'image' in user && typeof user.image === 'string' ? user.image : null,
      isGuest: false,
      emailVerifiedOn: null,
    });
  },
  getUser: async (id: string) => {
    return getUserById(id);
  },
  updateUser: async (user: AuthenticatedUser) => {
    return updateUser(user.id, { ...user, isGuest: false });
  },
  getUserByEmail: async (email: string) => {
    return getUserByEmail(email) ?? null;
  },
  createVerificationToken: async (token: VerificationToken) => {
    return await saveVerificationToken(token);
  },
  useVerificationToken: async (params: { identifier: string; token: string }) => {
    // next-auth checks if the token is expired
    const token = await getVerificationToken(params);
    if (token) await deleteVerificationToken(params);

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
