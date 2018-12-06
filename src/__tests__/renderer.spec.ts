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
});
