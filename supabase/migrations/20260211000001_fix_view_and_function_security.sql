-- Migration: Fix View and Function Security
-- Description: Corrige security_invoker na view, search_path nas funções e organiza extensões
-- Date: 2026-02-11
-- Applied manually on database and now registered in migrations

-- =============================================================================
-- 1. Fix security_invoker for v_booking_stats view
-- =============================================================================
-- This ensures the view runs with the permissions of the user calling it,
-- not the permissions of the view owner
ALTER VIEW public.v_booking_stats SET (security_invoker = on);

-- =============================================================================
-- 2. Set search_path for security-critical functions
-- =============================================================================
-- This prevents schema injection attacks by forcing functions to only look
-- in the public schema for objects
ALTER FUNCTION public.fn_cancel_booking SET search_path = public;
ALTER FUNCTION public.fn_init_trial_subscription SET search_path = public;
ALTER FUNCTION public.fn_public_get_tenant_by_subdomain SET search_path = public;
ALTER FUNCTION public.fn_complete_booking SET search_path = public;
ALTER FUNCTION public.fn_start_booking SET search_path = public;
ALTER FUNCTION public.cleanup_old_webhook_events SET search_path = public;
ALTER FUNCTION public.fn_bookings_require_customer_phone SET search_path = public;
ALTER FUNCTION public.fn_format_full_address SET search_path = public;

-- =============================================================================
-- 3. Organize extensions into separate schema
-- =============================================================================
-- Creates a dedicated schema for database extensions to keep them organized
-- and separate from application tables/functions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the btree_gist extension to the extensions schema
ALTER EXTENSION btree_gist SET SCHEMA extensions;

-- Grant necessary permissions for all roles to use the extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Update the database search_path to include both public and extensions schemas
ALTER DATABASE postgres SET search_path TO public, extensions;
