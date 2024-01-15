import { AuthOptions } from 'next-auth';
import { User } from '@/types/next-auth';
import { randomUUID } from 'crypto';
import { getRoles } from '@/lib/data/legacy/iam/roles';
import { addRoleMappings } from '@/lib/data/legacy/iam/role-mappings';
import { addUser, usersMetaObject } from '@/lib/data/legacy/iam/users';

export const nextAuthOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    async jwt({ token, user: _user, trigger, account }) {
      if (trigger === 'signIn') token.csrfToken = randomUUID();

      if (_user) {
        token.user = { ..._user } as User;
        const provider = account?.provider ?? 'none';
        const nameSpacedId = `${provider}:${_user.id}`;
        token.user.id = nameSpacedId;
      }

      const user = token.user;

      if (
        process.env.NODE_ENV === 'development' &&
        account?.provider === 'auth0' &&
        user.username === 'admin' &&
        (trigger === 'signIn' || trigger === 'signUp')
      ) {
        const adminRole = getRoles().find((role) => role.name === '@admin');

        if (!adminRole) throw new Error('Admin role not found');

        if (!adminRole.members.find((member) => member.userId === user.id))
          // @ts-ignore
          addRoleMappings([{ userId: user.id, roleId: adminRole.id }]);
      }

      if (trigger === 'signUp' || trigger === 'signIn') {
        if (!usersMetaObject[user.id])
          addUser({
            id: user.id,
            oauthProvider: account?.provider ?? 'none',
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            image: user.image ?? '',
          });
      }

      return token;
    },
    session(args) {
      const { session, token } = args;
      if (token.user) session.user = token.user;
      session.csrfToken = token.csrfToken;
      return session;
    },
  },
};
