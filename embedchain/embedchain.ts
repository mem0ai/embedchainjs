import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { Document } from "langchain/document";
import { 
  LocalQnaPairLoader, 
  WebPageLoader, 
  PdfFileLoader, 
  BaseLoader
} from "./loaders";
import { 
  QnaPairChunker, 
  WebPageChunker, 
  PdfFileChunker, 
  BaseChunker
} from "./chunkers";
import { ChromaDB } from "./vectordb";
import { DataDict, DataType, FormattedResult, Input, LocalInput, RemoteInput } from "./models";
import { Collection } from "chromadb";
import { QueryResponse } from "chromadb/dist/main/types";
import { BaseVectorDB } from "./vectordb/base_vector_db";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

class EmbedChain {
  db_client: any;
  // TODO: Definitely assign
  collection!: Collection;
  user_asks: [DataType, Input][] = [];
  init_app: Promise<void>;

  constructor(db: BaseVectorDB | null = null) {
    if (!db) {
      this.init_app = this.setup_chroma();
    } else {
      this.init_app = this.setup_other(db);
    }
    
  }

  async setup_chroma(): Promise<void> {
    const db = new ChromaDB();
    await db.init_db;
    this.db_client = db.client;
    if (db.collection) {
      this.collection = db.collection;
    } else {
      // TODO: Add proper error handling
      console.error("No collection");
      return
    }
  }

  async setup_other(db: BaseVectorDB): Promise<void> {
    await db.init_db;
    // TODO: Figure out how we can initialize an unknown database.
    // this.db_client = db.client;
    // this.collection = db.collection;
    this.user_asks = [];
  }

  _get_loader(data_type: DataType) {
    const loaders: {[t in DataType]: BaseLoader} = {
      pdf_file: new PdfFileLoader(),
      web_page: new WebPageLoader(),
      qna_pair: new LocalQnaPairLoader(),
    };
    return loaders[data_type];
  }

  _get_chunker(data_type: DataType) {
    const chunkers: {[t in DataType]: BaseChunker} = {
      pdf_file: new PdfFileChunker(),
      web_page: new WebPageChunker(),
      qna_pair: new QnaPairChunker(),
    };
    return chunkers[data_type]
  }

  async add(data_type: DataType, url: RemoteInput) {
    const loader = this._get_loader(data_type);
    const chunker = this._get_chunker(data_type);
    this.user_asks.push([data_type, url]);
    await this.load_and_embed(loader, chunker, url);
  }

  async add_local(data_type: DataType, content: LocalInput) {
    const loader = this._get_loader(data_type);
    const chunker = this._get_chunker(data_type);
    this.user_asks.push([data_type, content]);
    await this.load_and_embed(loader, chunker, content);
  }

  async load_and_embed(loader: any, chunker: BaseChunker, src: Input) {
    const embeddings_data = await chunker.create_chunks(loader, src);
    let { documents, ids, metadatas } = embeddings_data;

    const existing_docs = await this.collection.get({ids});
    const existing_ids = new Set(existing_docs.ids);

    if (existing_ids.size > 0) {
      const data_dict: DataDict = {};
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!existing_ids.has(id)) {
          data_dict.id = { doc: documents[i], meta: metadatas[i] };
        }
      }

      if (Object.keys(data_dict).length === 0) {
        console.log(`All data from ${src} already exists in the database.`);
        return;
      }
      ids = Object.keys(data_dict);
      const data_values = Object.values(data_dict);
      documents = data_values.map(({ doc }) => doc);
      metadatas = data_values.map(({ meta }) => meta);
    }

    await this.collection.add({ documents, metadatas, ids });
    console.log(
      `Successfully saved ${src}. Total chunks count: ${await this.collection.count()}`
    );
  }

  async _format_result(results: QueryResponse): Promise<FormattedResult[]> {
    return results.documents[0].map((document: any, index: number) => {
      const metadata = results.metadatas[0][index] || {};
      // TODO: Add proper error handling
      const distance = results.distances ? results.distances[0][index] : null;
      return [new Document({ pageContent: document, metadata }), distance];
    });
  }

  async get_openai_answer(prompt: string) {
    const messages: ChatCompletionRequestMessage[] = [{ role: 'user', content: prompt }];
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
    });
    return response.data.choices[0].message?.content ?? 'Response could not be processed.';
  }

  async retrieve_from_database(input_query: string) {
    const result = await this.collection.query({
      nResults: 1,
      queryTexts: [input_query],
    });
    const result_formatted = await this._format_result(result);
    const content = result_formatted[0][0].pageContent;
    return content;
  }

  generate_prompt(input_query: string, context: any) {
    const prompt = `Use the following pieces of context to answer the query at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n${context}\nQuery: ${input_query}\nHelpful Answer:`;
    return prompt;
  }

  async get_answer_from_llm(prompt: string) {
    const answer = await this.get_openai_answer(prompt);
    return answer;
  }

  async query(input_query: string) {
    const context = await this.retrieve_from_database(input_query);
    const prompt = this.generate_prompt(input_query, context);
    const answer = await this.get_answer_from_llm(prompt);
    return answer;
  }
}

class EmbedChainApp extends EmbedChain {
  // The EmbedChain app.
  // Has two functions: add and query.
  // adds(data_type, url): adds the data from the given URL to the vector db.
  // query(query): finds answer to the given query using vector database and LLM.
}

export { EmbedChainApp };
