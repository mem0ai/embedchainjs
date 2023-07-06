import { EmbedChainApp } from "./embedchain";

export const App = async () => {
    const app = new EmbedChainApp();
    await app.init_app;
    return app;
}
