const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");
const { BaseVectorDB } = require("./base_vector_db");

const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY,
});

class ChromaDB extends BaseVectorDB {
  constructor() {
    super();
  }

  async get_client_and_collection() {
    this.client = new ChromaClient("http://localhost:8000");
    try {
      this.collection = await this.client.getCollection({
        name: "embedchain_store",
        embeddingFunction: embedder,
      });
    } catch (err) {
      if (!this.collection) {
        this.collection = await this.client.createCollection({
          name: "embedchain_store",
          embeddingFunction: embedder,
        });
      }
    }
  }
}

module.exports = { ChromaDB };
