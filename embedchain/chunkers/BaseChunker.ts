import { createHash } from 'crypto';
import type { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import type { BaseLoader } from '../loaders';
import type { Input, LoaderResult } from '../models';
import type { ChunkResult } from '../models/ChunkResult';

class BaseChunker {
  textSplitter: RecursiveCharacterTextSplitter;

  constructor(textSplitter: RecursiveCharacterTextSplitter) {
    this.textSplitter = textSplitter;
  }

  async createChunks(loader: BaseLoader, url: Input): Promise<ChunkResult> {
    const documents: ChunkResult['documents'] = [];
    const ids: ChunkResult['ids'] = [];
    const datas: LoaderResult = await loader.loadData(url);
    const metadatas: ChunkResult['metadatas'] = [];

    for (const data of datas) {
      const { content, metaData } = data;
      const chunks: string[] = await this.textSplitter.splitText(content);
  
      for (const chunk of chunks) {
        const chunkId = createHash('sha256')
          .update(chunk + metaData.url)
          .digest('hex');
        ids.push(chunkId);
        documents.push(chunk);
        metadatas.push(metaData);
      }
    }
    return {
      documents,
      ids,
      metadatas,
    };
  }
}

export { BaseChunker };
