const { clean_string } = require("../utils");
const pdfjsLib = require("pdfjs-dist");

class PdfFileLoader {
  async get_pages_from_pdf(url) {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const extractedPages = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const pageText = await page.getTextContent();
      const pageContent = pageText.items.map((item) => item.str).join(" ");
      extractedPages.push({
        page_content: pageContent,
      });
    }
    return extractedPages;
  }

  async load_data(url) {
    const pages = await this.get_pages_from_pdf(url);
    const output = [];
    if (!pages.length) {
      throw new Error("No data found");
    }
    for (const page of pages) {
      let content = page.page_content;
      content = clean_string(content);
      const meta_data = {
        url: url,
      };
      output.push({
        content: content,
        meta_data: meta_data,
      });
    }
    return output;
  }
}

module.exports = { PdfFileLoader };
