import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import "server-only";

/**
 * Service-role client — bypasses RLS entirely. Only for server routes that
 * need to write timetable/calendar reference data or orchestrate group
 * override confirmations on behalf of the group rather than one student.
 * The `server-only` import makes bundling this into a Client Component a
 * build error; never import it outside `route.ts` / server actions
 * (spec §12: "Service role key never reaches the client").
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
