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
  
        const tokens = tokenAccounts.value.map((tokenAccount) => {
          const mint = tokenAccount.account.data.parsed.info.mint;
          const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
          return {
            address: tokenAccount.pubkey.toString(),
            mint,
            name: `Token ${mint.substring(0, 4)}`, // Placeholder name
            amount: tokenAmount,
          };
        });
  
        setUserTokens(tokens);
      } catch (error) {
        console.error('Error fetching user tokens:', error);
      }
    };
  
    useEffect(() => {
      if (isWalletConnected) {
        fetchUserTokens();
      }
    }, [isWalletConnected]);
  
    const handleRevokeMint = async () => {
      if (!selectedToken) {
        alert('Please select a token first');
        return;
      }
  
      try {
        const mintPublicKey = new PublicKey(selectedToken);
        const transaction = new Transaction().add(
          Token.createSetAuthorityInstruction(
            TOKEN_PROGRAM_ID,
            mintPublicKey,
            null,
            'MintTokens',
            publicKey,
            []
          )
        );
  
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');
  
        alert(`Mint authority revoked for ${selectedToken}`);
      } catch (error) {
        console.error('Error revoking mint authority:', error);
        alert('Failed to revoke mint authority');
      }
    };
  
    return (
      <div className="revoke-mint-gui">
        <h2>Revoke Mint Authority</h2>
        <p>Revoking mint authority ensures that there can be no more tokens minted than the total supply. This provides security and peace of mind to buyers. The cost is 0.05 SOL</p>
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
    const { publicKey, sendTransaction, connect, signTransaction } = useWallet();
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
  
      try {
        setTransactionStatus({ type: 'loading', message: 'Preparing transaction...' });
  
        // Calculate the total cost
        const totalCost = 0.25 + (revokeFreeze ? 0.05 : 0) + (revokeMint ? 0.05 : 0);
  
        // Check balance to ensure user has enough funds
        const balance = await connection.getBalance(publicKey);
        const requiredLamports = (totalCost * LAMPORTS_PER_SOL) + (0.002 * LAMPORTS_PER_SOL); // Rough estimate of transaction fees
        if (balance < requiredLamports) {
          setTransactionStatus({ type: 'error', message: `Insufficient funds. You need at least ${totalCost} SOL, but you only have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL.` });
          return;
        }
  
        // Upload image to IPFS
        const imageUrl = await uploadToIPFS(image);
        console.log("Image uploaded to IPFS:", imageUrl);
  
        // Create metadata object
        const metadata = {
          name,
          symbol,
          decimals,
          supply,
          image: imageUrl,
          description,
          website,
          twitter,
          telegram,
          discord,
          creators: [{
            name: 'SOL TOKEN TOOLS',
            site: 'https://www.soltokentools.io'
          }]
        };
  
        // Upload metadata to IPFS
        const metadataUrl = await uploadMetadataToIPFS(metadata);
        console.log("Metadata uploaded to IPFS:", metadataUrl);
  
        // Create a new mint account for the token
        console.log("Creating mint...");
        let mint;
        try {
          mint = await createMint(
            connection,
            publicKey,
            publicKey,
            null,
            decimals,
            TOKEN_PROGRAM_ID
          );
          console.log("Mint created successfully:", mint.toBase58());
        } catch (error) {
          console.error("Error creating mint:", error);
          throw new Error("Mint creation failed");
        }
  
        if (!mint) {
          throw new Error("Mint is undefined after creation attempt");
        }
  
        // Get the associated token account
        console.log("Creating associated token account...");
        let associatedTokenAccount;
        try {
          associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            publicKey,
            mint,
            publicKey
          );
          console.log("Associated token account created:", associatedTokenAccount.address.toBase58());
        } catch (error) {
          console.error("Error creating associated token account:", error);
          throw new Error("Associated token account creation failed");
        }
  
        // Create a new transaction
        const transaction = new Transaction();
  
        // Add the minting instruction to the transaction
        transaction.add(
          Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mint,
            associatedTokenAccount.address,
            publicKey,
            [],
            supply
          )
        );
  
        // Add the final instruction to transfer SOL to your specified public key
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: RECEIVER_PUBLIC_KEY,
            lamports: RECEIVER_AMOUNT,
          })
        );
  
        console.log("Transaction created:", transaction);
  
        // Sign the transaction
        const signedTransaction = await signTransaction(transaction);
        console.log("Transaction signed:", signedTransaction);
  
        // Send the transaction
        setTransactionStatus({ type: 'loading', message: 'Sending transaction...' });
        const signature = await sendTransaction(signedTransaction, connection);
  
        setTransactionStatus({ type: 'loading', message: 'Confirming transaction...' });
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
  
        setTransactionStatus({ type: 'success', message: `Token created! Mint Address: ${mint.toBase58()}` });
      } catch (error) {
        console.error('Error creating token:', error);
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message || JSON.stringify(error);
        setTransactionStatus({ type: 'error', message: `Token creation failed: ${errorMessage}` });
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
          <p>&copy; 2023 Solana SPL Token Creator. All rights reserved.</p>
        </footer>
      </div>
    );
  };