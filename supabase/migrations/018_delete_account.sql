-- ── Delete Account RPC ────────────────────────────────────────
-- Allows the authenticated user to fully delete their own account,
-- including the auth.users row. Runs as SECURITY DEFINER so it has
-- permission to delete from auth.users.
-- All child tables with ON DELETE CASCADE will be cleaned up
-- automatically when the auth.users row is removed.

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the auth user row; CASCADE handles profiles + all child tables
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Only authenticated users can call this
REVOKE ALL ON FUNCTION delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
