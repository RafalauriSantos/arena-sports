-- ============================================================================
-- Fix: GRANT para fn_public_get_occupied_slots
-- Permite que usuários anônimos (público) vejam slots ocupados
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon, authenticated;
