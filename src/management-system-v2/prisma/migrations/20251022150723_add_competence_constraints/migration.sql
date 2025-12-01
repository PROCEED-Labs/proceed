ALTER TABLE "competence"
  ADD CONSTRAINT only_one_of_spaceId_or_userId_is_nullable
  CHECK (
    (
      type = 'SPACE'
      AND "spaceId" IS NOT NULL
    )
    OR
    (
      type = 'USER'
      AND "creatorUserId" IS NOT NULL
      AND "spaceId" IS NULL
    )
);