class LocalQnaPairLoader {
  async load_data(content) {
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

module.exports = { LocalQnaPairLoader };
