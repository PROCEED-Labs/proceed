-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION set_deletable_and_deletedon_based_on_refcounter()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the refCounter is 0
  IF NEW."refCounter" = 0 THEN
    -- Set deletable to true and set deletedOn to the current date and time
    NEW."deletable" := TRUE;
    NEW."deletedOn" := CURRENT_TIMESTAMP;
  ELSE
    -- Set deletable to false and clear the deletedOn field
    NEW."deletable" := FALSE;
    NEW."deletedOn" := NULL;
  END IF;

  -- Return the updated row
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger
CREATE TRIGGER update_deletable_and_deletedon_on_refcounter_change
BEFORE INSERT OR UPDATE OF "refCounter"
ON artifact
FOR EACH ROW
EXECUTE FUNCTION set_deletable_and_deletedon_based_on_refcounter();


-- Step 1: Create the function to update refCounter
CREATE OR REPLACE FUNCTION update_artifact_refcounter()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment refCounter when a new reference is added
        UPDATE artifact
        SET "refCounter" = "refCounter" + 1
        WHERE id = NEW."artifactId";
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement refCounter when a reference is removed
        UPDATE artifact
        SET "refCounter" = GREATEST("refCounter" - 1, 0)
        WHERE id = OLD."artifactId";
    END IF;
    RETURN NULL; -- for AFTER triggers, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger
CREATE TRIGGER update_refcounter_on_artifact_reference_change
AFTER INSERT OR DELETE ON artifact_reference
FOR EACH ROW
EXECUTE FUNCTION update_artifact_refcounter();

