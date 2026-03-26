-- Create trigger function to sync favorites to customer_profiles
CREATE OR REPLACE FUNCTION sync_favorites_to_customer_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer_profiles with latest favorites array
  UPDATE customer_profiles
  SET 
    favorite_projects = (
      SELECT COALESCE(array_agg(project_id), '{}')
      FROM user_favorites
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    updated_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on user_favorites table
DROP TRIGGER IF EXISTS sync_favorites_trigger ON user_favorites;
CREATE TRIGGER sync_favorites_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION sync_favorites_to_customer_profile();

-- One-time sync of existing data: update all customer_profiles with correct favorites
UPDATE customer_profiles cp
SET 
  favorite_projects = (
    SELECT COALESCE(array_agg(uf.project_id), '{}')
    FROM user_favorites uf
    WHERE uf.user_id = cp.user_id
  ),
  updated_at = now()
WHERE cp.user_id IS NOT NULL;