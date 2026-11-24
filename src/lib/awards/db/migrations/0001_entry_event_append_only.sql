-- entry_event is an append-only log (spec §3): refuse every way of changing or
-- removing a row, whatever the role. Row-level triggers also fire for cascades.
CREATE FUNCTION "entry_event_reject_change"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'entry_event is append-only: % is not allowed', TG_OP
		USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "entry_event_no_update_delete"
	BEFORE UPDATE OR DELETE ON "entry_event"
	FOR EACH ROW EXECUTE FUNCTION "entry_event_reject_change"();--> statement-breakpoint
CREATE TRIGGER "entry_event_no_truncate"
	BEFORE TRUNCATE ON "entry_event"
	FOR EACH STATEMENT EXECUTE FUNCTION "entry_event_reject_change"();
