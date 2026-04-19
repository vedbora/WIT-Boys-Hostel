-- Example queries (run after USE wit_hostel_db;)
-- Tables are defined exactly in schema.sql

-- All students with room
SELECT s.id, s.name, s.phone, s.room_number, s.room_type, s.bed_number, s.fees_status
FROM students s
ORDER BY s.room_number, s.bed_number;

-- Pending applications
SELECT id, name, email, phone, status, merit_score, created_at
FROM applications
WHERE status = 'Pending'
ORDER BY created_at DESC;

-- Admin user check
SELECT id, email, role, created_at FROM users WHERE role = 'admin';

-- Room occupancy (same logic as dashboard aggregation)
SELECT room_type,
       SUM(total_beds)   AS total_beds,
       SUM(occupied_beds) AS occupied_beds
FROM rooms
GROUP BY room_type;

-- Revenue (paid payments)
SELECT COALESCE(SUM(amount), 0) AS revenue_inr
FROM payments
WHERE status = 'Paid';

-- Insert room manually (match app: UUID id, ISO-ish datetime)
-- INSERT INTO rooms (id, room_number, room_type, total_beds, occupied_beds, fees, created_at)
-- VALUES (UUID(), '401', '2 Seater', 2, 0, 45000.0, NOW(6));
