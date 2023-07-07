/* eslint-disable max-classes-per-file */
import type { Collection } from 'chromadb';
import type { QueryResponse } from 'chromadb/dist/main/types';
import { Document } from 'langchain/document';
import type { ChatCompletionRequestMessage } from 'openai';
import { Configuration, OpenAIApi } from 'openai';

import type { BaseChunker } from './chunkers';
import { PdfFileChunker, QnaPairChunker, WebPageChunker } from './chunkers';
import type { BaseLoader } from './loaders';
import { LocalQnaPairLoader, PdfFileLoader, WebPageLoader } from './loaders';
import type {
  DataDict,
  DataType,
  FormattedResult,
  Input,
  LocalInput,
  RemoteInput,
} from './models';
import { ChromaDB } from './vectordb';
import type { BaseVectorDB } from './vectordb/BaseVectorDb';

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
      console.error('No collection');
    }
  }

  async setup_other(db: BaseVectorDB): Promise<void> {
    await db.init_db;
    // TODO: Figure out how we can initialize an unknown database.
    // this.db_client = db.client;
    // this.collection = db.collection;
    this.user_asks = [];
  }

  static getLoader(data_type: DataType) {
    const loaders: { [t in DataType]: BaseLoader } = {
      pdf_file: new PdfFileLoader(),
      web_page: new WebPageLoader(),
      qna_pair: new LocalQnaPairLoader(),
    };
    return loaders[data_type];
  }

  static getChunker(data_type: DataType) {
    const chunkers: { [t in DataType]: BaseChunker } = {
      pdf_file: new PdfFileChunker(),
      web_page: new WebPageChunker(),
      qna_pair: new QnaPairChunker(),
    };
    return chunkers[data_type];
  }

  public async add(data_type: DataType, url: RemoteInput) {
    const loader = EmbedChain.getLoader(data_type);
    const chunker = EmbedChain.getChunker(data_type);
    this.user_asks.push([data_type, url]);
    await this.load_and_embed(loader, chunker, url);
  }

  public async add_local(data_type: DataType, content: LocalInput) {
    const loader = EmbedChain.getLoader(data_type);
    const chunker = EmbedChain.getChunker(data_type);
    this.user_asks.push([data_type, content]);
    await this.load_and_embed(loader, chunker, content);
  }

  protected async load_and_embed(
    loader: any,
    chunker: BaseChunker,
    src: Input
  ) {
    const embeddingsData = await chunker.create_chunks(loader, src);
    let { documents, ids, metadatas } = embeddingsData;

    const existingDocs = await this.collection.get({ ids });
    const existingIds = new Set(existingDocs.ids);

    if (existingIds.size > 0) {
      const dataDict: DataDict = {};
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        if (!existingIds.has(id)) {
          dataDict.id = { doc: documents[i], meta: metadatas[i] };
        }
      }

      if (Object.keys(dataDict).length === 0) {
        console.log(`All data from ${src} already exists in the database.`);
        return;
      }
      ids = Object.keys(dataDict);
      const dataValues = Object.values(dataDict);
      documents = dataValues.map(({ doc }) => doc);
      metadatas = dataValues.map(({ meta }) => meta);
    }

    await this.collection.add({ documents, metadatas, ids });
    console.log(
      `Successfully saved ${src}. Total chunks count: ${await this.collection.count()}`
    );
  }

  static async formatResult(
    results: QueryResponse
  ): Promise<FormattedResult[]> {
    return results.documents[0].map((document: any, index: number) => {
      const metadata = results.metadatas[0][index] || {};
      // TODO: Add proper error handling
      const distance = results.distances ? results.distances[0][index] : null;
      return [new Document({ pageContent: document, metadata }), distance];
    });
  }

  static async getOpenAiAnswer(prompt: string) {
    const messages: ChatCompletionRequestMessage[] = [
      { role: 'user', content: prompt },
    ];
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
    });
    return (
      response.data.choices[0].message?.content ??
      'Response could not be processed.'
    );
  }

  protected async retrieveFromDatabase(input_query: string) {
    const result = await this.collection.query({
      nResults: 1,
      queryTexts: [input_query],
    });
    const resultFormatted = await EmbedChain.formatResult(result);
    const content = resultFormatted[0][0].pageContent;
    return content;
  }

  static generatePrompt(input_query: string, context: any) {
    const prompt = `Use the following pieces of context to answer the query at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n${context}\nQuery: ${input_query}\nHelpful Answer:`;
    return prompt;
  }

  static async getAnswerFromLlm(prompt: string) {
    const answer = await EmbedChain.getOpenAiAnswer(prompt);
    return answer;
  }

  public async query(input_query: string) {
    const context = await this.retrieveFromDatabase(input_query);
    const prompt = EmbedChain.generatePrompt(input_query, context);
    const answer = await EmbedChain.getAnswerFromLlm(prompt);
    return answer;
  }

  public async dryRun(input_query: string) {
    const context = await this.retrieveFromDatabase(input_query);
    const prompt = EmbedChain.generatePrompt(input_query, context);
    return prompt;
  }
}

class EmbedChainApp extends EmbedChain {
  // The EmbedChain app.
  // Has two functions: add and query.
  // adds(data_type, url): adds the data from the given URL to the vector db.
  // query(query): finds answer to the given query using vector database and LLM.
}

export { EmbedChainApp };
