"use client";

import React, { useState, useEffect } from 'react';
import ClientWalletMultiButton from './ClientWalletMultiButton';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const TokenForm = ({ onSubmit, isWalletConnected, connectWallet, walletBalance }) => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState(9);
  const [supply, setSupply] = useState(1000000);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [discord, setDiscord] = useState('');
  const [revokeFreeze, setRevokeFreeze] = useState(true);
  const [revokeMint, setRevokeMint] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isWalletConnected) {
      onSubmit({ name, symbol, decimals, supply, image, description, website, twitter, telegram, discord, revokeFreeze, revokeMint });
    } else {
      connectWallet();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
  };

  useEffect(() => {
    if (image) {
      const objectUrl = URL.createObjectURL(image);
      setImagePreview(objectUrl);

      // Free memory when this component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [image]);

  return (
    <div className="form-container">
      <h2 className="text-2xl font-bold mb-6">Create Solana Token</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-field"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} required className="input-field"/>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Decimals</label>
            <input type="number" value={decimals} onChange={(e) => setDecimals(Number(e.target.value))} required className="input-field"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Supply</label>
            <input type="number" value={supply} onChange={(e) => setSupply(Number(e.target.value))} required className="input-field"/>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Image</label>
          <label className="image-input">
            <input type="file" onChange={handleImageChange} required className="hidden" />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="image-preview" />
            ) : (
              <UploadIcon />
            )}
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Socials <span className="optional-text">(optional)</span></label>
          <input type="url" placeholder="Website URL" value={website} onChange={(e) => setWebsite(e.target.value)} className="input-field social-field mb-2"/>
          <input type="url" placeholder="Twitter URL" value={twitter} onChange={(e) => setTwitter(e.target.value)} className="input-field social-field mb-2"/>
          <input type="url" placeholder="Telegram Group URL" value={telegram} onChange={(e) => setTelegram(e.target.value)} className="input-field social-field mb-2"/>
          <input type="url" placeholder="Discord URL" value={discord} onChange={(e) => setDiscord(e.target.value)} className="input-field social-field"/>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows="4" className="input-field"></textarea>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <label className="flex items-center">
              <input type="checkbox" checked={revokeFreeze} onChange={(e) => setRevokeFreeze(e.target.checked)} className="mr-2" />
              <span className="text-sm">Revoke Freeze (required)</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">Revoke Freeze allows you to create a liquidity pool</p>
          </div>
          <div className="flex-1 ml-4">
            <label className="flex items-center">
              <input type="checkbox" checked={revokeMint} onChange={(e) => setRevokeMint(e.target.checked)} className="mr-2" />
              <span className="text-sm">Revoke Mint</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">Mint Authority allows you to increase tokens supply</p>
          </div>
        </div>
        
        {isWalletConnected ? (
          <button type="submit" className="wallet-button">
            Generate Token
          </button>
        ) : (
          <ClientWalletMultiButton className="wallet-button" />
        )}
      </form>
    </div>
  );
};

export default TokenForm;