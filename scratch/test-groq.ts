import fs from 'fs';
import Groq from 'groq-sdk';
import 'dotenv/config'; // Load .env

async function testGroq() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log('Testing Groq Audio API...');

  // Create a dummy audio file
  const testFile = 'scratch/test.ogg';
  fs.writeFileSync(testFile, 'dummy audio data');

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(testFile),
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'id',
    });
    console.log('Result:', transcription);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

testGroq();
