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
DECLARE
  uid UUID := auth.uid();
BEGIN
  -- Explicitly clean up game-related rows in user's pods
  -- to avoid FK ordering issues during cascade
  DELETE FROM game_players WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (
      SELECT id FROM pods WHERE host_id = uid
    )
  );
  DELETE FROM game_votes WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (
      SELECT id FROM pods WHERE host_id = uid
    )
  );
  DELETE FROM badge_attributions WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (
      SELECT id FROM pods WHERE host_id = uid
    )
  );
  DELETE FROM aura_history WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (
      SELECT id FROM pods WHERE host_id = uid
    )
  );
  DELETE FROM badge_history WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (
      SELECT id FROM pods WHERE host_id = uid
    )
  );
  DELETE FROM badge_vote_history WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (
      SELECT id FROM pods WHERE host_id = uid
    )
  );

  -- Delete the auth user row; CASCADE handles the rest
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Only authenticated users can call this
REVOKE ALL ON FUNCTION delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
