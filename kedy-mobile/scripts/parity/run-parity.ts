import fs from "node:fs";
import path from "node:path";
import { chromium, devices, type BrowserContext } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

type FlowMode = "public-login" | "auth-gated";

type RouteConfig = {
  id: string;
  sourcePath: string;
  targetPath: string;
  expectedFlow: FlowMode;
};

type Config = {
  sourceBaseUrl: string;
  targetBaseUrl: string;
  routes: RouteConfig[];
};

type CaptureResult = {
  status: number | null;
  finalUrl: string;
  text: string;
  screenshotPath: string;
  error: string | null;
};

type ViewportResult = {
  viewportId: string;
  flowPass: boolean;
  diffPercent: number;
  verdict: "PASS" | "PARTIAL" | "FAIL";
  source: CaptureResult;
  target: CaptureResult;
};

const rootDir = path.resolve(__dirname, "..", "..");
const parityDir = path.join(rootDir, ".parity-logs");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(parityDir, timestamp);
const latestDir = path.join(parityDir, "latest");
const routesPath = path.join(__dirname, "routes.json");
const routeConfig = JSON.parse(fs.readFileSync(routesPath, "utf8")) as Config;

function getRequiredEnv(name: "PARITY_EMAIL" | "PARITY_PASSWORD") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for legacy parity run. Set it in shell runtime only.`);
  }
  return value;
}

const credentials = {
  email: getRequiredEnv("PARITY_EMAIL"),
  password: getRequiredEnv("PARITY_PASSWORD"),
};

const viewports: Array<{ id: string; deviceName: string }> = [
  { id: "iphone12", deviceName: "iPhone 12" },
  { id: "pixel5", deviceName: "Pixel 5" },
];

function ensureDirs() {
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(latestDir, { recursive: true });
}

function stripText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 800);
}

function isLoginText(text: string) {
  const t = text.toLowerCase();
  return t.includes("giriş") || t.includes("giris") || t.includes("email") || t.includes("şifre") || t.includes("sifre");
}

function hasRoutePath(finalUrl: string, expectedPath: string) {
  try {
    const u = new URL(finalUrl);
    return u.pathname.startsWith(expectedPath);
  } catch {
    return false;
  }
}

function isLoginUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return pathname.includes("/login");
  } catch {
    return false;
  }
}

async function capture(context: BrowserContext, url: string, shotPath: string): Promise<CaptureResult> {
  const page = await context.newPage();
  let status: number | null = null;
  let finalUrl = url;
  let text = "";
  let error: string | null = null;

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    status = response?.status() ?? null;
    await page.waitForTimeout(1200);
    finalUrl = page.url();
    text = stripText(await page.locator("body").innerText());
    await page.screenshot({ path: shotPath, fullPage: true });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    await page.close();
  }

  return { status, finalUrl, text, screenshotPath: shotPath, error };
}

async function loginIfNeeded(context: BrowserContext, baseUrl: string) {
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const bodyText = stripText(await page.locator("body").innerText());
    if (!isLoginText(bodyText) && !isLoginUrl(page.url())) {
      await page.close();
      return;
    }

    const emailInput = (await page.locator('input[type="email"]').count()) > 0
      ? page.locator('input[type="email"]').first()
      : page.locator("input").first();
    const passwordInput = (await page.locator('input[type="password"]').count()) > 0
      ? page.locator('input[type="password"]').first()
      : page.locator("input").nth(1);
    const submitButton = (await page.locator('button[type="submit"]').count()) > 0
      ? page.locator('button[type="submit"]').first()
      : page.getByRole("button").filter({ hasText: /(giriş|giris|sign in|login)/i }).first();

    if ((await emailInput.count()) === 0 || (await passwordInput.count()) === 0 || (await submitButton.count()) === 0) {
      await page.close();
      return;
    }

    await emailInput.fill(credentials.email);
    await passwordInput.fill(credentials.password);
    await submitButton.click();
    try {
      await page.waitForURL((url) => !url.pathname.toLowerCase().includes("login"), { timeout: 10000 });
    } catch {
      await page.waitForTimeout(1500);
    }
  } finally {
    await page.close();
  }
}

function computeDiffPercent(aPath: string, bPath: string) {
  const img1 = PNG.sync.read(fs.readFileSync(aPath));
  const img2 = PNG.sync.read(fs.readFileSync(bPath));
  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);
  const cropped1 = new PNG({ width, height });
  const cropped2 = new PNG({ width, height });
  PNG.bitblt(img1, cropped1, 0, 0, width, height, 0, 0);
  PNG.bitblt(img2, cropped2, 0, 0, width, height, 0, 0);
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(cropped1.data, cropped2.data, diff.data, width, height, { threshold: 0.1 });
  return (mismatched / (width * height)) * 100;
}

function evaluateFlow(route: RouteConfig, source: CaptureResult, target: CaptureResult) {
  if (source.error || target.error) return false;
  if (source.status !== null && source.status >= 400) return false;
  if (target.status !== null && target.status >= 400) return false;

  if (route.expectedFlow === "public-login") {
    return isLoginText(source.text) && isLoginText(target.text);
  }

  return hasRoutePath(source.finalUrl, route.sourcePath) && hasRoutePath(target.finalUrl, route.targetPath);
}

function evaluateVerdict(flowPass: boolean, diffPercent: number): "PASS" | "PARTIAL" | "FAIL" {
  if (flowPass && diffPercent <= 0.3) return "PASS";
  if (flowPass && diffPercent <= 1.5) return "PARTIAL";
  return "FAIL";
}

async function runForViewport(viewportId: string, deviceName: string, route: RouteConfig): Promise<ViewportResult> {
  const browser = await chromium.launch({ headless: true });
  const contextSource = await browser.newContext({ ...devices[deviceName] });
  const contextTarget = await browser.newContext({ ...devices[deviceName] });

  await loginIfNeeded(contextSource, routeConfig.sourceBaseUrl);
  await loginIfNeeded(contextTarget, routeConfig.targetBaseUrl);

  const sourceShot = path.join(runDir, `${route.id}-${viewportId}-source.png`);
  const targetShot = path.join(runDir, `${route.id}-${viewportId}-target.png`);

  const source = await capture(contextSource, `${routeConfig.sourceBaseUrl}${route.sourcePath}`, sourceShot);
  const target = await capture(contextTarget, `${routeConfig.targetBaseUrl}${route.targetPath}`, targetShot);
  const flowPass = evaluateFlow(route, source, target);
  const diffPercent = source.error || target.error ? 100 : computeDiffPercent(sourceShot, targetShot);
  const verdict = evaluateVerdict(flowPass, diffPercent);

  await contextSource.close();
  await contextTarget.close();
  await browser.close();

  return { viewportId, flowPass, diffPercent: Number(diffPercent.toFixed(3)), verdict, source, target };
}

async function main() {
  ensureDirs();

  const results: Array<{
    routeId: string;
    sourcePath: string;
    targetPath: string;
    expectedFlow: FlowMode;
    viewports: ViewportResult[];
    overallVerdict: "PASS" | "PARTIAL" | "FAIL";
  }> = [];

  for (const route of routeConfig.routes) {
    const routeResults: ViewportResult[] = [];
    for (const viewport of viewports) {
      const out = await runForViewport(viewport.id, viewport.deviceName, route);
      routeResults.push(out);
    }

    const hasFail = routeResults.some((r) => r.verdict === "FAIL");
    const hasPartial = routeResults.some((r) => r.verdict === "PARTIAL");
    const overallVerdict = hasFail ? "FAIL" : hasPartial ? "PARTIAL" : "PASS";

    results.push({
      routeId: route.id,
      sourcePath: route.sourcePath,
      targetPath: route.targetPath,
      expectedFlow: route.expectedFlow,
      viewports: routeResults,
      overallVerdict,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceBaseUrl: routeConfig.sourceBaseUrl,
    targetBaseUrl: routeConfig.targetBaseUrl,
    thresholds: { pass: 0.3, partial: 1.5 },
    credentialsUsed: { email: credentials.email, password: "<redacted>" },
    results,
  };

  const jsonPath = path.join(runDir, "parity-report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  fs.copyFileSync(jsonPath, path.join(latestDir, "parity-report.json"));

  const lines: string[] = [];
  lines.push("# Legacy Playwright Parity Report");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Source: ${summary.sourceBaseUrl}`);
  lines.push(`Target: ${summary.targetBaseUrl}`);
  lines.push("");
  lines.push("| Route | Source | Target | iPhone12 | Pixel5 | Overall |");
  lines.push("|---|---|---|---|---|---|");
  for (const row of results) {
    const iphone = row.viewports.find((v) => v.viewportId === "iphone12");
    const pixel = row.viewports.find((v) => v.viewportId === "pixel5");
    const iphoneText = iphone ? `${iphone.verdict} (${iphone.diffPercent}%)` : "n/a";
    const pixelText = pixel ? `${pixel.verdict} (${pixel.diffPercent}%)` : "n/a";
    lines.push(`| ${row.routeId} | \`${row.sourcePath}\` | \`${row.targetPath}\` | ${iphoneText} | ${pixelText} | **${row.overallVerdict}** |`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("- This report is legacy-only and is not a release gate authority.");
  lines.push("- Chrome MCP parity evidence is the source of truth for gate decisions.");
  lines.push("- PASS requires flow parity and <=0.3% pixel diff per viewport.");
  lines.push("- PARTIAL allows <=1.5% pixel diff while flow parity is valid.");
  lines.push("- FAIL means flow mismatch, runtime error, or high visual diff.");

  const mdPath = path.join(runDir, "parity-report.md");
  fs.writeFileSync(mdPath, lines.join("\n"));
  fs.copyFileSync(mdPath, path.join(latestDir, "parity-report.md"));

  console.log(mdPath);
}

void main();
