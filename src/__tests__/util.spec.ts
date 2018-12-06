import { isValidURL } from "../util";

[
  "http://google.com",
  "https://google.com",
  "https://google.com?param=value",
  "https://google.com?param=value&param2=value2",
  "https://google.com/path",
  "https://google.com/path#hash",
  "https://abc.xyz/path?abc=23#hash",
].forEach((url) => {
  test(`isValidURL(${url}) === true`, () => {
    expect(isValidURL(url)).toBe(true);
  });
});

[
  "htt://google.com",
  "htts://google.com",
  "http://a.b",
  "http://google",
  "mailto://google.com",
  "ftp://google.com",
  "google",
  "",
  undefined,
].forEach((url) => {
  test(`isValidURL(${url}) === false`, () => {
    expect(isValidURL(url)).toBe(false);
  });
});
