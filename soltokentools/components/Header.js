// components/Header.js
"use client";

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Header = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <div></div> {/* Empty div to push the button to the right */}
      <WalletMultiButton />
    </header>
  );
};

export default Header;