import type { OpenAIModel } from '../models';
import type { BaseVectorDB } from '../vectordb/BaseVectorDb';

export type AppConfig = {
  db?: BaseVectorDB;
  model?: OpenAIModel;
};
