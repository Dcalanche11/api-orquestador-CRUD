-- Sustituir el UUID de ejemplo por employee_id o deleted_employee_id de Postman.
-- Ejecute cada SELECT por separado si utiliza un cliente gráfico.

SELECT e.id, e.first_names, e.last_names, e.gender, e.marital_status,
       e.birth_date, e.dpi, e.nit, e.igss_number, e.irtra_number,
       s.base_amount, s.bonus_amount, s.currency, s.pay_frequency
FROM employees e
JOIN salary_information s ON s.employee_id = e.id
WHERE e.id = '00000000-0000-0000-0000-000000000000';

SELECT position, line1, line2, municipality, department, country, postal_code
FROM addresses
WHERE employee_id = '00000000-0000-0000-0000-000000000000'
ORDER BY position;

SELECT a.occurred_at, u.username AS actor, a.action, a.changed_fields
FROM audit_logs a
JOIN users u ON u.id = a.actor_id
WHERE a.employee_id = '00000000-0000-0000-0000-000000000000'
ORDER BY a.occurred_at, a.id;
