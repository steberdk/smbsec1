/**
 * migrate_to_smbsec1_schema.js
 *
 * Migrates SMBsec database from the `public` schema to a new `smbsec1` schema.
 * - Creates smbsec1 schema with grants
 * - Creates all tables (mirroring public schema)
 * - Copies all data
 * - Creates trigger functions and triggers
 * - Creates RLS helper functions
 * - Enables RLS and creates all policies
 * - Creates indexes
 * - Verifies row counts match
 *
 * Idempotent: safe to re-run. Uses DROP IF EXISTS / CREATE IF NOT EXISTS.
 * Does NOT drop public tables.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://postgres.spihqzsyqqfdnugyxtem:b8BEXafnrB3R2iyK@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // =========================================================================
    // STEP 1: Create schema and grants
    // =========================================================================
    console.log('Step 1: Creating smbsec1 schema...');
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS smbsec1;
      GRANT USAGE ON SCHEMA smbsec1 TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA smbsec1 GRANT ALL ON TABLES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA smbsec1 GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA smbsec1 GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
    `);
    console.log('  Done.');

    // =========================================================================
    // STEP 2: Create all tables (drop first for idempotency)
    // =========================================================================
    console.log('Step 2: Creating tables in smbsec1...');

    // Drop in reverse FK order for idempotency
    await client.query(`
      DROP TABLE IF EXISTS smbsec1.assessment_responses CASCADE;
      DROP TABLE IF EXISTS smbsec1.assessment_items CASCADE;
      DROP TABLE IF EXISTS smbsec1.assessments CASCADE;
      DROP TABLE IF EXISTS smbsec1.invites CASCADE;
      DROP TABLE IF EXISTS smbsec1.org_members CASCADE;
      DROP TABLE IF EXISTS smbsec1.orgs CASCADE;
      DROP TABLE IF EXISTS smbsec1.checklist_items CASCADE;
      DROP TABLE IF EXISTS smbsec1.checklist_groups CASCADE;
      DROP TABLE IF EXISTS smbsec1.user_checklists CASCADE;
    `);

    // 1. user_checklists
    console.log('  Creating user_checklists...');
    await client.query(`
      CREATE TABLE smbsec1.user_checklists (
        user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 2. orgs
    console.log('  Creating orgs...');
    await client.query(`
      CREATE TABLE smbsec1.orgs (
        id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        name           text        NOT NULL,
        created_by     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at     timestamptz NOT NULL DEFAULT now(),
        email_platform text        CHECK (email_platform IN ('google_workspace','microsoft_365','gmail_personal','other')),
        primary_os     text        CHECK (primary_os IN ('windows','mac','mixed')),
        company_size   text        CHECK (company_size IN ('1-5','6-20','21-50','50+'))
      );
    `);

    // 3. org_members
    console.log('  Creating org_members...');
    await client.query(`
      CREATE TABLE smbsec1.org_members (
        org_id          uuid    NOT NULL REFERENCES smbsec1.orgs(id) ON DELETE CASCADE,
        user_id         uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role            text    NOT NULL CHECK (role IN ('org_admin','manager','employee')),
        manager_user_id uuid    NULL,
        is_it_executor  boolean NOT NULL DEFAULT false,
        created_at      timestamptz NOT NULL DEFAULT now(),
        email           text,
        display_name    text,
        PRIMARY KEY (org_id, user_id),
        CONSTRAINT fk_manager
          FOREIGN KEY (org_id, manager_user_id)
          REFERENCES smbsec1.org_members(org_id, user_id)
          ON DELETE CASCADE
      );
    `);

    // 4. assessments
    console.log('  Creating assessments...');
    await client.query(`
      CREATE TABLE smbsec1.assessments (
        id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id       uuid        NOT NULL REFERENCES smbsec1.orgs(id) ON DELETE CASCADE,
        created_by   uuid        NOT NULL REFERENCES auth.users(id),
        scope        text        NOT NULL CHECK (scope IN ('org','subtree')),
        root_user_id uuid        NULL,
        status       text        NOT NULL CHECK (status IN ('active','completed')) DEFAULT 'active',
        created_at   timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL
      );
    `);

    // 5. assessment_items
    console.log('  Creating assessment_items...');
    await client.query(`
      CREATE TABLE smbsec1.assessment_items (
        id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id     uuid        NOT NULL REFERENCES smbsec1.assessments(id) ON DELETE CASCADE,
        checklist_item_id text        NOT NULL,
        group_id          text        NOT NULL,
        title             text        NOT NULL,
        description       text,
        order_index       int         NOT NULL,
        track             text        NOT NULL DEFAULT 'it_baseline' CHECK (track IN ('it_baseline','awareness')),
        impact            text        CHECK (impact IN ('high','medium','low')),
        effort            text        CHECK (effort IN ('minutes','hour','day')),
        created_at        timestamptz NOT NULL DEFAULT now(),
        why_it_matters    text,
        steps             jsonb       NOT NULL DEFAULT '[]'
      );
    `);

    // 6. assessment_responses
    console.log('  Creating assessment_responses...');
    await client.query(`
      CREATE TABLE smbsec1.assessment_responses (
        assessment_id      uuid        NOT NULL REFERENCES smbsec1.assessments(id) ON DELETE CASCADE,
        assessment_item_id uuid        NOT NULL REFERENCES smbsec1.assessment_items(id) ON DELETE CASCADE,
        user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        status             text        NOT NULL CHECK (status IN ('done','unsure','skipped')),
        updated_at         timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (assessment_item_id, user_id)
      );
    `);

    // 7. invites
    console.log('  Creating invites...');
    await client.query(`
      CREATE TABLE smbsec1.invites (
        id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id          uuid        NOT NULL REFERENCES smbsec1.orgs(id) ON DELETE CASCADE,
        invited_by      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        email           text        NOT NULL CHECK (email <> ''),
        role            text        NOT NULL CHECK (role IN ('manager','employee')),
        manager_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        is_it_executor  boolean     NOT NULL DEFAULT false,
        token           text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
        created_at      timestamptz NOT NULL DEFAULT now(),
        expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
        accepted_at     timestamptz NULL,
        updated_at      timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 8. checklist_groups
    console.log('  Creating checklist_groups...');
    await client.query(`
      CREATE TABLE smbsec1.checklist_groups (
        id          text        PRIMARY KEY,
        title       text        NOT NULL,
        description text,
        track       text        NOT NULL CHECK (track IN ('it_baseline','awareness')),
        order_index int         NOT NULL,
        active      boolean     NOT NULL DEFAULT true,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 9. checklist_items
    console.log('  Creating checklist_items...');
    await client.query(`
      CREATE TABLE smbsec1.checklist_items (
        id             text        PRIMARY KEY,
        group_id       text        NOT NULL REFERENCES smbsec1.checklist_groups(id),
        track          text        NOT NULL CHECK (track IN ('it_baseline','awareness')),
        title          text        NOT NULL,
        outcome        text,
        why_it_matters text,
        steps          jsonb       NOT NULL DEFAULT '[]',
        time_estimate  text,
        impact         text        CHECK (impact IN ('high','medium','low')),
        effort         text        CHECK (effort IN ('minutes','hour','day')),
        tags           text[]      NOT NULL DEFAULT '{}',
        order_index    int         NOT NULL,
        active         boolean     NOT NULL DEFAULT true,
        created_at     timestamptz NOT NULL DEFAULT now()
      );
    `);

    console.log('  All tables created.');

    // =========================================================================
    // STEP 3: Copy all data
    // =========================================================================
    console.log('Step 3: Copying data...');

    const tables = [
      'user_checklists',
      'orgs',
      'checklist_groups',
      'checklist_items',
    ];
    for (const t of tables) {
      const res = await client.query(
        `INSERT INTO smbsec1.${t} SELECT * FROM public.${t} ON CONFLICT DO NOTHING`
      );
      console.log(`  ${t}: ${res.rowCount} rows copied`);
    }

    // org_members — must copy without FK check on manager first (self-referencing)
    // Insert rows without manager first, then update manager references
    console.log('  Copying org_members (self-referencing FK)...');
    await client.query(`
      INSERT INTO smbsec1.org_members (org_id, user_id, role, manager_user_id, is_it_executor, created_at, email, display_name)
      SELECT org_id, user_id, role, NULL, is_it_executor, created_at, email, display_name
      FROM public.org_members
      ON CONFLICT DO NOTHING
    `);
    // Now set manager_user_id
    const mgrRes = await client.query(`
      UPDATE smbsec1.org_members sm
      SET manager_user_id = pm.manager_user_id
      FROM public.org_members pm
      WHERE sm.org_id = pm.org_id AND sm.user_id = pm.user_id AND pm.manager_user_id IS NOT NULL
    `);
    console.log(`  org_members: copied, ${mgrRes.rowCount} manager refs updated`);

    // assessments
    const assessRes = await client.query(
      `INSERT INTO smbsec1.assessments SELECT * FROM public.assessments ON CONFLICT DO NOTHING`
    );
    console.log(`  assessments: ${assessRes.rowCount} rows copied`);

    // assessment_items
    const aiRes = await client.query(
      `INSERT INTO smbsec1.assessment_items SELECT * FROM public.assessment_items ON CONFLICT DO NOTHING`
    );
    console.log(`  assessment_items: ${aiRes.rowCount} rows copied`);

    // assessment_responses
    const arRes = await client.query(
      `INSERT INTO smbsec1.assessment_responses SELECT * FROM public.assessment_responses ON CONFLICT DO NOTHING`
    );
    console.log(`  assessment_responses: ${arRes.rowCount} rows copied`);

    // invites
    const invRes = await client.query(
      `INSERT INTO smbsec1.invites SELECT * FROM public.invites ON CONFLICT DO NOTHING`
    );
    console.log(`  invites: ${invRes.rowCount} rows copied`);

    console.log('  Data copy complete.');

    // =========================================================================
    // STEP 4: Trigger function and triggers
    // =========================================================================
    console.log('Step 4: Creating trigger function and triggers...');

    await client.query(`
      CREATE OR REPLACE FUNCTION smbsec1.set_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$;
    `);

    // Drop triggers first for idempotency, then create
    await client.query(`
      DROP TRIGGER IF EXISTS trg_user_checklists_updated_at ON smbsec1.user_checklists;
      CREATE TRIGGER trg_user_checklists_updated_at
        BEFORE UPDATE ON smbsec1.user_checklists
        FOR EACH ROW EXECUTE FUNCTION smbsec1.set_updated_at();

      DROP TRIGGER IF EXISTS trg_invites_updated_at ON smbsec1.invites;
      CREATE TRIGGER trg_invites_updated_at
        BEFORE UPDATE ON smbsec1.invites
        FOR EACH ROW EXECUTE FUNCTION smbsec1.set_updated_at();
    `);
    console.log('  Done.');

    // =========================================================================
    // STEP 5: RLS helper functions
    // =========================================================================
    console.log('Step 5: Creating RLS helper functions...');

    await client.query(`
      CREATE OR REPLACE FUNCTION smbsec1.get_my_org_ids()
      RETURNS setof uuid
      LANGUAGE sql SECURITY DEFINER STABLE
      AS $$
        SELECT org_id FROM smbsec1.org_members WHERE user_id = auth.uid();
      $$;

      CREATE OR REPLACE FUNCTION smbsec1.is_org_admin(_org_id uuid)
      RETURNS boolean
      LANGUAGE sql SECURITY DEFINER STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM smbsec1.org_members
          WHERE org_id = _org_id AND user_id = auth.uid() AND role = 'org_admin'
        );
      $$;

      CREATE OR REPLACE FUNCTION smbsec1.is_org_member(_org_id uuid)
      RETURNS boolean
      LANGUAGE sql SECURITY DEFINER STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM smbsec1.org_members
          WHERE org_id = _org_id AND user_id = auth.uid()
        );
      $$;
    `);
    console.log('  Done.');

    // =========================================================================
    // STEP 6: Enable RLS and create policies
    // =========================================================================
    console.log('Step 6: Enabling RLS and creating policies...');

    // user_checklists RLS
    await client.query(`
      ALTER TABLE smbsec1.user_checklists ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "read own checklist" ON smbsec1.user_checklists;
      CREATE POLICY "read own checklist" ON smbsec1.user_checklists
        FOR SELECT TO authenticated USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "insert own checklist" ON smbsec1.user_checklists;
      CREATE POLICY "insert own checklist" ON smbsec1.user_checklists
        FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "update own checklist" ON smbsec1.user_checklists;
      CREATE POLICY "update own checklist" ON smbsec1.user_checklists
        FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    `);

    // orgs RLS
    await client.query(`
      ALTER TABLE smbsec1.orgs ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "members read org" ON smbsec1.orgs;
      CREATE POLICY "members read org" ON smbsec1.orgs
        FOR SELECT TO authenticated
        USING (id IN (SELECT smbsec1.get_my_org_ids()));

      DROP POLICY IF EXISTS "create org" ON smbsec1.orgs;
      CREATE POLICY "create org" ON smbsec1.orgs
        FOR INSERT TO authenticated
        WITH CHECK (created_by = auth.uid());

      DROP POLICY IF EXISTS "admin update org" ON smbsec1.orgs;
      CREATE POLICY "admin update org" ON smbsec1.orgs
        FOR UPDATE TO authenticated
        USING (smbsec1.is_org_admin(id)) WITH CHECK (smbsec1.is_org_admin(id));

      DROP POLICY IF EXISTS "admin delete org" ON smbsec1.orgs;
      CREATE POLICY "admin delete org" ON smbsec1.orgs
        FOR DELETE TO authenticated
        USING (smbsec1.is_org_admin(id));
    `);

    // org_members RLS
    await client.query(`
      ALTER TABLE smbsec1.org_members ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "members see peers" ON smbsec1.org_members;
      CREATE POLICY "members see peers" ON smbsec1.org_members
        FOR SELECT TO authenticated
        USING (org_id IN (SELECT smbsec1.get_my_org_ids()));

      DROP POLICY IF EXISTS "add member" ON smbsec1.org_members;
      CREATE POLICY "add member" ON smbsec1.org_members
        FOR INSERT TO authenticated
        WITH CHECK (
          org_id IN (SELECT smbsec1.get_my_org_ids())
          OR (
            role = 'org_admin'
            AND manager_user_id IS NULL
            AND EXISTS (SELECT 1 FROM smbsec1.orgs WHERE id = org_id AND created_by = auth.uid())
          )
        );

      DROP POLICY IF EXISTS "admin update member" ON smbsec1.org_members;
      CREATE POLICY "admin update member" ON smbsec1.org_members
        FOR UPDATE TO authenticated
        USING (smbsec1.is_org_admin(org_id)) WITH CHECK (smbsec1.is_org_admin(org_id));

      DROP POLICY IF EXISTS "admin delete member" ON smbsec1.org_members;
      CREATE POLICY "admin delete member" ON smbsec1.org_members
        FOR DELETE TO authenticated
        USING (smbsec1.is_org_admin(org_id));
    `);

    // assessments RLS
    await client.query(`
      ALTER TABLE smbsec1.assessments ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "members read assessments" ON smbsec1.assessments;
      CREATE POLICY "members read assessments" ON smbsec1.assessments
        FOR SELECT TO authenticated
        USING (smbsec1.is_org_member(org_id));

      DROP POLICY IF EXISTS "members create assessment" ON smbsec1.assessments;
      CREATE POLICY "members create assessment" ON smbsec1.assessments
        FOR INSERT TO authenticated
        WITH CHECK (smbsec1.is_org_member(org_id) AND created_by = auth.uid());

      DROP POLICY IF EXISTS "creator or admin update assessment" ON smbsec1.assessments;
      CREATE POLICY "creator or admin update assessment" ON smbsec1.assessments
        FOR UPDATE TO authenticated
        USING  (created_by = auth.uid() OR smbsec1.is_org_admin(org_id))
        WITH CHECK (created_by = auth.uid() OR smbsec1.is_org_admin(org_id));

      DROP POLICY IF EXISTS "admin delete assessment" ON smbsec1.assessments;
      CREATE POLICY "admin delete assessment" ON smbsec1.assessments
        FOR DELETE TO authenticated
        USING (smbsec1.is_org_admin(org_id));
    `);

    // assessment_items RLS
    await client.query(`
      ALTER TABLE smbsec1.assessment_items ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "members read items" ON smbsec1.assessment_items;
      CREATE POLICY "members read items" ON smbsec1.assessment_items
        FOR SELECT TO authenticated
        USING (EXISTS (
          SELECT 1 FROM smbsec1.assessments a
          WHERE a.id = assessment_id AND smbsec1.is_org_member(a.org_id)
        ));

      DROP POLICY IF EXISTS "creator insert items" ON smbsec1.assessment_items;
      CREATE POLICY "creator insert items" ON smbsec1.assessment_items
        FOR INSERT TO authenticated
        WITH CHECK (EXISTS (
          SELECT 1 FROM smbsec1.assessments a
          WHERE a.id = assessment_id AND a.created_by = auth.uid()
        ));
    `);

    // assessment_responses RLS
    await client.query(`
      ALTER TABLE smbsec1.assessment_responses ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "members read responses" ON smbsec1.assessment_responses;
      CREATE POLICY "members read responses" ON smbsec1.assessment_responses
        FOR SELECT TO authenticated
        USING (EXISTS (
          SELECT 1 FROM smbsec1.assessments a
          WHERE a.id = assessment_id AND smbsec1.is_org_member(a.org_id)
        ));

      DROP POLICY IF EXISTS "insert own response" ON smbsec1.assessment_responses;
      CREATE POLICY "insert own response" ON smbsec1.assessment_responses
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());

      DROP POLICY IF EXISTS "update own response" ON smbsec1.assessment_responses;
      CREATE POLICY "update own response" ON smbsec1.assessment_responses
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

      DROP POLICY IF EXISTS "admin delete response" ON smbsec1.assessment_responses;
      CREATE POLICY "admin delete response" ON smbsec1.assessment_responses
        FOR DELETE TO authenticated
        USING (EXISTS (
          SELECT 1 FROM smbsec1.assessments a
          WHERE a.id = assessment_id AND smbsec1.is_org_admin(a.org_id)
        ));
    `);

    // invites RLS
    await client.query(`
      ALTER TABLE smbsec1.invites ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "members read invites" ON smbsec1.invites;
      CREATE POLICY "members read invites" ON smbsec1.invites
        FOR SELECT TO authenticated
        USING (smbsec1.is_org_member(org_id));

      DROP POLICY IF EXISTS "members create invite" ON smbsec1.invites;
      CREATE POLICY "members create invite" ON smbsec1.invites
        FOR INSERT TO authenticated
        WITH CHECK (smbsec1.is_org_member(org_id) AND invited_by = auth.uid());

      DROP POLICY IF EXISTS "inviter or admin update invite" ON smbsec1.invites;
      CREATE POLICY "inviter or admin update invite" ON smbsec1.invites
        FOR UPDATE TO authenticated
        USING  (invited_by = auth.uid() OR smbsec1.is_org_admin(org_id))
        WITH CHECK (invited_by = auth.uid() OR smbsec1.is_org_admin(org_id));

      DROP POLICY IF EXISTS "inviter or admin delete invite" ON smbsec1.invites;
      CREATE POLICY "inviter or admin delete invite" ON smbsec1.invites
        FOR DELETE TO authenticated
        USING (invited_by = auth.uid() OR smbsec1.is_org_admin(org_id));
    `);

    // checklist_groups RLS
    await client.query(`
      ALTER TABLE smbsec1.checklist_groups ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "authenticated read groups" ON smbsec1.checklist_groups;
      CREATE POLICY "authenticated read groups" ON smbsec1.checklist_groups
        FOR SELECT TO authenticated USING (active = true);

      DROP POLICY IF EXISTS "anon read groups" ON smbsec1.checklist_groups;
      CREATE POLICY "anon read groups" ON smbsec1.checklist_groups
        FOR SELECT TO anon USING (active = true);
    `);

    // checklist_items RLS
    await client.query(`
      ALTER TABLE smbsec1.checklist_items ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "authenticated read items" ON smbsec1.checklist_items;
      CREATE POLICY "authenticated read items" ON smbsec1.checklist_items
        FOR SELECT TO authenticated USING (active = true);

      DROP POLICY IF EXISTS "anon read items" ON smbsec1.checklist_items;
      CREATE POLICY "anon read items" ON smbsec1.checklist_items
        FOR SELECT TO anon USING (active = true);
    `);

    console.log('  All RLS policies created.');

    // =========================================================================
    // STEP 7: Create indexes
    // =========================================================================
    console.log('Step 7: Creating indexes...');

    await client.query(`
      -- org_members: one IT executor per org
      CREATE UNIQUE INDEX IF NOT EXISTS ux_one_it_executor_per_org
        ON smbsec1.org_members (org_id) WHERE is_it_executor = true;

      -- assessments: one active per org
      CREATE UNIQUE INDEX IF NOT EXISTS ux_one_active_assessment_per_org
        ON smbsec1.assessments (org_id) WHERE status = 'active';

      -- assessment_items: track index
      CREATE INDEX IF NOT EXISTS idx_assessment_items_track
        ON smbsec1.assessment_items (assessment_id, track);

      -- invites: unique pending per email per org
      CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_invite_per_email_per_org
        ON smbsec1.invites (org_id, lower(email)) WHERE accepted_at IS NULL;

      -- invites: token lookup
      CREATE INDEX IF NOT EXISTS idx_invites_token
        ON smbsec1.invites (token);

      -- invites: org pending lookup
      CREATE INDEX IF NOT EXISTS idx_invites_org_pending
        ON smbsec1.invites (org_id) WHERE accepted_at IS NULL;

      -- checklist_items: track + active composite
      CREATE INDEX IF NOT EXISTS idx_checklist_items_track_active
        ON smbsec1.checklist_items (track, active, group_id, order_index);

      -- assessment_responses: performance index (from migration 011)
      CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_user
        ON smbsec1.assessment_responses (assessment_id, user_id);
    `);

    console.log('  All indexes created.');

    // =========================================================================
    // STEP 8: Verify row counts
    // =========================================================================
    console.log('Step 8: Verifying row counts...');

    const tablesToVerify = [
      'user_checklists',
      'orgs',
      'org_members',
      'assessments',
      'assessment_items',
      'assessment_responses',
      'invites',
      'checklist_groups',
      'checklist_items',
    ];

    let allMatch = true;
    for (const t of tablesToVerify) {
      const pubRes = await client.query(`SELECT count(*) AS cnt FROM public.${t}`);
      const newRes = await client.query(`SELECT count(*) AS cnt FROM smbsec1.${t}`);
      const pubCount = parseInt(pubRes.rows[0].cnt, 10);
      const newCount = parseInt(newRes.rows[0].cnt, 10);
      const match = pubCount === newCount ? 'OK' : 'MISMATCH';
      if (pubCount !== newCount) allMatch = false;
      console.log(`  ${t}: public=${pubCount} smbsec1=${newCount} ${match}`);
    }

    if (allMatch) {
      console.log('\nMigration complete. All row counts match.');
    } else {
      console.log('\nWARNING: Some row counts do not match. Please investigate.');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
