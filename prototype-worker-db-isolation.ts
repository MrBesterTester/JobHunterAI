#!/usr/bin/env ts-node

/**
 * Prototype: Per-Worker Database Isolation for E2E Tests
 *
 * Purpose: Validate feasibility of Option 1 from ISSUE-064
 * - Create 4 worker databases
 * - Measure creation/seeding time
 * - Measure resource usage (memory/CPU)
 * - Test connectivity
 *
 * Usage: ts-node prototype-worker-db-isolation.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

const NUM_WORKERS = 4;
const BASE_DB_NAME = 'jobhunter_test_worker';

interface WorkerDatabase {
  workerIndex: number;
  dbName: string;
  creationTime: number;
  seedingTime: number;
  totalTime: number;
}

interface PrototypeResults {
  workers: WorkerDatabase[];
  totalCreationTime: number;
  totalSeedingTime: number;
  overallTime: number;
  memoryUsage: {
    before: number;
    after: number;
    delta: number;
  };
}

/**
 * Get current PostgreSQL memory usage
 */
async function getPostgresMemoryUsage(): Promise<number> {
  try {
    // Get memory usage of postgres processes in MB
    const { stdout } = await execAsync(`ps aux | grep postgres | grep -v grep | awk '{sum += $6} END {print sum/1024}'`);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.warn('⚠️  Could not measure memory usage:', error);
    return 0;
  }
}

/**
 * Create a single worker database
 */
async function createWorkerDatabase(workerIndex: number): Promise<WorkerDatabase> {
  const dbName = `${BASE_DB_NAME}_${workerIndex}`;

  console.log(`\n🔨 Creating worker ${workerIndex} database: ${dbName}`);

  // Drop if exists (cleanup from previous runs)
  try {
    await execAsync(`dropdb -U sam ${dbName} 2>/dev/null || true`);
  } catch {
    // Ignore - database might not exist
  }

  // Measure creation time
  const createStart = Date.now();
  try {
    // Create database with sam superuser (has CREATE EXTENSION privilege)
    await execAsync(`createdb -U sam ${dbName}`);

    // Grant all privileges to jobhunter_user
    await execAsync(`psql -U sam -d ${dbName} -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO jobhunter_user"`);

    // Create uuid-ossp extension (requires superuser)
    await execAsync(`psql -U sam -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\""`);
  } catch (error) {
    console.error(`❌ Failed to create database ${dbName}:`, error);
    throw error;
  }
  const creationTime = Date.now() - createStart;
  console.log(`   ✅ Created in ${creationTime}ms`);

  // Measure seeding time
  const seedStart = Date.now();
  const schemaPath = path.join(__dirname, 'database/schema.sql');
  const seedPath = path.join(__dirname, 'database/seed_test_data.sql');

  try {
    // Apply schema (quietly, but show errors if they occur)
    await execAsync(`psql -U jobhunter_user -d ${dbName} -f ${schemaPath} -q`);

    // Seed test data (quietly, but show errors if they occur)
    await execAsync(`psql -U jobhunter_user -d ${dbName} -f ${seedPath} -q`);
  } catch (error) {
    console.error(`❌ Failed to seed database ${dbName}:`, error);
    throw error;
  }
  const seedingTime = Date.now() - seedStart;
  console.log(`   ✅ Seeded in ${seedingTime}ms`);

  return {
    workerIndex,
    dbName,
    creationTime,
    seedingTime,
    totalTime: creationTime + seedingTime
  };
}

/**
 * Verify database connectivity and data
 */
async function verifyDatabase(dbName: string): Promise<boolean> {
  try {
    // Check job count
    const { stdout: jobCount } = await execAsync(
      `psql -U jobhunter_user -d ${dbName} -t -c "SELECT COUNT(*) FROM jobs"`
    );

    // Check email_jobs count
    const { stdout: emailJobsCount } = await execAsync(
      `psql -U jobhunter_user -d ${dbName} -t -c "SELECT COUNT(*) FROM email_jobs"`
    );

    const jobs = parseInt(jobCount.trim());
    const emailJobs = parseInt(emailJobsCount.trim());

    console.log(`   📊 Database ${dbName}: ${jobs} jobs, ${emailJobs} email_jobs`);

    return jobs > 0 && emailJobs > 0;
  } catch (error) {
    console.error(`❌ Failed to verify database ${dbName}:`, error);
    return false;
  }
}

/**
 * Cleanup worker databases
 */
async function cleanup(): Promise<void> {
  console.log('\n🧹 Cleaning up worker databases...');

  for (let i = 0; i < NUM_WORKERS; i++) {
    const dbName = `${BASE_DB_NAME}_${i}`;
    try {
      await execAsync(`dropdb -U sam ${dbName} 2>/dev/null || true`);
      console.log(`   ✅ Dropped ${dbName}`);
    } catch (error) {
      console.warn(`   ⚠️  Could not drop ${dbName}:`, error);
    }
  }
}

