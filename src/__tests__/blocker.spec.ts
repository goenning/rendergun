import puppeteer from "puppeteer";
import { isURLBlocked } from "../blocker";

class StubRequest {
  constructor(
    private reqResourceType: string,
    private reqUrl: string,
  ) {}
  public resourceType(): string {
    return this.reqResourceType;
  }
  public url(): string {
    return this.reqUrl;
  }
}

const makeRequest = (resourceType: string, url: string): puppeteer.Request  => {
  const request = new StubRequest(resourceType, url);
  return request as unknown as puppeteer.Request;
};

[
  { url: "https://www.google-analytics.com", blocked: true },
  { url: "https://google-analytics.com", blocked: true },
  { url: "https://facebook-info.co", blocked: true },
  { url: "https://mysite.com", blocked: false },
  { url: "https://trax.fider.io", blocked: false },
].forEach((testCase) => {
  test(`isURLBlocked(${testCase.url}) === ${testCase.blocked} when ads is enabled`, async () => {
    const request = makeRequest("document", testCase.url);
    let blocked = false;

    blocked = await isURLBlocked(request, { blockAds: true });
    expect(blocked).toBe(testCase.blocked);

    blocked = await isURLBlocked(request, { blockAds: false });
    expect(blocked).toBe(false);
  });
});

test(`should block images by default`, async () => {
  const blocked = await isURLBlocked(makeRequest("image", "https://somesite.com/dog.png"));
  expect(blocked).toBe(true);
});
