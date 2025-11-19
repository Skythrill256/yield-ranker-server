import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function testUpload(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`Testing upload to ${API_URL}/api/admin/upload-dtr`);
    console.log(`File: ${filePath}`);
    console.log(`File size: ${fs.statSync(filePath).size} bytes`);
    console.log('');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    console.log('Uploading...');
    const response = await fetch(`${API_URL}/api/admin/upload-dtr`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    console.log('');
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    console.log('');

    if (response.ok && result.success) {
      console.log('✅ Upload successful!');
      console.log(`✅ Processed ${result.count} ETFs`);
      console.log(`✅ ${result.message}`);
      
      console.log('');
      console.log('Verifying data...');
      const verifyResponse = await fetch(`${API_URL}/api/etfs`);
      const verifyData = await verifyResponse.json();
      console.log(`✅ Database now contains ${verifyData.count} ETFs`);
      
      if (verifyData.data && verifyData.data.length > 0) {
        console.log('');
        console.log('Sample ETF from database:');
        console.log(JSON.stringify(verifyData.data[0], null, 2));
      }
    } else {
      console.error('❌ Upload failed!');
      console.error('Error:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node test-upload.js <path-to-excel-file>');
  console.log('');
  console.log('Example:');
  console.log('  node test-upload.js C:\\path\\to\\DTR.xlsx');
  console.log('');
  console.log('Environment variables:');
  console.log(`  API_URL=${API_URL}`);
  process.exit(1);
}

testUpload(filePath);

