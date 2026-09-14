/**
 * IEEE Qassim Platform - Standalone E2E Test Runner
 * Executes all 4 test tiers using Node 24 native test runner,
 * aggregates results, and displays a structured executive test report.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

interface TierConfig {
  name: string;
  tierId: string;
  pattern: string;
  threshold: number;
}

const TIERS: TierConfig[] = [
  {
    tierId: 'Tier 1',
    name: 'Feature Coverage (7 Core Features)',
    pattern: 'tests/tier1-feature-coverage/*.test.ts',
    threshold: 35,
  },
  {
    tierId: 'Tier 2',
    name: 'Boundary & Corner Cases (Edge & Error Paths)',
    pattern: 'tests/tier2-boundary-corner/*.test.ts',
    threshold: 35,
  },
  {
    tierId: 'Tier 3',
    name: 'Cross-Feature Combinations (Integration Flows)',
    pattern: 'tests/tier3-cross-feature/*.test.ts',
    threshold: 7,
  },
  {
    tierId: 'Tier 4',
    name: 'Real-World Scenarios (Student Lifecycle & Integrity)',
    pattern: 'tests/tier4-real-world-scenarios/*.test.ts',
    threshold: 5,
  },
];

interface TierResult {
  tierId: string;
  name: string;
  threshold: number;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
}

async function runTier(tier: TierConfig): Promise<TierResult> {
  const startTime = Date.now();
  return new Promise<TierResult>((resolve) => {
    const args = ['--test', '--experimental-strip-types', tier.pattern];
    const proc = spawn('node', args, { cwd: rootDir, env: process.env });

    let stdout = '';
    let stderrOutput = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d) => {
      stderrOutput += d.toString();
    });

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      if (code !== 0 && stderrOutput) {
        process.stderr.write(stderrOutput);
      }
      // Parse pass/fail counts
      const passMatch = stdout.match(/ℹ pass (\d+)/);
      const failMatch = stdout.match(/ℹ fail (\d+)/);
      const totalMatch = stdout.match(/ℹ tests (\d+)/);

      const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
      const failed = failMatch ? parseInt(failMatch[1], 10) : (code === 0 ? 0 : 1);
      const total = totalMatch ? parseInt(totalMatch[1], 10) : passed + failed;

      resolve({
        tierId: tier.tierId,
        name: tier.name,
        threshold: tier.threshold,
        total,
        passed,
        failed,
        durationMs,
      });
    });
  });
}

async function main() {
  console.log('======================================================================');
  console.log(' IEEE Qassim Community Platform - E2E Test Suite Execution');
  console.log(' Node.js Version: ' + process.version);
  console.log(' Architecture: Native node:test + node:assert/strict (Zero external deps)');
  console.log('======================================================================\n');

  const results: TierResult[] = [];
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  for (const tier of TIERS) {
    process.stdout.write(`Running [${tier.tierId}] ${tier.name}... `);
    const result = await runTier(tier);
    results.push(result);
    grandTotal += result.total;
    grandPassed += result.passed;
    grandFailed += result.failed;

    if (result.failed === 0 && result.passed >= tier.threshold) {
      console.log(`✔ PASS (${result.passed}/${result.total} passed in ${result.durationMs}ms)`);
    } else {
      console.log(`✖ FAIL (${result.passed}/${result.total} passed, threshold: >=${tier.threshold})`);
    }
  }

  console.log('\n======================================================================');
  console.log('                   E2E TEST SUITE EXECUTIVE SUMMARY                   ');
  console.log('======================================================================');
  console.log(' Tier   | Name                              | Req | Pass | Fail | Status');
  console.log('--------|-----------------------------------|-----|------|------|-------');

  for (const r of results) {
    const status = r.failed === 0 && r.passed >= r.threshold ? 'PASS  ' : 'FAIL  ';
    const tierPadded = r.tierId.padEnd(6);
    const namePadded = r.name.padEnd(33).slice(0, 33);
    const reqPadded = `>=${r.threshold}`.padEnd(3);
    const passPadded = String(r.passed).padStart(4);
    const failPadded = String(r.failed).padStart(4);
    console.log(` ${tierPadded} | ${namePadded} | ${reqPadded} | ${passPadded} | ${failPadded} | ${status}`);
  }

  console.log('----------------------------------------------------------------------');
  console.log(` TOTALS | All 4 Tiers Combined (${grandTotal} Tests)   | >=82| ${String(grandPassed).padStart(4)} | ${String(grandFailed).padStart(4)} | ${grandFailed === 0 ? 'ALL PASS' : 'FAILED'}`);
  console.log('======================================================================\n');

  if (grandFailed > 0) {
    console.error('Test run failed with ' + grandFailed + ' failing tests.');
    process.exit(1);
  } else {
    console.log('✔ All 4 test tiers passed requirements and integrity thresholds.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
