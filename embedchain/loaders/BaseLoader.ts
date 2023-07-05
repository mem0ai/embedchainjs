import { Input, LoaderResult } from "../models";

export abstract class BaseLoader {
  abstract load_data(src: Input): Promise<LoaderResult>;
}