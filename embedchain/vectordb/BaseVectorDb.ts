class BaseVectorDB {
  init_db: Promise<void>;

  constructor() {
    this.init_db = this.getClientAndCollection();
  }

  // eslint-disable-next-line class-methods-use-this
  protected async getClientAndCollection(): Promise<void> {
    throw new Error('get_client_and_collection() method is not implemented');
  }
}

export { BaseVectorDB };
