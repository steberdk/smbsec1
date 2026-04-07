-- Migration 020: Drop unused analytics views from public schema
-- These views were created in 011 but are never queried by application code.
-- The dashboard API computes all stats directly via SQL queries.

DROP VIEW IF EXISTS public.v_org_completion;
DROP VIEW IF EXISTS public.v_cadence;
DROP VIEW IF EXISTS public.v_onboarding_funnel;
