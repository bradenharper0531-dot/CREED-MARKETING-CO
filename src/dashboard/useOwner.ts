import { useAuth } from '../lib/auth.tsx';

/* Who is acting — used to sign notes ("Braden", "Peter") and stamp author ids. */
export function useActor() {
  const { profile } = useAuth();
  const first = (profile?.fullName || profile?.email || 'Owner').split(/[\s@]/)[0];
  return { id: profile?.id ?? null, name: first.charAt(0).toUpperCase() + first.slice(1) };
}
