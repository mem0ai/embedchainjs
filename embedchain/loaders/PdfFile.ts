const pdfjsLib = require("pdfjs-dist");
import { clean_string } from "../utils";
import { LoaderResult, Metadata } from "../models";
import { TextContent } from 'pdfjs-dist/types/src/display/api';

interface Page {
  page_content: string;
}

class PdfFileLoader {
  async get_pages_from_pdf(url: string): Promise<Page[]> {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    const numPages: number = pdf.numPages;
    const extractedPages: Page[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const pageText: TextContent = await page.getTextContent();
      const pageContent: string = pageText.items.map((item) => ('str' in item) ? item.str : '').join(" ");
      
      extractedPages.push({
        page_content: pageContent,
      });
    }
    return extractedPages;
  }

  async load_data(url: string): Promise<LoaderResult> {
    const pages: Page[] = await this.get_pages_from_pdf(url);
    const output: LoaderResult = [];

    if (!pages.length) {
      throw new Error("No data found");
    }

    for (const page of pages) {
      let content: string = page.page_content;
      content = clean_string(content);
      const meta_data: Metadata = {
        url: url,
      };
      output.push({
        content,
        meta_data: meta_data,
      });
    }
    return output;
  }
}

export { PdfFileLoader };
