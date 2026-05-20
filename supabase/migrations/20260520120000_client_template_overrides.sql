-- Per-client overrides for the four WhatsApp message templates surfaced on the
-- Clients tab. When a row exists for (zoho_contact_id, template_key) the UI
-- uses its custom_text; otherwise it falls back to the canonical German default
-- in constants/translations.ts. Append-only is NOT required here — overrides
-- are mutable and there is no value in preserving past versions of a copy-paste
-- snippet, so we upsert on the unique constraint.
CREATE TABLE client_template_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zoho_contact_id text NOT NULL,
  template_key text NOT NULL,
  custom_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_client_template UNIQUE (zoho_contact_id, template_key)
);

CREATE INDEX idx_client_templates_contact ON client_template_overrides (zoho_contact_id);
