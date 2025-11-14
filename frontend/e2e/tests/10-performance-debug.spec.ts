import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * DEBUG VERSION of Performance Test
 * This test logs detailed timing information for each API call
 * to help identify performance bottlenecks
 */

test.describe('Performance Debug', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test('DEBUG: Profile API response times with detailed logging', async ({ page }) => {
    const apiCalls: Array<{url: string, time: number, method: string}> = [];

    page.on('requestfinished', async (request) => {
      if (request.url().includes('/api/') && !request.url().includes('generate')) {
        const timing = request.timing();
        const responseTime = timing.responseEnd - timing.requestStart;
        if (responseTime > 0) {
          const url = request.url().replace('http://localhost:8080', '');
          apiCalls.push({
            url,
            time: responseTime,
            method: request.method()
          });
          console.log(`API Call: ${request.method()} ${url} - ${responseTime.toFixed(2)}ms`);
        }
      }
    });

    console.log('\n=== STARTING PERFORMANCE PROFILE ===\n');

    const startTime = Date.now();
    await dashboardPage.goto();
    const gotoTime = Date.now() - startTime;
    console.log(`\n--- Dashboard goto(): ${gotoTime}ms ---`);

    const waitLoadStart = Date.now();
    await dashboardPage.waitForLoad();
    const waitLoadTime = Date.now() - waitLoadStart;
    console.log(`--- waitForLoad(): ${waitLoadTime}ms ---\n`);

    // Perform some actions to generate more API calls
    console.log('\n--- Clicking Inbox tab ---');
    const inboxStart = Date.now();
    await dashboardPage.clickTab('inbox');
    await dashboardPage.waitForJobsUpdate();
    const inboxTime = Date.now() - inboxStart;
    console.log(`--- Inbox tab switch: ${inboxTime}ms ---\n`);

    console.log('\n--- Clicking Approved tab ---');
    const approvedStart = Date.now();
    await dashboardPage.clickTab('approved');
    await dashboardPage.waitForJobsUpdate();
    const approvedTime = Date.now() - approvedStart;
    console.log(`--- Approved tab switch: ${approvedTime}ms ---\n`);

    console.log('\n=== PERFORMANCE SUMMARY ===');
    console.log(`Total API calls: ${apiCalls.length}`);
    console.log(`Total page load time: ${gotoTime + waitLoadTime}ms`);
    console.log(`Total interaction time: ${inboxTime + approvedTime}ms`);

    if (apiCalls.length > 0) {
      const totalApiTime = apiCalls.reduce((sum, call) => sum + call.time, 0);
      const avgTime = totalApiTime / apiCalls.length;
      const maxTime = Math.max(...apiCalls.map(c => c.time));
      const minTime = Math.min(...apiCalls.map(c => c.time));

      console.log(`\nAPI Response Times:`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);
      console.log(`  Total: ${totalApiTime.toFixed(2)}ms`);

      console.log(`\nAPI Calls by endpoint:`);
      const byEndpoint = apiCalls.reduce((acc, call) => {
        const endpoint = call.url.split('?')[0]; // Remove query params
        if (!acc[endpoint]) {
          acc[endpoint] = { count: 0, total: 0, times: [] };
        }
        acc[endpoint].count++;
        acc[endpoint].total += call.time;
        acc[endpoint].times.push(call.time);
        return acc;
      }, {} as Record<string, {count: number, total: number, times: number[]}>);

      Object.entries(byEndpoint)
        .sort((a, b) => b[1].total - a[1].total)
        .forEach(([endpoint, stats]) => {
          const avg = stats.total / stats.count;
          const max = Math.max(...stats.times);
          console.log(`  ${endpoint}:`);
          console.log(`    Calls: ${stats.count}, Avg: ${avg.toFixed(2)}ms, Max: ${max.toFixed(2)}ms, Total: ${stats.total.toFixed(2)}ms`);
        });
    }

    console.log('\n=== END PERFORMANCE PROFILE ===\n');

    // The actual assertion (we know it will fail, but we want the logs)
    if (apiCalls.length > 0) {
      const avgTime = apiCalls.reduce((sum, call) => sum + call.time, 0) / apiCalls.length;
      console.log(`\nFinal average: ${avgTime.toFixed(2)}ms (threshold: 500ms)`);
      expect(avgTime).toBeLessThan(500);
    }
  });
});
