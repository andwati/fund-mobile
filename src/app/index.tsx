import { Redirect } from 'expo-router';

import { useSession } from '@/auth/session';

/** `/` just sends people where they belong; the real screens live in the (app) and (auth) groups. */
export default function Index() {
  const { status } = useSession();
  return <Redirect href={status === 'signed-in' ? '/overview' : '/sign-in'} />;
}
