const { createHash } = require("crypto");

class BaseChunker {
  constructor(text_splitter) {
    this.text_splitter = text_splitter;
  }

  async create_chunks(loader, url) {
    const documents = [];
    const ids = [];
    const datas = await loader.load_data(url);
    const metadatas = [];
    for (const data of datas) {
      const content = data["content"];
      const meta_data = data["meta_data"];
      const chunks = await this.text_splitter.splitText(content);
      const url = meta_data["url"];
      for (const chunk of chunks) {
        const chunk_id = createHash("sha256")
          .update(chunk + url)
          .digest("hex");
        ids.push(chunk_id);
        documents.push(chunk);
        metadatas.push(meta_data);
      }
    }
    return {
      documents: documents,
      ids: ids,
      metadatas: metadatas,
    };
  }
}

module.exports = { BaseChunker };
