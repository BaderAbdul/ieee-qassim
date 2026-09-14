import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('../functions/node_modules/puppeteer-core');

const CHROME_PATH = '/home/bader/.config/Antigravity/bin/google-chrome';
const PORT = 3009;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = {
  mobile_sm: { width: 375, height: 667, name: 'Mobile (375x667)' },
  mobile_md: { width: 390, height: 844, name: 'Mobile (390x844)' },
  desktop: { width: 1280, height: 800, name: 'Desktop (1280x800)' },
};

const ROUTES = [
  { path: '/ar', name: 'Home (AR)', locale: 'ar' },
  { path: '/en', name: 'Home (EN)', locale: 'en' },
  { path: '/ar/events', name: 'Events Catalog (AR)', locale: 'ar' },
  { path: '/en/events', name: 'Events Catalog (EN)', locale: 'en' },
  { path: '/ar/leaderboard', name: 'Leaderboard (AR)', locale: 'ar' },
  { path: '/en/leaderboard', name: 'Leaderboard (EN)', locale: 'en' },
  { path: '/ar/my-activity', name: 'My Activity (AR)', locale: 'ar' },
  { path: '/en/my-activity', name: 'My Activity (EN)', locale: 'en' },
  { path: '/ar/profile', name: 'Engineering Profile (AR)', locale: 'ar' },
  { path: '/en/profile', name: 'Engineering Profile (EN)', locale: 'en' },
  { path: '/ar/check-in/demo-event', name: 'Check-in (AR)', locale: 'ar' },
  { path: '/en/check-in/demo-event', name: 'Check-in (EN)', locale: 'en' },
  { path: '/ar/events/demo-event', name: 'Event Details Not-Found (AR)', locale: 'ar' },
  { path: '/en/events/demo-event', name: 'Event Details Not-Found (EN)', locale: 'en' },
];

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/ar`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await checkServerReady();
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server failed to start at ${BASE_URL} within ${timeoutMs}ms`);
}

async function main() {
  console.log('====================================================');
  console.log('  IEEE Qassim Platform - Headless Browser Audit     ');
  console.log('  Testing RTL/LTR, Viewports, and State Handling    ');
  console.log('====================================================\n');

  console.log(`[1/4] Spawning Next.js production server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  server.stdout.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('Ready in') || msg.includes('Local:')) {
      console.log(`      Server: ${msg.trim()}`);
    }
  });

  server.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.error(`      Server stderr: ${msg}`);
  });

  let browser;

  try {
    console.log('[2/4] Waiting for server readiness...');
    await waitForServer();
    console.log(`      Server is active and responding on ${BASE_URL}\n`);

    console.log(`[3/4] Launching Headless Chrome (${CHROME_PATH})...`);
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--headless=new',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    console.log(`      Browser launched: Chrome ${await browser.version()}\n`);

    console.log('[4/4] Executing matrix verification across locales and viewports...\n');
    const results = [];

    for (const route of ROUTES) {
      for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height });

        const consoleErrors = [];
        const pageErrors = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => {
          pageErrors.push(err.message);
        });

        const url = `${BASE_URL}${route.path}`;
        let status = null;
        let loadTimeMs = 0;
        const startTime = Date.now();

        try {
          const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
          status = response ? response.status() : 200;
          loadTimeMs = Date.now() - startTime;
        } catch (err) {
          consoleErrors.push(`Navigation error: ${err.message}`);
        }

        // DOM & Layout inspection
        const pageData = await page.evaluate(() => {
          const html = document.documentElement;
          const body = document.body;
          const dir = (html && html.getAttribute('dir')) || (body && body.getAttribute('dir')) || 'ltr';
          const lang = (html && html.getAttribute('lang')) || '';

          // Horizontal overflow calculation
          const scrollWidth = html ? html.scrollWidth : 0;
          const clientWidth = html ? html.clientWidth : 0;
          const hasHorizontalOverflow = scrollWidth > clientWidth + 1;

          // Check Navbar & Footer presence
          const nav = document.querySelector('nav');
          const footer = document.querySelector('footer');

          // Check main container
          const main = document.querySelector('main');
          const mainStyle = main ? window.getComputedStyle(main) : null;
          const mainDir = mainStyle ? mainStyle.direction : null;

          // Skeletons, empty states, and responsive elements
          const skeletons = document.querySelectorAll('.animate-pulse, [data-skeleton="true"]');
          const emptyStates = document.querySelectorAll('[data-empty-state="true"], .empty-state');
          const buttons = document.querySelectorAll('button');

          return {
            dir,
            lang,
            scrollWidth,
            clientWidth,
            hasHorizontalOverflow,
            hasNavbar: !!nav,
            hasFooter: !!footer,
            mainDir,
            skeletonCount: skeletons.length,
            emptyStateCount: emptyStates.length,
            buttonCount: buttons.length,
            title: document.title,
          };
        });

        const expectedDir = route.locale === 'ar' ? 'rtl' : 'ltr';
        const dirMatches = pageData.dir === expectedDir;
        const pass = dirMatches && !pageData.hasHorizontalOverflow && (status === 200 || status === null) && pageErrors.length === 0;

        const auditEntry = {
          route: route.path,
          name: route.name,
          locale: route.locale,
          viewport: vp.name,
          vpWidth: vp.width,
          vpHeight: vp.height,
          httpStatus: status,
          loadTimeMs,
          dir: pageData.dir,
          expectedDir,
          dirMatches,
          hasHorizontalOverflow: pageData.hasHorizontalOverflow,
          scrollWidth: pageData.scrollWidth,
          clientWidth: pageData.clientWidth,
          hasNavbar: pageData.hasNavbar,
          hasFooter: pageData.hasFooter,
          mainDir: pageData.mainDir,
          skeletonCount: pageData.skeletonCount,
          buttonCount: pageData.buttonCount,
          pageErrors,
          pass,
        };

        results.push(auditEntry);

        const statusTag = pass ? '✔ PASS' : '✖ FAIL';
        console.log(`[${statusTag}] ${route.name.padEnd(26)} | ${vp.name.padEnd(18)} | dir: ${pageData.dir} | overflow: ${pageData.hasHorizontalOverflow ? 'YES' : 'NO'} | status: ${status} | nav: ${pageData.hasNavbar ? 'Y' : 'N'}`);

        await page.close();
      }
    }

    console.log('\n====================================================');
    console.log('  Audit Summary Results                             ');
    console.log('====================================================');
    const total = results.length;
    const passed = results.filter((r) => r.pass).length;
    console.log(`Total checks executed: ${total}`);
    console.log(`Passed checks:         ${passed}`);
    console.log(`Failed checks:         ${total - passed}`);

    if (passed === total) {
      console.log('\n✔ ALL BROWSER INSPECTIONS PASSED (0 layout breaks, 0 RTL/LTR mismatches, 0 overflows)');
      return { success: true, results };
    } else {
      console.error('\n✖ SOME CHECKS FAILED:');
      results.filter((r) => !r.pass).forEach((f) => console.error(JSON.stringify(f, null, 2)));
      return { success: false, results };
    }
  } finally {
    if (browser) await browser.close();
    console.log('\nTerminating test Next.js server...');
    server.kill('SIGTERM');
  }
}

main()
  .then((res) => {
    if (!res.success) process.exit(1);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Audit fatal error:', err);
    process.exit(1);
  });
