-- JobHunter Database Tests - Job Constraints
-- pgTAP tests for jobs table structure and constraints

BEGIN;
SELECT plan(25);

-- Test table existence
SELECT has_table('public', 'jobs', 'jobs table should exist');
SELECT has_pk('public', 'jobs', 'jobs table should have primary key');

-- Test column existence and types
SELECT has_column('public', 'jobs', 'job_id', 'job_id column should exist');
SELECT col_type_is('public', 'jobs', 'job_id', 'uuid', 'job_id should be UUID type');
SELECT col_is_pk('public', 'jobs', 'job_id', 'job_id should be primary key');

SELECT has_column('public', 'jobs', 'title', 'title column should exist');
SELECT col_type_is('public', 'jobs', 'title', 'character varying(255)', 'title should be varchar(255)');
SELECT col_not_null('public', 'jobs', 'title', 'title should not allow NULL');

SELECT has_column('public', 'jobs', 'company', 'company column should exist');
SELECT col_type_is('public', 'jobs', 'company', 'character varying(255)', 'company should be varchar(255)');
SELECT col_not_null('public', 'jobs', 'company', 'company should not allow NULL');

SELECT has_column('public', 'jobs', 'location', 'location column should exist');
SELECT col_type_is('public', 'jobs', 'location', 'character varying(255)', 'location should be varchar(255)');
SELECT col_is_null('public', 'jobs', 'location', 'location should allow NULL');

SELECT has_column('public', 'jobs', 'salary', 'salary column should exist');
SELECT col_type_is('public', 'jobs', 'salary', 'integer', 'salary should be integer');
SELECT col_is_null('public', 'jobs', 'salary', 'salary should allow NULL');

SELECT has_column('public', 'jobs', 'status', 'status column should exist');
SELECT col_type_is('public', 'jobs', 'status', 'character varying(20)', 'status should be varchar(20)');
SELECT col_has_default('public', 'jobs', 'status', 'status should have default value');

SELECT has_column('public', 'jobs', 'source', 'source column should exist');
SELECT col_type_is('public', 'jobs', 'source', 'character varying(50)', 'source should be varchar(50)');
SELECT col_not_null('public', 'jobs', 'source', 'source should not allow NULL');

-- Test timestamp columns
SELECT has_column('public', 'jobs', 'date_collected', 'date_collected column should exist');
SELECT col_type_is('public', 'jobs', 'date_collected', 'timestamp with time zone', 'date_collected should be timestamptz');
SELECT col_has_default('public', 'jobs', 'date_collected', 'date_collected should have default value');

SELECT has_column('public', 'jobs', 'created_at', 'created_at column should exist');
SELECT col_type_is('public', 'jobs', 'created_at', 'timestamp with time zone', 'created_at should be timestamptz');
SELECT col_has_default('public', 'jobs', 'created_at', 'created_at should have default value');

-- Test indexes
SELECT has_index('public', 'jobs', 'idx_jobs_status', 'jobs should have status index');
SELECT has_index('public', 'jobs', 'idx_jobs_company', 'jobs should have company index');

ROLLBACK;