import { CredentialsSignin } from 'next-auth';

export class NextAuthUsernameTakenError extends CredentialsSignin {
  static code = 'username_taken' as const;
  static message = 'This username is already taken. Please choose a different one.' as const;
  constructor(message?: string) {
    super(message || 'Username is already taken');
    this.code = NextAuthUsernameTakenError.code;
  }
}

export class NextAuthEmailTakenError extends CredentialsSignin {
  static code = 'email_taken' as const;
  static message = 'This E-Mail is already taken. Please choose a different one.' as const;
  constructor(message?: string) {
    super(message || 'Email is already taken');
    this.code = NextAuthEmailTakenError.code;
  }
}

export function getAuthJsErrorMessageFromType(error: string | null, code?: string | null) {
  if (!error) return null;

  let type = 'error';
  let message = 'Something went wrong. Please try again later.';

  const errorTypeMatch = error?.match(/^\$(?<type>\w+)\s+(?<message>.+)/);
  if (errorTypeMatch?.groups) {
    message = errorTypeMatch.groups.message;
    type = errorTypeMatch.groups.type;
  } else {
    switch (error) {
      case 'OAuthAccountNotLinked': //If the email on the account is already linked, but not with this OAuth account
        message =
          'This email is already used by another user. Please use a different email or sign out and try again to sign in to the existing account.';
        break;
      case 'EmailSignin': //Sending the e-mail with the verification token failed
        message = "Couldn't send the verification email. Please try again later.";
        break;
      case 'CredentialsSignin': //The authorize callback returned null in the Credentials provider.
        if (code === NextAuthUsernameTakenError.code) {
          message = NextAuthUsernameTakenError.message;
        } else if (code === NextAuthEmailTakenError.code) {
          message = NextAuthEmailTakenError.message;
        } else {
          message = 'Invalid credentials. Please try again.';
        }
        break;
      case 'SessionRequired': //The content of this page requires you to be signed in at all times. See useSession for configuration.
      case 'Callback': //Error in the OAuth callback handler route
      case 'EmailCreateAccount': //Could not create email provider user in the database.
      case 'OAuthCreateAccount': //Could not create OAuth provider user in the database.
      case 'OAuthCallback': //Error in handling the response (1, 2, 3) from an OAuth provider.
      case 'OAuthSignin': //Error in constructing an authorization URL
      case 'Default': //Catch all, will apply, if none of the above matched
        message = 'Something went wrong. Please try again later.';
        break;
    }
  }

  return { type: type as 'error' | 'success' | 'info' | 'warning', message };
}
