-- 🔍 DIAGNÓSTICO: Verificar configurações de horários

-- 1️⃣ Ver configurações atuais do seu tenant
SELECT 
  business_name,
  subdomain,
  settings->'booking'->'sunday_hours' as horarios_domingo,
  settings->'booking'->'weekday_hours' as horarios_semana,
  settings->'booking'->'enable_full_payment_discount' as desconto_ativo
FROM tenants
WHERE owner_id = auth.uid();

-- 2️⃣ Ver se tem quadras ativas
SELECT 
  name,
  base_price,
  active
FROM courts c
JOIN tenants t ON t.id = c.tenant_id
WHERE t.owner_id = auth.uid()
ORDER BY name;

-- 3️⃣ Ver reservas de hoje (para verificar se está marcando como ocupado)
SELECT 
  c.name as quadra,
  b.booking_date as data,
  b.start_time as inicio,
  b.end_time as fim,
  b.player_name as jogador,
  b.status
FROM bookings b
JOIN courts c ON c.id = b.court_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.owner_id = auth.uid()
  AND b.booking_date = CURRENT_DATE
ORDER BY b.start_time;
