const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'hello' },
  { role: 'assistant', content: '' }
];

async function main() {
  console.log('Fetching from Ollama...');
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        messages,
        stream: true,
      }),
    });
    console.log(`Status: ${res.status} [${Date.now() - start}ms]`);
    if (!res.ok) {
      console.log('Error text:', await res.text());
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while(true) {
      const {done, value} = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      console.log('Chunk:', text);
    }
    console.log(`Stream complete [${Date.now() - start}ms]`);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
main();
