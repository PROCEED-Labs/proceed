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

-- Create trigger to update the deletable flag
CREATE TRIGGER update_deletable_and_deletedon_on_refcounter_change
BEFORE INSERT OR UPDATE OF "refCounter" --condition to release the trigger
ON process_artifact
FOR EACH ROW
EXECUTE FUNCTION set_deletable_and_deletedon_based_on_refcounter();

CREATE OR REPLACE FUNCTION update_process_artifact_refcounter()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment refCounter when a new reference is added
        UPDATE process_artifact
        SET "refCounter" = "refCounter" + 1
        WHERE id = NEW."processArtifactId";
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement refCounter when a reference is removed
        UPDATE process_artifact
        SET "refCounter" = GREATEST("refCounter" - 1, 0)
        WHERE id = OLD."processArtifactId";
    END IF;
    RETURN NULL; -- for AFTER triggers, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the refCounter
CREATE TRIGGER update_refcounter_on_artifact_reference_change
AFTER INSERT OR DELETE ON artifact_reference --condition to release the trigger
FOR EACH ROW
EXECUTE FUNCTION update_process_artifact_refcounter();