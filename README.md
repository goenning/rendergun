<p align="center">
  <img src="https://raw.githubusercontent.com/goenning/rendergun/master/assets/logo.png" />
  <br />
  <div align="center">
    <strong>A pre-render service for client-side rendered websites</strong>
  </div>
</p>

## Use Case

It's common for developers to build client-side rendered websites using Javascript. While this is great for building interactive websites, if not used correctly, it'll definitely hurt the Search Engine Optimization (SEO) and index ranking.

Most libraries provide a way to do Server-Side Rendering (SSR), which is perfect for SEO. But SSR is not always possible, so a **Pre-rendering** application such as Rendergun is another solution.

**Rendergun** uses a real browser to load your page, download all assets, execute the JavaScript, build the DOM and retun the HTML as a string. This string can then be returned as a response to web crawlers such as Google, Bing, DuckDuckGo, etc. 

Pre-rendering is recommended by Google. Visit [https://developers.google.com/search/docs/guides/dynamic-rendering](https://developers.google.com/search/docs/guides/dynamic-rendering) to learn more.

## Features

- 🚀 **Uses a real, stable and up-to-date Chromium (Google Chrome):** Built on top of [puppeteer](https://github.com/GoogleChrome/puppeteer), an API for Headless Chrome
- 👩🏻‍⚕️ **Self-healing:** Rendergun constantly checks the healthy of the browser instance and restart it if necessary.
- ⚡️ **Cache:** Pages are cached to provide lighning fast responses. 
- 🔀 **Skip unnecessary requests:** Rendergun can skip requests that are not required for rendering, such as CSS and Images files, which can greatly increase the performance of rendering process.
- 🐳 **Runs on Docker:** Rendergun has an official Docker image. Just pull and run it!

## How to install

Rendergun can be used as a Node.js CLI or Docker container.

#### Rendergun Node.js CLI

```sh
# install rendergun install NPM
$ npm i -g rendergun 

# start rendergun with default configuration
$ rendergun
```

#### Rendergun Docker Container

```sh
docker run --name rendergun -p 3000:3000 goenning/rendergun
```

## Operations

### /render

- Use Case: Request a HTML rendered version of a webpage
- HTTP Method: GET or POST
- Parameters: 

| Location | Name | Default Value  | Comments |
| ---- | ---- | -------------- | ----------- |
| QueryString | url | | which url to pre-render |
| HTTP Header | x-rendergun-wait-until | `load` | which chrome event to wait before returning the HTML. Possible values are `load`, `domcontentloaded`, `networkidle0`,`networkidle2` |
| HTTP Header | x-rendergun-timeout | `10000` | timeout in miliseconds for Chrome to load the page |
| HTTP Header | x-rendergun-abort-request | | a RegExp that aborts all requests that matches it. Useful to skip requests to CSS/Images files that are not required for pre-rendering |

**Example:** [https://demo.fider.io](https://demo.fider.io) is a client-side rendered page built with React. Look at the source and you'll see that only JavaScript files and a JSON object is returned by the server. The whole HTML is built by React when it's executed by the browser. 

Start rendergun and open [http://localhost:3000/render?url=https://demo.fider.io](http://localhost:3000/render?url=https://demo.fider.io) on your browser. The visual result should be the same, except that now the server has returned just the HTML content, without the JavaScript files and the JSON object. Web crawlers like Google, Bing and DuckDuckGo prefer this over client-side rendered pages.

### /-/health

- Use Case: Check if Rendergun is healthy
- HTTP Method: GET

This is used to verify if Rendergun and its Headless Chrome instance are healthy. If everything is OK, `200` status code is returned, otherwise `500`. Rendergun will constantly monitor the healh of Headless Chrome instance and restart it if necessary. 

## Customize

Rendergun can be customized by using Environment Variables. The following settings are available.

| Name | Default Value  | Comments |
| ---- | -------------- | ----------- |
| PORT | `3000` | which port Rendergun should bind to |
| CACHE_MAX_SIZE | `100` | how many megabytes should Rendergun use for caching |
| CACHE_MAX_AGE | `1800` | how long (in seconds) should items be cached |