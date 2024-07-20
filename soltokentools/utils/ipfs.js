// utils/ipfs.js
"use client";

import axios from 'axios';

const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;

console.log('Pinata API Key:', pinataApiKey);
console.log('Pinata Secret API Key:', pinataSecretApiKey);

if (!pinataApiKey || !pinataSecretApiKey || !pinataJwt) {
  throw new Error('Pinata API keys must be set');
}

export const uploadToIPFS = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'pinata_api_key': pinataApiKey,
      'pinata_secret_api_key': pinataSecretApiKey,
      'Authorization': `Bearer ${pinataJwt}`
    }
  });

  return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
};

export const uploadMetadataToIPFS = async (metadata) => {
  const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
    headers: {
      'pinata_api_key': pinataApiKey,
      'pinata_secret_api_key': pinataSecretApiKey,
      'Authorization': `Bearer ${pinataJwt}`
    }
  });

  return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
};
