-- Grant service_role access to the booking stats view
-- Ensures admin tooling can read the view even with security_invoker enabled

GRANT SELECT ON public.v_booking_stats TO service_role;
