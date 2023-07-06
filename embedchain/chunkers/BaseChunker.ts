import { createHash } from "crypto";
import { BaseLoader, } from "../loaders";
import { Input, LoaderResult } from "../models";
import { ChunkResult } from "../models/ChunkResult";

class BaseChunker {
  text_splitter: any;  // the type of text_splitter is not specified in your code

  constructor(text_splitter: any) {
    this.text_splitter = text_splitter;
  }

  async create_chunks(loader: BaseLoader, url: Input): Promise<ChunkResult> {
    const documents: ChunkResult['documents'] = [];
    const ids: ChunkResult['ids'] = [];
    const datas: LoaderResult = await loader.load_data(url);
    const metadatas: ChunkResult['metadatas'] = [];
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

export { BaseChunker };
