const { ChromaDB } = require("./vectordb");
const { Configuration, OpenAIApi } = require("openai");
const { Document } = require("langchain/document");
const {
  LocalQnaPairLoader,
  WebPageLoader,
  PdfFileLoader,
} = require("./loaders");
const {
  QnaPairChunker,
  WebPageChunker,
  PdfFileChunker,
} = require("./chunkers");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

class EmbedChain {
  constructor(db = null) {
    if (db == null) {
      this.init_app = this.setup_chroma();
    }
  }

  async setup_chroma() {
    /*
    Initializes the EmbedChain instance, sets up a vector DB client and
    creates a collection.
    */
    const db = new ChromaDB();
    await db.init_db;
    this.db_client = db.client;
    this.collection = db.collection;
    this.user_asks = [];
  }

  _get_loader(data_type) {
    /*
    Returns the appropriate data loader for the given data type.

    :param data_type: The type of the data to load.
    :return: The loader for the given data type.
    :raises Error: If an unsupported data type is provided.
    */
    const loaders = {
      pdf_file: new PdfFileLoader(),
      web_page: new WebPageLoader(),
      qna_pair: new LocalQnaPairLoader(),
    };
    if (data_type in loaders) {
      return loaders[data_type];
    } else {
      throw new Error(`Unsupported data type: ${data_type}`);
    }
  }

  _get_chunker(data_type) {
    /*
    Returns the appropriate chunker for the given data type.

    :param data_type: The type of the data to chunk.
    :return: The chunker for the given data type.
    :raises Error: If an unsupported data type is provided.
    */
    const chunkers = {
      pdf_file: new PdfFileChunker(),
      web_page: new WebPageChunker(),
      qna_pair: new QnaPairChunker(),
    };
    if (data_type in chunkers) {
      return chunkers[data_type];
    } else {
      throw new Error(`Unsupported data type: ${data_type}`);
    }
  }

  async add(data_type, url) {
    /*
    Adds the data from the given URL to the vector db.
    Loads the data, chunks it, create embedding for each chunk
    and then stores the embedding to vector database.

    :param data_type: The type of the data to add.
    :param url: The URL where the data is located.
    */
    const loader = this._get_loader(data_type);
    const chunker = this._get_chunker(data_type);
    this.user_asks.push([data_type, url]);
    await this.load_and_embed(loader, chunker, url);
  }

  async add_local(data_type, content) {
    /*
    Adds the data you supply to the vector db.
    Loads the data, chunks it, create embedding for each chunk
    and then stores the embedding to vector database.

    :param data_type: The type of the data to add.
    :param content: The local data. Refer to the `README` for formatting.
    */
    const loader = this._get_loader(data_type);
    const chunker = this._get_chunker(data_type);
    this.user_asks.push([data_type, content]);
    await this.load_and_embed(loader, chunker, content);
  }

  async load_and_embed(loader, chunker, url) {
    /*
    Loads the data from the given URL, chunks it, and adds it to the database.

    :param loader: The loader to use to load the data.
    :param chunker: The chunker to use to chunk the data.
    :param url: The URL where the data is located.
    */

    const embeddings_data = await chunker.create_chunks(loader, url);
    let documents = embeddings_data.documents;
    let metadatas = embeddings_data.metadatas;
    let ids = embeddings_data.ids;

    // get existing ids, and discard doc if any common id exist.
    const existing_docs = await this.collection.get(ids);
    const existing_ids = new Set(existing_docs.ids);

    if (existing_ids.size > 0) {
      const data_dict = {};
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!existing_ids.has(id)) {
          data_dict[id] = { doc: documents[i], meta: metadatas[i] };
        }
      }

      if (Object.keys(data_dict).length === 0) {
        console.log(`All data from ${url} already exists in the database.`);
        return;
      }
      ids = Object.keys(data_dict);
      const data_values = Object.values(data_dict);
      documents = data_values.map(({ doc }) => doc);
      metadatas = data_values.map(({ meta }) => meta);
    }

    await this.collection.add({ documents, metadatas, ids });
    console.log(
      `Successfully saved ${url}. Total chunks count: ${await this.collection.count()}`
    );
  }

  async _format_result(results) {
    return results.documents[0].map((document, index) => {
      const metadata = results.metadatas[0][index] || {};
      const distance = results.distances[0][index];
      return [new Document({ pageContent: document, metadata }), distance];
    });
  }

  async get_openai_answer(prompt) {
    const messages = [{ role: "user", content: prompt }];
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
    });
    return response.data.choices[0].message.content;
  }

  async retrieve_from_database(input_query) {
    /*
    Queries the vector database based on the given input query.
    Gets relevant doc based on the query

    :param input_query: The query to use.
    :return: The content of the document that matched your query.
    */
    const result = await this.collection.query({
      nResults: 1,
      queryTexts: [input_query],
    });
    const result_formatted = await this._format_result(result);
    const content = result_formatted[0][0].pageContent;
    return content;
  }

  generate_prompt(input_query, context) {
    /*
    Generates a prompt based on the given query and context, ready to be passed to an LLM

    :param input_query: The query to use.
    :param context: Similar documents to the query used as context.
    :return: The prompt
    */
    const prompt = `Use the following pieces of context to answer the query at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n${context}\nQuery: ${input_query}\nHelpful Answer:`;
    return prompt;
  }

  async get_answer_from_llm(prompt) {
    /*
    Gets an answer based on the given query and context by passing it
    to an LLM.

    :param query: The query to use.
    :param context: Similar documents to the query used as context.
    :return: The answer.
    */
    const answer = await this.get_openai_answer(prompt);
    return answer;
  }

  async query(input_query) {
    /*
    Queries the vector database based on the given input query.
    Gets relevant doc based on the query and then passes it to an
    LLM as context to get the answer.

    :param input_query: The query to use.
    :return: The answer to the query.
    */
    const context = await this.retrieve_from_database(input_query);
    const prompt = this.generate_prompt(input_query, context);
    const answer = await this.get_answer_from_llm(prompt);
    return answer;
  }
}

class EmbedChainApp extends EmbedChain {
  /*
  The EmbedChain app.
  Has two functions: add and query.
  adds(data_type, url): adds the data from the given URL to the vector db.
  query(query): finds answer to the given query using vector database and LLM.
  */
}

module.exports = { EmbedChainApp };
