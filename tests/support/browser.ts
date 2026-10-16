import { existsSync } from "node:fs";
import { chromium, type BrowserContext } from "playwright";
export function browserLaunchOptions(executablePath?: string) {
  if (executablePath && !existsSync(executablePath))
    throw Error(
      "MRT_BROWSER_PATH does not exist. Set a valid Chromium executable, or omit it and run npx playwright install chromium.",
    );
  return { ...(executablePath ? { executablePath } : {}), headless: true };
}
export function launchBrowser() {
  return chromium.launch(browserLaunchOptions(process.env.MRT_BROWSER_PATH));
}
export function collectBrowserErrors(
  context: BrowserContext,
  errors: string[],
) {
  context.on("page", (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on("requestfailed", (request) => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED")
        errors.push(
          `${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`,
        );
    });
  });
}
