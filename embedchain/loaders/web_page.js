const axios = require("axios");
const { JSDOM } = require("jsdom");
const { clean_string } = require("../utils");

class WebPageLoader {
  async load_data(url) {
    const response = await axios.get(url);
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const unwantedTags = [
      "nav",
      "aside",
      "form",
      "header",
      "noscript",
      "svg",
      "canvas",
      "footer",
      "script",
      "style",
    ];
    unwantedTags.forEach((tagName) => {
      const elements = document.getElementsByTagName(tagName);
      for (const element of elements) {
        element.textContent = " ";
      }
    });

    const output = [];
    let content = document.body.textContent;
    content = clean_string(content);
    const meta_data = {
      url: url,
    };
    output.push({
      content: content,
      meta_data: meta_data,
    });
    return output;
  }
}

module.exports = { WebPageLoader };
