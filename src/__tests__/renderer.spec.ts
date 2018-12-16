import * as fs from "fs";
import Renderer from "../renderer";

describe("Renderer", () => {
  const renderer = new Renderer();

  beforeAll(async () => {
    await renderer.initialize();
  });

  afterAll(async () => {
    await renderer.close();
  });

  test("can render example.org", async () => {
    jest.setTimeout(8000);

    const result = await renderer.render("https://example.org");
    expect(result.code).toBe(200);
    expect(result.body).toMatchSnapshot();
  });

  test("can render pudim.com.br (without script tag)", async () => {
    jest.setTimeout(8000);

    const result = await renderer.render("http://www.pudim.com.br");
    expect(result.code).toBe(200);
    expect(result.body).toMatchSnapshot();
  });

  test("returns 404 on an unknown page", async () => {
    jest.setTimeout(8000);

    const result = await renderer.render("http://pudim.com.br/abc");
    expect(result.code).toBe(404);
    expect(result.body).toMatchSnapshot();
  });

  test("can render a simple string", async () => {
    jest.setTimeout(8000);

    const content = fs.readFileSync("./src/__tests__/testdata/simple-string.html", "UTF-8");
    const result = await renderer.renderString("https://example.org", content);
    expect(result.code).toBe(200);
    expect(result.body).toMatchSnapshot();
  });

  test("can render javascript content", async () => {
    jest.setTimeout(8000);

    const content = fs.readFileSync("./src/__tests__/testdata/simple-javascript.html", "UTF-8");
    const result = await renderer.renderString("https://example.org", content);
    expect(result.code).toBe(200);
    expect(result.body).toMatchSnapshot();
  });

  test("can render Fider home page (react)", async () => {
    jest.setTimeout(8000);

    const content = fs.readFileSync("./src/__tests__/testdata/fider-home.html", "UTF-8");
    const result = await renderer.renderString("https://trax.fider.io/", content);
    expect(result.code).toBe(200);
    expect(result.body).toMatchSnapshot();
  });
});
