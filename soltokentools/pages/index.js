"use client";

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  Keypair,
  Transaction,
  sendTransaction,
  connect,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  Connection,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount,
  createSetAuthorityInstruction, 
  AuthorityType, 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  MINT_SIZE,
  createInitializeMintInstruction,
  createMintToInstruction,
  getMint, 
  createAssociatedTokenAccount,
  TokenAccountNotFoundError,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  createCreateMetadataAccountV3Instruction,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import TokenForm from '../components/TokenForm';
import { uploadToIPFS, uploadMetadataToIPFS } from '../utils/ipfs';
import ClientWalletMultiButton from '../components/ClientWalletMultiButton';
import { Metaplex } from "@metaplex-foundation/js";

// Manually define TOKEN_METADATA_PROGRAM_ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const RECEIVER_PUBLIC_KEY = new PublicKey('Bdwf9SWWnPZT3EP5VSiGfRvSowahxdyUUYLM3RANrXQ2');
const RECEIVER_AMOUNT = 0.00 * LAMPORTS_PER_SOL; // 0.25 SOL in lamports

const FAQ = [
  {
    question: "What is the Solana SPL Token Creator?",
    answer: "The Sol Token Tools Solana SPL Token Creator is an advanced Smart Contract empowering users to effortlessly generate customized SPL Tokens (Solana tokens), specifically tailored to their preferences in terms of supply, name, symbol, description, and image on the Solana Chain. Making tokens is super quick and cheap with our easy process."
  },
  {
    question: "Is it Safe to Create Solana SPL Tokens here?",
    answer: "Yes, our tool is completely safe. It is a dApp that creates your token, giving you and only you the mint and freeze Authority (the control of a SPL Token). Our dApp is audited and used by hundreds of users every month."
  },
  {
    question: "How much time will the Solana SPL Token Creator Take?",
    answer: "The time of your Token Creation depends on the TPS Status of Solana. It usually takes just a few seconds so do not worry. If you have any issue please contact us."
  },
  {
    question: "How much does it cost?",
    answer: "The token creation currently costs 0.25 Sol, it includes all fees necessary for the Token Creation in Solana mainnet."
  },
  {
    question: "Which wallet can I use?",
    answer: "You can use any Solana Wallet such as Phantom, Solflare, Backpack, etc."
  },
  {
    question: "How many tokens can I create for each decimal amount?",
    answer: `Here is the max amount of tokens you can create for each decimal range:\n* 0 to 4 - 1,844,674,407,370,955\n* 5 to 7 - 1,844,674,407,370\n* 8 - 184,467,440,737\n* 9 - 18,446,744,073`
  }
];

const RevokeMintAuthorityGUI = ({ isWalletConnected, connectWallet }) => {
  const [selectedToken, setSelectedToken] = useState('');
  const [userTokens, setUserTokens] = useState([]);
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const fetchUserTokens = async () => {
    if (!publicKey) return;

    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const tokens = await Promise.all(tokenAccounts.value.map(async (tokenAccount) => {
        const mint = new PublicKey(tokenAccount.account.data.parsed.info.mint);
        const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
        const mintInfo = await getMint(connection, mint);
        return {
          address: tokenAccount.pubkey.toString(),
          mint: mint.toString(),
          name: `Token ${mint.toString().substring(0, 4)}`,
          amount: tokenAmount,
          mintAuthority: mintInfo.mintAuthority && mintInfo.mintAuthority.toString(),
        };
      }));

      setUserTokens(tokens.filter(token => token.mintAuthority === publicKey.toString()));
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    }
  };

  useEffect(() => {
    if (isWalletConnected) {
      fetchUserTokens();
    }
  }, [isWalletConnected, publicKey, connection]);

  const handleRevokeMint = async () => {
    if (!selectedToken) {
      alert('Please select a token first');
      return;
    }

    try {
      const mintPublicKey = new PublicKey(selectedToken);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const instruction = createSetAuthorityInstruction(
        mintPublicKey,
        publicKey,
        AuthorityType.MintTokens,
        null
      );

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction]
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      const signature = await sendTransaction(transaction, connection);
      console.log("Revoke mint authority transaction sent. Signature:", signature);

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      console.log("Revoke mint authority transaction confirmed");

      alert(`Mint authority revoked for ${selectedToken}`);
      fetchUserTokens(); // Refresh the token list
    } catch (error) {
      console.error('Error revoking mint authority:', error);
      alert('Failed to revoke mint authority: ' + error.message);
    }
  };

  return (
    <div className="revoke-mint-gui">
      <h2>Revoke Mint Authority</h2>
      <p>Revoking mint authority ensures that no more tokens can be minted. This provides security and peace of mind to buyers. The cost is 0.05 SOL</p>
      {isWalletConnected ? (
        <>
          <select 
            value={selectedToken} 
            onChange={(e) => setSelectedToken(e.target.value)}
            className="input-field"
          >
            <option value="">Select a token</option>
            {userTokens.map((token) => (
              <option key={token.address} value={token.mint}>
                {token.name} - Amount: {token.amount}
              </option>
            ))}
          </select>
          <button onClick={handleRevokeMint} className="wallet-button">
            Revoke Mint Authority
          </button>
        </>
      ) : (
        <ClientWalletMultiButton className="wallet-button" />
      )}
    </div>
  );
};

