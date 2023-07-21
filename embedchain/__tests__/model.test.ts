import { EmbedChainApp } from '../embedchain';

describe('Test Model', () => {
  it('tests the model', async () => {
    let app = new EmbedChainApp();

    expect(app.model).toBe('gpt-3.5-turbo');
    app.setModel('gpt-4');
    expect(app.model).toBe('gpt-4');

    app = new EmbedChainApp({ model: 'gpt-4-32k' });
    expect(app.model).toBe('gpt-4-32k');
  });
});
