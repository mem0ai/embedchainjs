class BaseVectorDB {
    init_db: Promise<void>;
  
    constructor() {
      this.init_db = this.get_client_and_collection();
    }
  
    async get_client_and_collection(): Promise<void> {
      throw new Error("get_client_and_collection() method is not implemented");
    }
  }
  
  export { BaseVectorDB };
  