const Home = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [walletBalance, setWalletBalance] = useState(0);
  const [openFAQ, setOpenFAQ] = useState({});
  const [transactionStatus, setTransactionStatus] = useState(null);

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((balance) => {
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      });
    }
  }, [publicKey, connection]);

  const handleTokenCreation = async ({ name, symbol, decimals, supply, image, description, website, twitter, telegram, discord, revokeFreeze, revokeMint }) => {
    if (!publicKey) {
      setTransactionStatus({ type: 'error', message: 'Please connect your wallet' });
      return;
    }
  
    console.log("Starting token creation process...");
    console.log("Current wallet public key:", publicKey.toString());
  
    try {
      setTransactionStatus({ type: 'loading', message: 'Preparing transaction...' });
  
      // Calculate the total cost
      const totalCost = 0.25 + (revokeFreeze ? 0.05 : 0) + (revokeMint ? 0.05 : 0);
      console.log("Calculated total cost:", totalCost, "SOL");
  
      // Check balance
      console.log("Checking wallet balance...");
      const balance = await connection.getBalance(publicKey);
      console.log("Current balance:", balance / LAMPORTS_PER_SOL, "SOL");
      const requiredLamports = (totalCost * LAMPORTS_PER_SOL) + (0.002 * LAMPORTS_PER_SOL);
      if (balance < requiredLamports) {
        setTransactionStatus({ type: 'error', message: `Insufficient funds. You need at least ${totalCost} SOL, but you only have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL.` });
        return;
      }
  
      // Upload image to IPFS
      console.log("Uploading image to IPFS...");
      let imageUrl;
      try {
        imageUrl = await uploadToIPFS(image);
        console.log("Image uploaded to IPFS:", imageUrl);
      } catch (error) {
        console.error("Error uploading image to IPFS:", error);
        setTransactionStatus({ type: 'error', message: 'Failed to upload image to IPFS' });
        return;
      }
  
      // Create metadata object
      console.log("Creating metadata object...");
      const metadata = {
        name: name,
        symbol: symbol,
        description: description,
        image: imageUrl,
        properties: {
          files: [{ uri: imageUrl, type: "image/png" }],
          category: "image",
          creators: [{
            name: 'SOL TOKEN TOOLS',
            site: 'https://www.soltokentools.io'
          }]
        },
        attributes: []
      };
  
      // Add optional social links
      if (website) metadata.external_url = website;
      if (twitter) metadata.attributes.push({ trait_type: "Twitter", value: twitter });
      if (telegram) metadata.attributes.push({ trait_type: "Telegram", value: telegram });
      if (discord) metadata.attributes.push({ trait_type: "Discord", value: discord });
  
      // Upload metadata to IPFS
      console.log("Uploading metadata to IPFS...");
      let metadataUrl;
      try {
        metadataUrl = await uploadMetadataToIPFS(metadata);
        console.log("Metadata uploaded to IPFS:", metadataUrl);
      } catch (error) {
        console.error("Error uploading metadata to IPFS:", error);
        setTransactionStatus({ type: 'error', message: 'Failed to upload metadata to IPFS' });
        return;
      }
  
      // Create a new mint account
      console.log("Creating mint account...");
      setTransactionStatus({ type: 'loading', message: 'Creating mint account...' });
      let mint;
      try {
        const mintKeypair = Keypair.generate();
        console.log("New mint keypair generated:", mintKeypair.publicKey.toString());
  
        const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        console.log("Lamports for rent exemption:", lamports);
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        console.log("Latest blockhash:", blockhash);
        
        const createAccountInstruction = SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        });
  
        const initializeMintInstruction = createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          publicKey,
          publicKey,
          TOKEN_PROGRAM_ID
        );
  
        const transaction = new Transaction().add(createAccountInstruction, initializeMintInstruction);
        transaction.feePayer = publicKey;
        transaction.recentBlockhash = blockhash;
  
        console.log("Sending transaction to create mint account...");
        const signature = await sendTransaction(transaction, connection, { signers: [mintKeypair] });
        console.log("Transaction sent. Signature:", signature);
        
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
        console.log("Transaction confirmed");
        
        mint = mintKeypair.publicKey;
        console.log("Mint created:", mint.toString());
      } catch (error) {
        console.error("Error creating mint:", error);
        setTransactionStatus({ type: 'error', message: 'Failed to create mint account: ' + error.message });
        return;
      }
      
