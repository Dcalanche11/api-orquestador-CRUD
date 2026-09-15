-- Solo lectura. Ejecutar conectado a la base employees.
BEGIN READ ONLY;

SELECT 'employees' AS tabla, count(*) AS registros FROM employees
UNION ALL SELECT 'addresses', count(*) FROM addresses
UNION ALL SELECT 'salary_information', count(*) FROM salary_information
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs;

SELECT id, username, role, is_active FROM users ORDER BY username;

SELECT id, first_names, last_names, birth_date, dpi, nit,
       igss_number, irtra_number, created_at, updated_at
FROM employees ORDER BY created_at DESC LIMIT 100;

SELECT employee_id, position, line1, line2, municipality, department, country, postal_code
FROM addresses ORDER BY employee_id, position LIMIT 100;

SELECT employee_id, base_amount, bonus_amount, currency, pay_frequency
FROM salary_information ORDER BY employee_id LIMIT 100;

SELECT a.occurred_at, u.username AS actor, a.employee_id, a.action, a.changed_fields
FROM audit_logs a JOIN users u ON u.id = a.actor_id
ORDER BY a.occurred_at DESC, a.id LIMIT 100;

COMMIT;
