-- Seed initial holidays for 2026
insert into holidays (name, date, type) values
('New Year’s Day', '2026-01-01', 'national'),
('Republic Day', '2026-01-26', 'national'),
('Maha Shivratri', '2026-02-15', 'festival'),
('Holi', '2026-03-04', 'festival'),
('Good Friday', '2026-04-03', 'festival'),
('Eid al-Fitr', '2026-04-10', 'festival'),
('Independence Day', '2026-08-15', 'national'),
('Ganesh Chaturthi', '2026-09-14', 'festival'),
('Gandhi Jayanti', '2026-10-02', 'national'),
('Dussehra', '2026-10-20', 'festival'),
('Diwali', '2026-11-08', 'festival'),
('Guru Nanak Jayanti', '2026-11-23', 'festival'),
('Christmas Day', '2026-12-25', 'national')
on conflict (date) do nothing;
