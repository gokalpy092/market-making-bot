{
  "provider" : "https://kovan.infura.io/v3/8827667c483640e699955a604e6280e4",               # Provider that will be used
  "provider_bsc": "https://bsc-dataseed.binance.org",                                       # Copy this if you want to use bsc
  "provider_poly" : "https://polygon-rpc.com",                                              # Copy this if you want to use polygon
  "provider_ropsten" : "https://ropsten.infura.io/v3/8827667c483640e699955a604e6280e4",     # Copy this if you want to use ropsten
  "provider_kovan" : "https://kovan.infura.io/v3/8827667c483640e699955a604e6280e4",         # Copy this if you want to use kovan
  
  "router": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",                                   # Router that will be used
  "ApeRouter" : "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",                               # Copy this if you want to use apeswap 
  "UniswapRouter" : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",                           # Copy this if you want to use uniswap (both testing and real)
  "PancakeRouter" : "0x10ED43C718714eb63d5aA57B78B54704E256024E",                           # Copy this if you want to use pancake
  
  "tokenName" : "Weenus",                                                                   # Token name
  "tokenAddress" : "0xaFF4481D10270F50f203E0763e2597776068CBc5",                            # Address del token 
 
  "wbnb" : "0xd0A1E359811322d97991E03f863a0C30C2cF029C",                                    # Address currency used in the pair [will ask if works also with BUSD]
  "wbnb_ropsten": "0xc778417E063141139Fce010982780140Aa0cD5Ab",                             # Copy this if you're on ETH
  "wbnb_bsc": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",                                 # Copy this if you're on BSC
  
					# You need to create this database before working (check readme.md)
  "host" : "localhost",                              
  "user" : "root",
  "password" : "",
  "database" : "marketmaking",

  "debug" : false, 			# Debug. Yes or no?
  "run_again" : true,                   # If MM complete volume, it won't send tokens to wallet and will continue to make volume from 0 [ask if this works even with send_fund = true]

  "isCreate" : false,                   # If true = create wallets. If false: use the wallets in list. [Ask if uses the newly created wallets or the first ones]                
  "numAccounts" : 10,                   # Number of wallets created

  "isSend" : true,                      # Sends from the 3 configABC_wallets mother token (bnb,eth) to the newly created wallets
  "numTargetWallets" :"3",              # Number of accounts that will receive funds
  "transAmounts" : "0.3",               # Amount of transfer
  "transfer_noise" : 10,                # Noise for each amount: if transf amount = 1 and noise = 10%, transferred will be in range 0.9/1.1

  "isMaketMaking" : true,               # [ask what is this?]
  
  "Nwallets" : 3,                       # Number of wallets that concretely do market making
  
  "noiseMin" : 5,                       # Min Amount that will be sold/bought for each wallet in percentage
  "noiseMax" : 10,                      # Max Amount that will be sold/bought for each wallet in percentage
  
					# Preparation is market-making only buy, with the exact same logic of the market making
  "isPreparation" : true,               # Does the preparation period
  "Preparation" : 20,                   # Percent of amount sent to all wallets that will be bought in preparation
  "preparation_time" : 2,               # Goal in seconds for the preparation

  "Volume_goal" : 0.3,                  # Market making volume goal
  "time_goal" : 2,                      # Goal in seconds for market making

					# Parameters that concern only bot with change_price=on. See file for market making bot named agreement_mm
  "is_change_price_floor" : false,      # Activate this kind of bot
  "buy_amount" : 10,                    # Amount in percentage that will be bought when price is triggered
  "sell_amount" : 10,			# Amount in percentage that will be sold when price is triggered
  "buy_param" : 10,			# Percentage of price change (down) to start buy
  "sell_param" : 10,                    # Percentage of price change (up) to start sell
  "sell_tolerance" :5,                  # Imagine this parameter as 5%. If price = 1, and goes to 1.1, you start selling. Continue selling until it goes to 1.05. If below 1.05, stop selling and keep as middle price 1.05
  "buy_tolerance" :5,			# Same as sell_tolerance, other side
  
  "isTreasury" : true,                                               # At the end, send all tokens to trasury wallet
  "treasuryWallet" : "0x337665B2e23f9eE9886159dbEC5B51251C5c4b4e",   # Treasure wallet
  "sell_coin_before_resend" : true,                                  # Sell the tokens (in this case, venus) before sending
  "time_sellout" : 1,                     			     # Goal in seconds for selling

  "isStatistics" : true                # Activate statistics in port: http://localhost:5000/getAnalysis

Other stuff to know:
- Use http://localhost:5000/sendallfunds to send all funds to treasury account 

}
