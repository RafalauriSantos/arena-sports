-- Add trigger to initialize tenant subscription on tenant creation
-- This ensures new tenants get a trial subscription automatically

create trigger trg_init_tenant_subscription
after insert on public.tenants
for each row execute function public.fn_init_tenant_subscription();