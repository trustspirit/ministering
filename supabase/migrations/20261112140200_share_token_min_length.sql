-- A share token must be unguessable: never store a short one.
-- (get_ministry_share already ignores tokens shorter than 32 characters.)
ALTER TABLE ministries
  ADD CONSTRAINT ministries_share_token_len CHECK (share_token IS NULL OR length(share_token) >= 32);
