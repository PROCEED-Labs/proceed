import { auth } from '@/lib/auth';
import { activateEnvrionment } from '@/lib/data/legacy/iam/environments';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { redirect } from 'next/navigation';

// TODO: prohibit already active users from using this route
export const GET = async (req: Request) => {
  let activationId;
  try {
    const session = await auth();
    if (!session) throw new UnauthorizedError();

    const { searchParams } = new URL(req.url);

    // NOTE: for now it is ok to set the activationId as the environmentId since it is a uuid
    activationId = searchParams.get('activationId');
    if (!activationId)
      return Response.json({ message: 'No activationId provided' }, { status: 400 });

    activateEnvrionment(activationId, session.user.id);
  } catch (e) {
    console.error(e);
    return Response.json({ message: 'Error activating environment' }, { status: 500 });
  }

  // Redirects don't work inside try/cath
  redirect(`/${activationId}/processes`);
};