/**
 * Main prototype execution
 */
async function runPrototype(): Promise<PrototypeResults> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Per-Worker Database Isolation Prototype (ISSUE-064)     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Measure initial memory
  const memoryBefore = await getPostgresMemoryUsage();
  console.log(`\n📊 PostgreSQL memory before: ${memoryBefore.toFixed(2)} MB`);

  // Create all worker databases in parallel (simulating parallel test execution)
  console.log(`\n🚀 Creating ${NUM_WORKERS} worker databases in parallel...`);
  const overallStart = Date.now();

  const workers = await Promise.all(
    Array.from({ length: NUM_WORKERS }, (_, i) => createWorkerDatabase(i))
  );

  const overallTime = Date.now() - overallStart;

  // Measure final memory
  const memoryAfter = await getPostgresMemoryUsage();
  const memoryDelta = memoryAfter - memoryBefore;

  console.log(`\n📊 PostgreSQL memory after: ${memoryAfter.toFixed(2)} MB`);
  console.log(`📊 Memory delta: +${memoryDelta.toFixed(2)} MB`);

  // Verify all databases
  console.log('\n🔍 Verifying database connectivity and data...');
  let allVerified = true;
  for (const worker of workers) {
    const verified = await verifyDatabase(worker.dbName);
    if (!verified) {
      allVerified = false;
    }
  }

  // Calculate totals
  const totalCreationTime = workers.reduce((sum, w) => sum + w.creationTime, 0);
  const totalSeedingTime = workers.reduce((sum, w) => sum + w.seedingTime, 0);

  // Print results
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  PROTOTYPE RESULTS                                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  console.log('\n📊 Per-Worker Timing:');
  workers.forEach(w => {
    console.log(`   Worker ${w.workerIndex}: ${w.totalTime}ms (create: ${w.creationTime}ms, seed: ${w.seedingTime}ms)`);
  });

  console.log('\n📊 Aggregate Timing:');
  console.log(`   Total creation time: ${totalCreationTime}ms (avg: ${(totalCreationTime/NUM_WORKERS).toFixed(0)}ms per worker)`);
  console.log(`   Total seeding time: ${totalSeedingTime}ms (avg: ${(totalSeedingTime/NUM_WORKERS).toFixed(0)}ms per worker)`);
  console.log(`   Overall wall-clock time: ${overallTime}ms (parallel execution)`);

  console.log('\n📊 Resource Usage:');
  console.log(`   Memory delta: +${memoryDelta.toFixed(2)} MB (${(memoryDelta/NUM_WORKERS).toFixed(2)} MB per worker)`);

  console.log('\n📊 Verification:');
  console.log(`   All databases verified: ${allVerified ? '✅ YES' : '❌ NO'}`);

  console.log('\n💡 Analysis:');
  console.log(`   ✅ Startup overhead: ${overallTime}ms (~${(overallTime/1000).toFixed(1)}s)`);
  console.log(`   ✅ Memory overhead: ${memoryDelta.toFixed(2)} MB (reasonable)`);
  console.log(`   ✅ Parallel creation works: ${NUM_WORKERS} databases created simultaneously`);

  if (overallTime < 10000) {
    console.log(`   ✅ Performance: Under 10 seconds - ACCEPTABLE`);
  } else {
    console.log(`   ⚠️  Performance: Over 10 seconds - may need optimization`);
  }

  if (memoryDelta < 500) {
    console.log(`   ✅ Memory: Under 500 MB - ACCEPTABLE`);
  } else {
    console.log(`   ⚠️  Memory: Over 500 MB - may be a concern`);
  }

  return {
    workers,
    totalCreationTime,
    totalSeedingTime,
    overallTime,
    memoryUsage: {
      before: memoryBefore,
      after: memoryAfter,
      delta: memoryDelta
    }
  };
}

/**
 * Entry point
 */
async function main() {
  try {
    const results = await runPrototype();

    console.log('\n🎯 Recommendation:');
    if (results.overallTime < 10000 && results.memoryUsage.delta < 500) {
      console.log('   ✅ PROCEED with Option 1 (Per-Worker Database Isolation)');
      console.log('   - Startup overhead is acceptable');
      console.log('   - Memory usage is reasonable');
      console.log('   - Provides perfect isolation for 567 tests');
    } else {
      console.log('   ⚠️  CONSIDER optimization or alternative approach');
      console.log('   - Startup overhead may impact developer experience');
      console.log('   - Memory usage may be a concern on resource-constrained machines');
    }

    // Ask user if they want to cleanup
    console.log('\n❓ Keep worker databases for manual testing? (will cleanup on next run)');
    console.log('   To cleanup now: ts-node prototype-worker-db-isolation.ts --cleanup');

    if (process.argv.includes('--cleanup')) {
      await cleanup();
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Prototype failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
