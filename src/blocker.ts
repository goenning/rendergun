import { readFile } from "fs";
import puppeteer from "puppeteer";
import { parse as parseURL } from "url";

interface IsURLBlockedOptions {
  abortRegExp?: string;
  blockAds?: boolean;
}

const blockedHosts: { [key: string]: boolean } = {};
let blockedHostsCount = 0;

const loadAdBlockHosts = async () => {
  return new Promise((resolve, reject) => {
    const preffixToSkip = "0.0.0.0";
    readFile(`${__dirname}/../adblock-hosts.txt`, "UTF-8", (err, fileContent) => {
      if (err) {
        reject(err);
      }

      const lines = fileContent.split("\n");
      for (const line of lines) {
        if (line && line.startsWith(preffixToSkip)) {
          const host = line.substring(preffixToSkip.length + 1).trim();
          blockedHosts[host] = true;
          blockedHostsCount++;
        }
      }
      resolve();
    });
  });
};

export const isURLBlocked = async (req: puppeteer.Request, options?: IsURLBlockedOptions): Promise<boolean> => {
  options = options || {};
  const url = req.url();

  if (req.resourceType() === "image") {
    return true;
  }

  if (options.abortRegExp && new RegExp(options.abortRegExp).test(url)) {
    return true;
  }

  if (options.blockAds === true) {
    if (blockedHostsCount === 0) {
      await loadAdBlockHosts();
    }

    const host = parseURL(url).host;
    if (host) {
      return blockedHosts[host.trim()] || false;
    }
  }

  return false;
};
