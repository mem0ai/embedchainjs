class BaseVectorDB {
  constructor() {
    this.init_db = this.get_client_and_collection();
  }

  async get_client_and_collection() {
    throw new Error("get_client_and_collection() method is not implemented");
  }
}

module.exports = { BaseVectorDB };
