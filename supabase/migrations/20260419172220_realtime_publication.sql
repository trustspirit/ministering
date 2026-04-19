-- Realtime Postgres Changes requires supabase_realtime publication membership
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE households;
ALTER PUBLICATION supabase_realtime ADD TABLE ministries;
ALTER PUBLICATION supabase_realtime ADD TABLE ministry_companions;
ALTER PUBLICATION supabase_realtime ADD TABLE ministry_member_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE ministry_household_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE app_user_profiles;