// Get the associated token account
setTransactionStatus({ type: 'loading', message: 'Creating associated token account...' });
let associatedTokenAccount;
try {
  console.log("Attempting to get or create associated token account...");
  console.log("Mint:", mint.toString());
  console.log("Owner:", publicKey.toString());
  
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    publicKey
  );
  console.log("Associated token address:", associatedTokenAddress.toString());

  // Check if the account already exists
  const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
  
  if (accountInfo !== null) {
    console.log("Associated token account already exists");
    associatedTokenAccount = associatedTokenAddress;
  } else {
    console.log("Creating new associated token account");
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        mint
      )
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    const signature = await sendTransaction(transaction, connection);
    console.log("Create associated token account transaction sent. Signature:", signature);

    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    console.log("Associated token account created");
    associatedTokenAccount = associatedTokenAddress;
  }

  console.log("Associated token account:", associatedTokenAccount.toString());
} catch (error) {
  console.error("Detailed error handling associated token account:", error);
  setTransactionStatus({ type: 'error', message: 'Failed to handle associated token account: ' + error.message });
  return;
}
      
            // Mint tokens
setTransactionStatus({ type: 'loading', message: 'Minting tokens...' });
try {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const mintInstruction = createMintToInstruction(
    mint,
    associatedTokenAccount,
    publicKey,
    BigInt(supply * Math.pow(10, decimals))
  );

  const transaction = new Transaction().add(mintInstruction);
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = blockhash;

  console.log("Sending transaction to mint tokens...");
  const signature = await sendTransaction(transaction, connection);
  console.log("Mint tokens transaction sent. Signature:", signature);
  
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  console.log("Minting transaction confirmed");
} catch (error) {
  console.error("Detailed error minting tokens:", error);
  setTransactionStatus({ type: 'error', message: 'Failed to mint tokens: ' + error.message });
  return;
}
      
// Create metadata
console.log("Creating metadata...");
setTransactionStatus({ type: 'loading', message: 'Creating metadata...' });
try {
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );

  const tokenMetadata = {
    name: name,
    symbol: symbol,
    uri: metadataUrl,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
  };

  const createMetadataInstructionData = Buffer.from(
    JSON.stringify({
      instruction: 0, // CreateMetadataAccountV3
      data: tokenMetadata,
      isMutable: true,
    })
  );

  const createMetadataInstruction = new TransactionInstruction({
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: publicKey, isSigner: true, isWritable: false },
      { pubkey: publicKey, isSigner: true, isWritable: false },
      { pubkey: publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: createMetadataInstructionData,
  });

  const transaction = new Transaction().add(createMetadataInstruction);
  transaction.feePayer = publicKey;
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  console.log("Sending transaction to create metadata...");
  const signature = await sendTransaction(transaction, connection);
  console.log("Metadata creation transaction sent. Signature:", signature);
  
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  console.log("Metadata created. Signature:", signature);
} catch (error) {
  console.error("Error creating metadata:", error);
  setTransactionStatus({ type: 'error', message: 'Failed to create metadata: ' + error.message });
  return;
}

      // Revoke authorities if requested
