ALTER TABLE "competence"
  ADD CONSTRAINT user_or_space_id_and_owner_type
  CHECK (
    -- exactly one of spaceId / userId is non-empty
    (
      (nullif("spaceId", '') IS NOT NULL)::int
      + (nullif("userId",  '') IS NOT NULL)::int
    ) = 1
    -- AND ensure ownerType lines up
    AND
    (
      -- if it’s a SPACE competence, spaceId must be non-empty and userId empty
      ("ownerType" = 'SPACE'
        AND nullif("spaceId", '') IS NOT NULL
        AND nullif("userId",  '') IS NULL
      )
      OR
      -- if it’s a USER competence, userId must be non-empty and spaceId empty
      ("ownerType" = 'USER'
        AND nullif("userId",  '') IS NOT NULL
        AND nullif("spaceId", '') IS NULL
      )
    )
  );
-- adapted after
-- https://dba.stackexchange.com/questions/190505/create-a-constraint-such-that-only-one-of-two-fields-must-be-filled
