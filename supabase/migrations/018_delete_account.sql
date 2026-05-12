-- Delete Account RPC
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  DELETE FROM game_players WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (SELECT id FROM pods WHERE host_id = uid)
  );
  DELETE FROM game_votes WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (SELECT id FROM pods WHERE host_id = uid)
  );
  DELETE FROM badge_attributions WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (SELECT id FROM pods WHERE host_id = uid)
  );
  DELETE FROM aura_history WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (SELECT id FROM pods WHERE host_id = uid)
  );
  DELETE FROM badge_history WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (SELECT id FROM pods WHERE host_id = uid)
  );
  DELETE FROM badge_vote_history WHERE game_id IN (
    SELECT id FROM games WHERE pod_id IN (SELECT id FROM pods WHERE host_id = uid)
  );
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
