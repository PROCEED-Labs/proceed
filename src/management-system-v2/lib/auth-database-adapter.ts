import {
  getUserById,
  addUser,
  getUserByEmail,
  updateUser,
  addOauthAccount,
  getOauthAccountByProviderId,
} from '@/lib/data/db/iam/users';
import {
  saveEmailVerificationToken,
  deleteEmailVerificationToken,
} from '@/lib/data/db/iam/verification-tokens';
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
  createVerificationToken: async ({ expires, ...token }: VerificationToken) => {
    return await saveEmailVerificationToken({
      type: 'signin_with_email',
      ...token,
      expires,
    });
  },
  useVerificationToken: async (params: { identifier: string; token: string }) => {
    try {
      // next-auth checks if the token is expired
      const token = await deleteEmailVerificationToken(params);
      if (token.isErr()) {
        throw token;
      }

      if (token.value.type === 'signin_with_email' || token.value.type === 'register_new_user')
        return token;
      else return null;
    } catch (_) {
      return null;
    }
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
    if (userAccount.isErr()) {
      return userAccount;
    }

    if (!userAccount.value) return null;

    return getUserById(userAccount.value.userId) as unknown as AdapterAccount;
  },
};

export default Adapter as unknown as Adapter;
