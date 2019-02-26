import { NextFunction, Request, Response } from "express";
import puppeteer from "puppeteer";

// tslint:disable-next-line:max-line-length
const isURLRegExp = new RegExp("^(?:(?:http|https)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$", "i");

export const isValidURL = (str: string | undefined): boolean => {
  return (str && str.length < 2083 && isURLRegExp.test(str)) ? true : false;
};

export const delay = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const isURLBlackListed = (url: string, regexp?: string): boolean => {
  return regexp && new RegExp(regexp).test(url) ? true : false;
};

export const removeTags = async (page: puppeteer.Page, tagNames: string[]) => {
  await page.evaluate((browserTagNames) => {
    for (const tagName of browserTagNames) {
      const tags = document.getElementsByTagName(tagName);
      let i = tags.length;
      while (i--) {
        tags[i].parentNode.removeChild(tags[i]);
      }
    }
  }, tagNames);
};

const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

export const niceBytes = (bytes: number) => {
  let l = 0;
  let n = bytes;
  while (n >= 1024 && ++l) {
      n = n / 1024;
  }
  return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + " " + units[l]);
};

export const bodyParser = () => (req: Request, res: Response, next: NextFunction) => {
  let data = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    data += chunk;
  });
  req.on("end", () => {
    req.body = data;
    next();
  });
};

export const asNumber = (value: string | undefined): number | undefined => {
  try {
    return value ? parseInt(value, 10) : undefined;
  } catch {
    return undefined;
  }
};
