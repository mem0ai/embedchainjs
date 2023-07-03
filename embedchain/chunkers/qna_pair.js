const { BaseChunker } = require("./base_chunker");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

const TEXT_SPLITTER_CHUNK_PARAMS = {
  chunkSize: 300,
  chunkOverlap: 0,
  keepSeparator: false,
};

class QnaPairChunker extends BaseChunker {
  constructor() {
    const text_splitter = new RecursiveCharacterTextSplitter(
      TEXT_SPLITTER_CHUNK_PARAMS
    );
    super(text_splitter);
  }
}

module.exports = { QnaPairChunker };
