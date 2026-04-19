-- 회원이 soft delete 되면 ministry 배정에서 자동 제거
CREATE OR REPLACE FUNCTION cleanup_member_assignments_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false) THEN
    DELETE FROM ministry_companions WHERE member_id = NEW.id;
    DELETE FROM ministry_member_recipients WHERE member_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_member_assignments
  AFTER UPDATE OF is_deleted ON members
  FOR EACH ROW EXECUTE FUNCTION cleanup_member_assignments_on_soft_delete();
