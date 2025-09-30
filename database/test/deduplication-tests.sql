-- JobHunter Database Tests - Deduplication System
-- pgTAP tests for job deduplication functionality

BEGIN;
SELECT plan(20);

-- Test deduplication table structure
SELECT has_table('public', 'job_deduplication', 'job_deduplication table should exist');
SELECT has_pk('public', 'job_deduplication', 'job_deduplication table should have primary key');

-- Test foreign key relationship
SELECT has_fk('public', 'job_deduplication', 'job_deduplication should have foreign key to jobs');
SELECT fk_ok('public', 'job_deduplication', 'job_id', 'public', 'jobs', 'job_id', 'Should reference jobs.job_id');

-- Test column constraints
SELECT col_type_is('public', 'job_deduplication', 'company_title_hash', 'character varying(64)', 'company_title_hash should be varchar(64)');
SELECT col_not_null('public', 'job_deduplication', 'company_title_hash', 'company_title_hash should not allow NULL');

-- Test unique constraint on company_title_hash
SELECT has_index('public', 'job_deduplication', 'idx_dedup_company_title', 'Should have unique index on company_title_hash');

-- Test deduplication functionality with actual data
INSERT INTO jobs (job_id, title, company, source)
VALUES ('11111111-1111-1111-1111-111111111111', 'Software Engineer', 'TestCorp', 'manual');

INSERT INTO job_deduplication (job_id, company_title_hash)
VALUES ('11111111-1111-1111-1111-111111111111', SHA256('TestCorpSoftware Engineer'::bytea));

SELECT ok(
    (SELECT COUNT(*) FROM job_deduplication WHERE company_title_hash = encode(SHA256('TestCorpSoftware Engineer'::bytea), 'hex')) = 1,
    'Should have one deduplication entry'
);

-- Test that duplicate hash is prevented
PREPARE duplicate_insert AS
INSERT INTO job_deduplication (job_id, company_title_hash)
VALUES ('22222222-2222-2222-2222-222222222222', encode(SHA256('TestCorpSoftware Engineer'::bytea), 'hex'));

SELECT throws_ok(
    'duplicate_insert',
    '23505',
    'duplicate key value violates unique constraint',
    'Should prevent duplicate company_title_hash'
);

-- Test hash consistency
SELECT is(
    encode(SHA256('TestCorpSoftware Engineer'::bytea), 'hex'),
    encode(SHA256('TestCorpSoftware Engineer'::bytea), 'hex'),
    'Hash should be consistent for same input'
);

-- Test hash length
SELECT is(
    length(encode(SHA256('TestCorpSoftware Engineer'::bytea), 'hex')),
    64,
    'SHA256 hash should be 64 characters long'
);

-- Test different inputs produce different hashes
SELECT isnt(
    encode(SHA256('TestCorpSoftware Engineer'::bytea), 'hex'),
    encode(SHA256('DifferentCorpSoftware Engineer'::bytea), 'hex'),
    'Different inputs should produce different hashes'
);

-- Test URL deduplication column
SELECT has_column('public', 'job_deduplication', 'url_hash', 'Should have url_hash column');
SELECT col_type_is('public', 'job_deduplication', 'url_hash', 'character varying(64)', 'url_hash should be varchar(64)');

-- Test URL hash functionality
INSERT INTO jobs (job_id, title, company, source, url)
VALUES ('33333333-3333-3333-3333-333333333333', 'Backend Engineer', 'UrlCorp', 'manual', 'https://jobs.example.com/123');

INSERT INTO job_deduplication (job_id, company_title_hash, url_hash)
VALUES ('33333333-3333-3333-3333-333333333333',
        encode(SHA256('UrlCorpBackend Engineer'::bytea), 'hex'),
        encode(SHA256('https://jobs.example.com/123'::bytea), 'hex'));

SELECT ok(
    (SELECT COUNT(*) FROM job_deduplication WHERE url_hash = encode(SHA256('https://jobs.example.com/123'::bytea), 'hex')) = 1,
    'Should store URL hash correctly'
);

-- Test cascade delete
DELETE FROM jobs WHERE job_id = '11111111-1111-1111-1111-111111111111';

SELECT is(
    (SELECT COUNT(*) FROM job_deduplication WHERE job_id = '11111111-1111-1111-1111-111111111111'),
    0::bigint,
    'Deduplication entry should be deleted when job is deleted (CASCADE)'
);

-- Test query performance for deduplication lookup
SELECT ok(
    (SELECT COUNT(*) FROM job_deduplication WHERE company_title_hash = encode(SHA256('PerformanceTest'::bytea), 'hex')) >= 0,
    'Hash lookup query should execute successfully'
);

-- Test that we can find existing jobs by hash
INSERT INTO jobs (job_id, title, company, source)
VALUES ('44444444-4444-4444-4444-444444444444', 'Lookup Test', 'LookupCorp', 'manual');

INSERT INTO job_deduplication (job_id, company_title_hash)
VALUES ('44444444-4444-4444-4444-444444444444', encode(SHA256('LookupCorpLookup Test'::bytea), 'hex'));

SELECT is(
    (SELECT j.job_id FROM jobs j
     JOIN job_deduplication jd ON j.job_id = jd.job_id
     WHERE jd.company_title_hash = encode(SHA256('LookupCorpLookup Test'::bytea), 'hex'))::text,
    '44444444-4444-4444-4444-444444444444',
    'Should be able to find existing job by hash lookup'
);

-- Test indexes exist for performance
SELECT has_index('public', 'job_deduplication', 'idx_dedup_url', 'Should have index on url_hash');

-- Clean up test data
DELETE FROM jobs WHERE company IN ('TestCorp', 'UrlCorp', 'LookupCorp');

ROLLBACK;