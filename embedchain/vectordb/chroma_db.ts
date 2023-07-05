import { ChromaClient, Collection, OpenAIEmbeddingFunction } from "chromadb";
import { BaseVectorDB } from "./base_vector_db";

const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY ?? '',
});

class ChromaDB extends BaseVectorDB {
  client: ChromaClient | undefined;
  collection: Collection | null = null;

  constructor() {
    super();
  }

  async get_client_and_collection(): Promise<void> {
    this.client = new ChromaClient({path: "http://localhost:8000"});
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

export { ChromaDB };
