import { QnaPair } from "../models";
import { BaseLoader } from "./BaseLoader";

class LocalQnaPairLoader extends BaseLoader {
    async load_data(content: QnaPair) {
      const [question, answer] = content;
      const content_text = `Q: ${question}\nA: ${answer}`;
      const meta_data = {
        url: "local",
      };
      return [
        {
          content: content_text,
          meta_data: meta_data,
        },
      ];
    }
  }
  
  export { LocalQnaPairLoader };
  