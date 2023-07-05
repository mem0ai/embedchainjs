import axios from "axios";
import { JSDOM } from "jsdom";
import { clean_string } from "../utils";

class WebPageLoader {
  async load_data(url: string) {
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
      for (const element of Array.from(elements)) {
        (element as HTMLElement).textContent = " ";
      }
    });

    const output = [];
    let content = document.body.textContent;
    if (!content) {
        throw new Error("Web page content is empty.");
    } 
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

export { WebPageLoader };
