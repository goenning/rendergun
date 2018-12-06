import puppeteer from "puppeteer";
import config from "./config";

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

const blacklistRegexp = config.blacklistRegexp
  ? new RegExp(config.blacklistRegexp)
  : undefined;

export const isURLBlackListed = (url: string): boolean => {
  return blacklistRegexp && blacklistRegexp.test(url) ? true : false;
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