if (revokeFreeze || revokeMint) {
  console.log("Revoking authorities...");
  setTransactionStatus({ type: 'loading', message: 'Revoking authorities...' });
  try {
    const transaction = new Transaction();

    if (revokeFreeze) {
      transaction.add(
        createSetAuthorityInstruction(
          mint,
          publicKey,
          AuthorityType.FreezeAccount,
          null
        )
      );
    }

    if (revokeMint) {
      transaction.add(
        createSetAuthorityInstruction(
          mint,
          publicKey,
          AuthorityType.MintTokens,
          null
        )
      );
    }

    transaction.feePayer = publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    console.log("Sending transaction to revoke authorities...");
    const signature = await sendTransaction(transaction, connection);
    console.log("Revoke authorities transaction sent. Signature:", signature);

    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    console.log("Authorities revoked. Signature:", signature);
  } catch (error) {
    console.error("Error revoking authorities:", error);
    setTransactionStatus({ type: 'error', message: 'Failed to revoke authorities: ' + error.message });
    return;
  }
}

      // Final transaction to transfer SOL
      console.log("Sending final transaction...");
      setTransactionStatus({ type: 'loading', message: 'Sending final transaction...' });
      try {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: RECEIVER_PUBLIC_KEY,
            lamports: RECEIVER_AMOUNT,
          })
        );

        transaction.feePayer = publicKey;
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);
        console.log("Final transaction sent. Signature:", signature);

        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
        console.log("Final transaction confirmed. Signature:", signature);

        setTransactionStatus({ type: 'success', message: `Token created successfully! Mint Address: ${mint.toString()}` });
      } catch (error) {
        console.error("Error sending final transaction:", error);
        setTransactionStatus({ type: 'error', message: `Failed to send final transaction: ${error.message}` });
      }
    } catch (error) {
      console.error("Unexpected error in token creation process:", error);
      setTransactionStatus({ type: 'error', message: `Failed to create token: ${error.message}` });
    }
  };

const toggleFAQ = (index) => {
  setOpenFAQ(prev => ({ ...prev, [index]: !prev[index] }));
};

