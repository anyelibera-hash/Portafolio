import { getSession, json } from './_lib/auth.js';

export default async function handler(request) {
  let session = null;
  try {
    session = getSession(request);
  } catch {
    // SESSION_SECRET sin configurar → simplemente no hay sesión.
  }
  return json(
    { authenticated: !!session, user: session?.u || null },
    200,
    { 'cache-control': 'no-store' }
  );
}
