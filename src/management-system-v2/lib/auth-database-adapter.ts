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
    const newUser = await addUser({
      ...user,
      profileImage: 'image' in user && typeof user.image === 'string' ? user.image : null,
      isGuest: false,
      emailVerifiedOn: null,
    });

    if (newUser.isErr()) throw newUser.error;

    return newUser.value;
  },
  getUser: async (id: string) => {
    const user = await getUserById(id);
    if (user.isErr()) throw user.error;
    return user.value;
  },
  updateUser: async (user: AuthenticatedUser) => {
    const res = await updateUser(user.id, { ...user, isGuest: false });
    if (res.isErr()) throw res.error;
    return res.value;
  },
  getUserByEmail: async (email: string) => {
    const user = await getUserByEmail(email);
    if (user.isErr()) throw user.error;
    return user.value;
  },
  createVerificationToken: async ({ expires, ...token }: VerificationToken) => {
    const newToken = await saveEmailVerificationToken({
      type: 'signin_with_email',
      ...token,
      expires,
    });
    if (newToken.isErr()) throw newToken.error;
    return newToken.value;
  },
  useVerificationToken: async (params: { identifier: string; token: string }) => {
    try {
      // next-auth checks if the token is expired
      const token = await deleteEmailVerificationToken(params);
      if (token.isErr()) {
        throw token;
      }

      if (token.value.type === 'signin_with_email' || token.value.type === 'register_new_user')
        return token.value;
      else return null;
    } catch (_) {
      return null;
    }
  },
  linkAccount: async (account: AdapterAccount) => {
    const newAccount = await addOauthAccount({
      userId: account.userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    });
    if (newAccount.isErr()) throw newAccount.error;
    return newAccount.value;
  },
  getUserByAccount: async (account: AdapterAccount) => {
    const userAccount = await getOauthAccountByProviderId(
      account.provider,
      account.providerAccountId,
    );
    if (userAccount.isErr()) {
      throw userAccount.error;
    }

    if (!userAccount.value) return null;

    const user = await getUserById(userAccount.value.userId);
    if (user.isErr()) throw user.error;
    return user.value as unknown as AdapterAccount;
  },
};

export default Adapter as unknown as Adapter;