useEffect(() => {
  if (transactionStatus && transactionStatus.type !== 'loading') {
    const timer = setTimeout(() => {
      setTransactionStatus(null);
    }, 5000);
    return () => clearTimeout(timer);
  }
}, [transactionStatus]);

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <h1 className="site-title">Solana SPL Token Creator</h1>
          <nav className="header-nav">
            <a href="/">Home</a>
            <a href="/incinerator">SPL Token Incinerator</a>
            <a href="/checklist">Token Launch Checklist</a>
            <ClientWalletMultiButton />
          </nav>
        </div>
      </header>
      <main className="main-content">
        <section className="hero">
          <h1>Solana SPL Token Creator</h1>
          <p>The perfect tool to create Solana SPL tokens.<br />Simple, user friendly, and fast.</p>
        </section>
        
        <div className="content-wrapper">
          <section className="form-section">
            <TokenForm 
              onSubmit={handleTokenCreation} 
              isWalletConnected={!!publicKey} 
              connectWallet={connect} 
            />
            <div className="revoke-mint-section">
              <RevokeMintAuthorityGUI 
                isWalletConnected={!!publicKey}
                connectWallet={connect}
              />
            </div>
          </section>
          
          <section className="info-section">
            <div className="info-section-content">
              <h2>Create Solana SPL Token</h2>
              <p>Effortlessly create your Solana SPL Token with our streamlined 7+1 step process – no coding required. Our user-friendly platform makes token creation accessible to everyone, from blockchain beginners to experienced developers.</p>
              <p>Customize your Solana SPL Token exactly the way you envision it. With our intuitive interface, you can bring your token to life in less than 5 minutes, all at an affordable cost. Perfect for community tokens, utility tokens, or the next big meme coin!</p>
              
              <h3>How to use Solana SPL Token Creator</h3>
              <ol>
                <li>Connect your Solana wallet (compatible with Phantom, Solflare, and more).</li>
                <li>Specify the desired name for your SPL Token - make it unique and memorable.</li>
                <li>Indicate the symbol (max 8 characters) - this will represent your token on exchanges and in wallets.</li>
                <li>Select the decimals quantity (0 for Whitelist Token, 5 for utility Token, 9 for meme token) based on your token's use case.</li>
                <li>Provide a brief description for your SPL Token - explain its purpose and value proposition.</li>
                <li>Upload the image for your token (PNG format) - give your token a visual identity.</li>
                <li>Determine the Supply of your SPL Token - consider your tokenomics carefully.</li>
                <li>Click on create, accept the transaction, and wait for your tokens to be ready - it's that simple!</li>
              </ol>
              
              <div className="info-box">
                <h4>Token Creation Cost</h4>
                <p>The cost of SPL Token creation is 0.25 SOL, covering all fees for SPL Token Creation on the Solana mainnet. This affordable price point makes it accessible for projects of all sizes to launch their own tokens.</p>
              </div>
              
              <div className="info-box">
                <h4>Revoke Freeze Authority</h4>
                <p>If you want to create a liquidity pool or ensure token transferability, you will need to "Revoke Freeze Authority" of the SPL Token. You can do that right here on our platform. The cost for this additional service is 0.05 SOL.</p>
              </div>
              
              <div className="info-box">
                <h4>Revoke Mint Authority</h4>
                <p>Revoking mint authority ensures that there can be no more tokens minted than the total supply you initially set. This provides security and peace of mind to your token holders and potential investors. The cost for revoking mint authority is 0.05 SOL.</p>
              </div>
            </div>
          </section>
        </div>

        <section className="full-width-section">
          <h3>Frequently Asked Questions</h3>
          <div className="faq-section">
            {FAQ.map((item, index) => (
              <div key={index} className="faq-item">
                <button className="faq-question" onClick={() => toggleFAQ(index)}>
                  {item.question}
                  <span className={`arrow ${openFAQ[index] ? 'open' : ''}`}>▼</span>
                </button>
                {openFAQ[index] && <p className="faq-answer" style={{ whiteSpace: 'pre-wrap' }}>{item.answer}</p>}
              </div>
            ))}
          </div>

          <h3>Solana SPL Token Creator</h3>
          <p>If you're seeking a convenient and effective method for generating SPL tokens on the Solana blockchain, our online Solana SPL Token Creator offers an ideal solution. Our platform is user-friendly and intuitive, enabling users to tailor and launch their tokens within minutes.</p>
          <p>Our Solana SPL Token Creator eliminates the need for expertise in blockchain technology; anyone can effortlessly create and manage their tokens. Additionally, we prioritize high security and privacy for our users. All transactions and token information benefit from protection through our on-chain smart contract, ensuring the security of your assets throughout and after the process.</p>
          <p>Our goal is to provide users with a seamless and efficient experience in crafting SPL tokens on the Solana blockchain. Through our online creator, you can personalize your tokens with unique logos, descriptions, and issuance details, making them distinct and reflective of your brand or project.</p>

          <h3>Why Create Solana SPL Tokens using Sol Token Tools</h3>
          <p>Whether you're a seasoned developer or just starting out, our Solana SPL Token Creator software is tailor-made for you. Experience the ease of quickly and securely generating tokens, saving valuable time and resources. What sets us apart is our unwavering commitment to exceptional support.</p>
          <p>Our dedicated team of experts is available 24/7 to address any inquiries or challenges you may encounter. Start your journey of creating and managing SPL tokens on Solana today with confidence, knowing that our reliable and secure online creator offers an unparalleled experience. You won't find a more user-friendly and efficient solution elsewhere!</p>

          <div className="support-box">
            <h4>Need support?</h4>
            <p>Contact us: support@soltokentools.io</p>
          </div>
        </section>
      </main>
      {transactionStatus && (
        <div className={`transaction-status ${transactionStatus.type} visible`}>
          {transactionStatus.message}
        </div>
      )}
      <footer className="footer">
        <p>&copy; 2024 Solana SPL Token Creator. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;