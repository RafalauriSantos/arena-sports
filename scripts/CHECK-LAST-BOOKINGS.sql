-- Ver últimas reservas criadas
SELECT 
  b.id,
  b.customer_name,
  b.customer_phone,
  b.start_time,
  b.end_time,
  b.status,
  b.total_price,
  b.notes,
  c.name as quadra,
  t.business_name as arena,
  b.created_at
FROM bookings b
JOIN courts c ON c.id = b.court_id
JOIN tenants t ON t.id = b.tenant_id
WHERE t.owner_id = auth.uid()
ORDER BY b.created_at DESC
LIMIT 10;
