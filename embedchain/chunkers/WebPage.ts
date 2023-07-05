import { BaseChunker } from "./BaseChunker";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

interface TextSplitterChunkParams {
  chunkSize: number;
  chunkOverlap: number;
  keepSeparator: boolean;
}

const TEXT_SPLITTER_CHUNK_PARAMS: TextSplitterChunkParams = {
  chunkSize: 500,
  chunkOverlap: 0,
  keepSeparator: false,
};

class WebPageChunker extends BaseChunker {
  constructor() {
    const text_splitter = new RecursiveCharacterTextSplitter(
      TEXT_SPLITTER_CHUNK_PARAMS
    );
    super(text_splitter);
  }
}

export { WebPageChunker };
