import ethers from "ethers";
import chalk from "chalk";
import fs from "fs";
import mysql from "mysql";
import http from "http";
import express from "express";

var config, constant, walletsABC;
var totalVolume = 0;

const app = express();
const httpServer = http.createServer(app);

// For is_change_price_floor

var price_before = 0;
var price_cur = 0;

// For Statistics
var mStatistics;
var volume_buy = 0;
var volume_sell = 0;
var startTime;

var period_run = 0;
var volume_perday = 0;

var commission_paid = 0;

var amnt_transactions = 0;
var amnt_pertransactions = 0;

var ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "supply", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "success", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "digits", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "success", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "_owner", type: "address" },
      { indexed: true, name: "_spender", type: "address" },
      { indexed: false, name: "_value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
];

console.log(chalk.yellow(`Market Making bot is being started . . . \n`));

console.log(chalk.green(`Loading Configuration . . . \n`));

try {
  config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  constant = JSON.parse(fs.readFileSync("./constant.json", "utf8"));
} catch (error) {
  console.error(error);
  exit();
}

console.log(config);

console.log(chalk.green(`\nLoading Constant . . . \n`));

console.log(constant);

var provider = new ethers.providers.JsonRpcProvider(config.provider);
const amountsOne = ethers.utils.parseUnits("1", "ether");
const ethWallet = new ethers.Wallet(
  "0x0000000000000000000000000000000000000000000000000000000000000001"
);
const account = ethWallet.connect(provider);
const router_global = new ethers.Contract(
  config.router,
  [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin,address[] calldata path,address to, uint deadline) external",
  ],
  account
);

var con = mysql.createConnection({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database,
});

function between(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function getNonce(addr) {
  const nonce = await provider.getTransactionCount(addr);
  return nonce;
}

async function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitTransaction(hash) {
  let receipt = null;
  while (receipt === null) {
    try {
      receipt = await provider.getTransactionReceipt(hash);
    } catch (e) {
      console.log(e);
    }
  }
}

async function getBalance(addr) {
  const balance = await provider.getBalance(addr);
  return balance;
}

function getAndPrintCurrentTime() {
  let date_ob = new Date();

  // current date
  // adjust 0 before single digit date
  let date = ("0" + date_ob.getDate()).slice(-2);

  // current month
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // current year
  let year = date_ob.getFullYear();

  // current hours
  let hours = date_ob.getHours();

  // current minutes
  let minutes = date_ob.getMinutes();

  // current seconds
  let seconds = date_ob.getSeconds();

  // prints date & time in YYYY-MM-DD HH:MM:SS format
  console.log(
    year +
      "-" +
      month +
      "-" +
      date +
      " " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds
  );
}

async function getTokenBalance(tokenAddress, address) {
  const abi = [
    {
      name: "balanceOf",
      type: "function",
      inputs: [
        {
          name: "_owner",
          type: "address",
        },
      ],
      outputs: [
        {
          name: "balance",
          type: "uint256",
        },
      ],
      constant: true,
      payable: false,
    },
  ];

  const contract = new ethers.Contract(tokenAddress, abi, provider);
  const balance = await contract.balanceOf(address);
  return balance;
}

async function sendToken(
  contract_address,
  send_token_amount,
  to_address,
  send_account,
  private_key
) {
  const send_abi = [
    {
      constant: false,
      inputs: [
        {
          name: "_to",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  let wallet = new ethers.Wallet(private_key);
  let walletSigner = wallet.connect(provider);

  if (contract_address) {
    // general token send
    let contract = new ethers.Contract(
      contract_address,
      send_abi,
      walletSigner
    );

    // How many tokens?
    let numberOfTokens = ethers.utils.parseUnits(send_token_amount, 18);
    // Send tokens
    const txTransfer = await contract
      .transfer(to_address, numberOfTokens)
      .catch((err) => {
        console.error(
          `${send_account} has not enough Balance for Token Transfer`
        );
        if (config.debug) console.error(error);
      });
    await waitTransaction(txTransfer.hash);
    amnt_transactions++;
  }
}

async function sendBNB(
  send_token_amount,
  to_address,
  send_account,
  private_key
) {
  try {
    console.log(
      `sending ${send_token_amount} BNB from ${send_account} to ${to_address}`
    );
    let wallet = new ethers.Wallet(private_key);
    let walletSigner = wallet.connect(provider);
    const tx = {
      to: to_address,
      value: ethers.utils.parseEther(send_token_amount),
    };
    const txTransfer = await walletSigner.sendTransaction(tx);
    await waitTransaction(txTransfer.hash);
    amnt_transactions++;
  } catch (err) {
    console.error(`${send_account} has not enough Balance for BNB Transfer`);
    if (config.debug) console.error(err);
  }
}

function getRandomArrayElements(arr, count) {
  var shuffled = arr.slice(0),
    i = arr.length,
    min = i - count,
    temp,
    index;
  while (i-- > min) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(min);
}

async function do_market_making(mode, accounts, volume, period, isPreparation) {
  let CurVolume = 0;
  let Running = true;
  while (CurVolume <= volume && Running) {
    await Promise.all(
      accounts.map(async (item) => {
        let wallet = new ethers.Wallet(item.private_key);
        let account = wallet.connect(provider);
        let router = new ethers.Contract(
          config.router,
          [
            "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
            "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
            "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
            "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
            "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
            "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
          ],
          account
        );

        let tokenIn = config.wbnb;
        let tokenOut = config.tokenAddress;

        let balance = await getBalance(wallet.address);
        if (
          ethers.BigNumber.from(balance) <
          constant.decimals * constant.minForTrade
        ) {
          console.log(
            `wallet${item.id} ${wallet.address} has not enough BNB (${
              ethers.BigNumber.from(balance) / constant.decimals
            })  for Trade...`
          );
          return;
        }

        let amountsIn =
          (between(Math.floor(config.noiseMin), Math.floor(config.noiseMax)) *
            ethers.BigNumber.from(balance)) /
          (100 * constant.decimals);

        amountsIn = Math.floor(amountsIn * 10000) / 10000;

        if (mode == "0") {
          // Buy, here buy means for preparation.

          let delay = between(0, 2000);

          if (isPreparation) {
            let count = Math.floor(config.Preparation / config.noiseMax);
            delay = between(0, Math.floor((period * 1000) / count));
          }

          await sleep(delay);

          const txBuy = await router
            .swapExactETHForTokens(
              0,
              [tokenIn, tokenOut],
              wallet.address,
              Date.now() + 1000 * 60 * 10, //10 minutes
              {
                gasLimit: constant.gasLimit,
                gasPrice: ethers.utils.parseUnits(
                  `${constant.gasPrice}`,
                  "gwei"
                ),
                value: ethers.utils.parseEther(amountsIn.toString()),
              }
            )
            .catch((err) => {
              console.error(
                `wallet${item.id} ${wallet.address} has not enough Balance for transaction in Buy`
              );
              if (config.debug) console.error(err);
              return;
            });

          await waitTransaction(txBuy.hash);

          CurVolume += amountsIn;
          totalVolume += amountsIn;
          volume_buy += amountsIn;
          amnt_transactions++;

          console.log("Total Volume : ", totalVolume);

          getAndPrintCurrentTime();
          console.log(
            chalk.blue(
              `wallet${item.id} ${
                wallet.address
              } has swapped ${amountsIn}BNB -> ${config.tokenName} waited for ${
                delay / 1000
              }s`
            )
          );

          // display time and balance of BNB, token.

          let curBalance = await getBalance(wallet.address);
          let curTokenBalance = await getTokenBalance(tokenOut, wallet.address);
          console.log(
            chalk.blue(
              `wallet${item.id} ${wallet.address} BNB: ${
                ethers.BigNumber.from(curBalance) / constant.decimals
              }, ${config.tokenName} : ${
                ethers.BigNumber.from(curTokenBalance) / constant.decimals
              }`
            )
          );
        } else if (mode == "1") {
          // Sell

          let tokenContract = new ethers.Contract(tokenOut, ERC20_ABI, account);
          let tokenBalance = await getTokenBalance(tokenOut, wallet.address);

          if (ethers.BigNumber.from(tokenBalance) > 100) {
            // set delay for the timeout paramter.
            let delay = between(0, period * 1000);
            await sleep(delay);

            let allowance = await tokenContract.allowance(
              wallet.address,
              config.router
            );
            if (allowance < ethers.constants.MaxUint256 / 100) {
              const txApprove = await tokenContract
                .approve(config.router, ethers.constants.MaxUint256, {
                  gasLimit: constant.gasLimit,
                  gasPrice: ethers.utils.parseUnits(
                    `${constant.gasPrice}`,
                    "gwei"
                  ),
                })
                .catch((err) => {
                  console.error(
                    `wallet${item.id} ${wallet.adress} has not enough Balance for transaction in Approve`
                  );
                  if (config.debug) console.error(err);
                  return;
                });

              await waitTransaction(txApprove.hash);
              amnt_transactions++;
              console.log(
                `wallet${item.id} ${wallet.address} has successfully approved ${config.tokenName}`
              );
            }

            const txSell = await router
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                tokenBalance,
                0,
                [tokenOut, tokenIn],
                wallet.address,
                Date.now() + 1000 * 60 * 10, //10 minutes
                {
                  gasLimit: constant.gasLimit,
                  gasPrice: ethers.utils.parseUnits(
                    `${constant.gasPrice}`,
                    "gwei"
                  ),
                }
              )
              .catch((err) => {
                console.error(
                  `wallet${item.id} ${wallet.address} has not enough Balance for transaction in Sell`
                );
                if (config.debug) console.error(err);
                return;
              });

            await waitTransaction(txSell.hash);

            getAndPrintCurrentTime();
            console.log(
              chalk.green(
                `wallet${item.id} ${wallet.address} has successfully swapped ${
                  tokenBalance / constant.decimals
                } ${config.tokenName}  to BNB`
              )
            );

            let curBalance = await getBalance(wallet.address);
            let curTokenBalance = await getTokenBalance(
              tokenOut,
              wallet.address
            );

            console.log(
              chalk.blue(
                `wallet${item.id} ${wallet.address} BNB: ${
                  ethers.BigNumber.from(curBalance) / constant.decimals
                }, ${config.tokenName} : ${
                  ethers.BigNumber.from(curTokenBalance) / constant.decimals
                }`
              )
            );

            CurVolume += amountsIn;
            totalVolume += amountsIn;
            volume_sell += amountsIn;
            amnt_transactions++;
          }
        } else if (mode == "3") {
          // Sell the tokens based on the price change.

          let tokenContract = new ethers.Contract(tokenOut, ERC20_ABI, account);
          let tokenBalance = await getTokenBalance(tokenOut, wallet.address);

          if (ethers.BigNumber.from(tokenBalance) > 100) {
            // set delay for the timeout paramter.
            let delay = between(0, period * 1000);
            await sleep(delay);

            let allowance = await tokenContract.allowance(
              wallet.address,
              config.router
            );
            if (allowance < ethers.constants.MaxUint256 / 100) {
              const txApprove = await tokenContract
                .approve(config.router, ethers.constants.MaxUint256, {
                  gasLimit: constant.gasLimit,
                  gasPrice: ethers.utils.parseUnits(
                    `${constant.gasPrice}`,
                    "gwei"
                  ),
                })
                .catch((err) => {
                  console.error(
                    `wallet${item.id} ${wallet.adress} has not enough Balance for transaction in Approve`
                  );
                  if (config.debug) console.error(err);
                  return;
                });

              await waitTransaction(txApprove.hash);
              amnt_transactions++;
              console.log(
                `wallet${item.id} ${wallet.address} has successfully approved ${config.tokenName}`
              );
            }

            let amntSell =
              ((config.sell_amount / 100) *
                ethers.BigNumber.from(tokenBalance)) /
              constant.decimals;

            const txSell = await router
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                ethers.utils.parseUnits(amntSell.toString(), "ether"),
                0,
                [tokenOut, tokenIn],
                wallet.address,
                Date.now() + 1000 * 60 * 10, //10 minutes
                {
                  gasLimit: constant.gasLimit,
                  gasPrice: ethers.utils.parseUnits(
                    `${constant.gasPrice}`,
                    "gwei"
                  ),
                }
              )
              .catch((err) => {
                console.error(
                  `wallet${item.id} ${wallet.address} has not enough Balance for transaction in Sell`
                );
                if (config.debug) console.error(err);
                return;
              });

            await waitTransaction(txSell.hash);

            getAndPrintCurrentTime();
            console.log(
              chalk.green(
                `wallet${item.id} ${wallet.address} has successfully swapped ${
                  tokenBalance / constant.decimals
                } ${config.tokenName}  to BNB`
              )
            );

            let curBalance = await getBalance(wallet.address);
            let curTokenBalance = await getTokenBalance(
              tokenOut,
              wallet.address
            );

            console.log(
              chalk.blue(
                `wallet${item.id} ${wallet.address} BNB: ${
                  ethers.BigNumber.from(curBalance) / constant.decimals
                }, ${config.tokenName} : ${
                  ethers.BigNumber.from(curTokenBalance) / constant.decimals
                }`
              )
            );

            CurVolume += amountsIn;
            totalVolume += amountsIn;
            volume_sell += amountsIn;
            amnt_transactions++;
          }
        } else if (mode == "4") {
          // Buy based on the change price

          let delay = between(0, period * 1000);

          await sleep(delay);

          amountsIn =
            (config.buy_amount * ethers.BigNumber.from(balance)) /
            (100 * constant.decimals);

          amountsIn = Math.floor(amountsIn * 10000) / 10000;

          const txBuy = await router
            .swapExactETHForTokens(
              0,
              [tokenIn, tokenOut],
              wallet.address,
              Date.now() + 1000 * 60 * 10, //10 minutes
              {
                gasLimit: constant.gasLimit,
                gasPrice: ethers.utils.parseUnits(
                  `${constant.gasPrice}`,
                  "gwei"
                ),
                value: ethers.utils.parseEther(amountsIn.toString()),
              }
            )
            .catch((err) => {
              console.error(
                `wallet${item.id} ${wallet.address} has not enough Balance for transaction in Buy`
              );
              if (config.debug) console.error(err);
              return;
            });

          await waitTransaction(txBuy.hash);

          CurVolume += amountsIn;
          totalVolume += amountsIn;
          volume_buy += amountsIn;
          amnt_transactions++;

          console.log("Total Volume : ", totalVolume);

          getAndPrintCurrentTime();
          console.log(
            chalk.blue(
              `wallet${item.id} ${
                wallet.address
              } has swapped ${amountsIn}BNB -> ${config.tokenName} waited for ${
                delay / 1000
              }s`
            )
          );

          // display time and balance of BNB, token.

          let curBalance = await getBalance(wallet.address);
          let curTokenBalance = await getTokenBalance(tokenOut, wallet.address);
          console.log(
            chalk.blue(
              `wallet${item.id} ${wallet.address} BNB: ${
                ethers.BigNumber.from(curBalance) / constant.decimals
              }, ${config.tokenName} : ${
                ethers.BigNumber.from(curTokenBalance) / constant.decimals
              }`
            )
          );
        } else if (mode == "2") {
          // Buy & Sell

          let amnt_one =
            ((config.noiseMax + config.noiseMin) / 200) * config.transAmounts;

          let timeout_perCycle =
            period / (config.Volume_goal / (accounts.length * amnt_one));

          let tokenContract = new ethers.Contract(tokenOut, ERC20_ABI, account);
          let tokenBalance = await getTokenBalance(tokenOut, wallet.address);
          let amntSell;
          let isBuyOrSell = false; // if true, account can sell.
          if (ethers.BigNumber.from(tokenBalance) > 100) {
            isBuyOrSell = between(0, 100) % 2 == 0 ? true : false;
            amntSell =
              ((between(config.noiseMin, config.noiseMax) / 100) *
                ethers.BigNumber.from(tokenBalance)) /
              constant.decimals;
          }
          // check if current BNB balance > amounts, if not, sell tokens first.
          if (balance < constant.decimals * amountsIn) {
            isBuyOrSell = true;
          }

          let delay = between(0, Math.floor(timeout_perCycle * 1000));
          await sleep(delay);

          if (isBuyOrSell) {
            // Calculate the exact volume based on the amntSell.
            let amountsArrBNB = await router_global.getAmountsOut(
              ethers.utils.parseUnits(amntSell.toString(), "ether"),
              [config.tokenAddress, config.wbnb]
            );

            let amountsBNB = amountsArrBNB[1] / constant.decimals;
            // Sell
            let allowance = await tokenContract.allowance(
              wallet.address,
              config.router
            );
            if (allowance < ethers.constants.MaxUint256 / 100) {
              const txApprove = await tokenContract
                .approve(config.router, ethers.constants.MaxUint256, {
                  gasLimit: constant.gasLimit,
                  gasPrice: ethers.utils.parseUnits(
                    `${constant.gasPrice}`,
                    "gwei"
                  ),
                })
                .catch((err) => {
                  console.error(
                    `wallet${item.id} ${wallet.adress} has not enough Balance for transaction in Approve`
                  );
                  if (config.debug) console.error(err);
                  return;
                });

              await waitTransaction(txApprove.hash);
              amnt_transactions++;
              console.log(
                `wallet${item.id} ${wallet.address} has successfully approved ${config.tokenName}`
              );
            }

            const txSell = await router
              .swapExactTokensForETHSupportingFeeOnTransferTokens(
                ethers.utils.parseUnits(amntSell.toString(), "ether"),
                0,
                [tokenOut, tokenIn],
                wallet.address,
                Date.now() + 1000 * 60 * 10, //10 minutes
                {
                  gasLimit: constant.gasLimit,
                  gasPrice: ethers.utils.parseUnits(
                    `${constant.gasPrice}`,
                    "gwei"
                  ),
                }
              )
              .catch((err) => {
                console.error(
                  `wallet${item.id} ${wallet.address} has not enough Balance for transaction in Sell`
                );
                if (config.debug) console.error(err);
                return;
              });

            await waitTransaction(txSell.hash);
            getAndPrintCurrentTime();
            console.log(
              chalk.green(
                `wallet${item.id} ${wallet.address} has successfully swapped ${amntSell} ${config.tokenName}  to BNB`
              )
            );

            let curBalance = await getBalance(wallet.address);
            let curTokenBalance = await getTokenBalance(
              tokenOut,
              wallet.address
            );
            console.log(
              chalk.blue(
                `wallet${item.id} ${wallet.address} BNB: ${
                  ethers.BigNumber.from(curBalance) / constant.decimals
                }, ${config.tokenName} : ${
                  ethers.BigNumber.from(curTokenBalance) / constant.decimals
                }`
              )
            );

            CurVolume += amountsBNB;
            totalVolume += amountsBNB;
            volume_sell += amountsBNB;
            amnt_transactions++;

            console.log("Total Volume : ", totalVolume);
          } else {
            // Buy

            const txBuy = await router
              .swapExactETHForTokens(
                0,
                [tokenIn, tokenOut],
                wallet.address,
                Date.now() + 1000 * 60 * 10, //10 minutes
                {
                  gasLimit: constant.gasLimit,
                  gasPrice: ethers.utils.parseUnits(
                    `${constant.gasPrice}`,
                    "gwei"
                  ),
                  value: ethers.utils.parseEther(amountsIn.toString()),
                }
              )
              .catch((err) => {
                console.error(
                  `wallet${item.id} ${wallet.adress} has not enough Balance for transaction in Buy`
                );
                if (config.debug) console.error(err);
                return;
              });

            await waitTransaction(txBuy.hash);

            getAndPrintCurrentTime();

            CurVolume += amountsIn;
            totalVolume += amountsIn;
            volume_buy += amountsIn;
            amnt_transactions++;

            console.log("Total Volume : ", totalVolume);
            console.log(
              chalk.blue(
                `wallet${item.id} ${
                  wallet.address
                } has swapped ${amountsIn}BNB -> ${
                  config.tokenName
                } waited for ${delay / 1000}s`
              )
            );

            let curBalance = await getBalance(wallet.address);
            let curTokenBalance = await getTokenBalance(
              tokenOut,
              wallet.address
            );
            console.log(
              chalk.blue(
                `wallet${item.id} ${wallet.address} BNB: ${
                  ethers.BigNumber.from(curBalance) / constant.decimals
                }, ${config.tokenName} : ${
                  ethers.BigNumber.from(curTokenBalance) / constant.decimals
                }`
              )
            );
          }
        }
      })
    );

    if (volume == 0) Running = false;
  }
}

const getPrice = async () => {
  let amountsOut = await router_global.getAmountsOut(amountsOne, [
    config.wbnb,
    config.tokenAddress,
  ]);
  let price = amountsOne / amountsOut[1];
  return price;
};

const run = async () => {
  startTime = new Date();

  if (config.isCreate) {
    //Create the Empty accounts...

    let wallets = [];
    for (let i = 0; i < config.numAccounts; i++) {
      const wallet = ethers.Wallet.createRandom();
      wallets.push([wallet.privateKey, wallet.address]);
    }

    console.log("Wallet creation is being started !");

    let sql = "INSERT INTO accounts (private_key, public_key) VALUES ?";
    let insertPromise = () => {
      return new Promise((resolve, reject) => {
        con.query(sql, [wallets], async function (err, result) {
          if (err) return reject(err);
          return resolve(result);
        });
      });
    };
    const result = await insertPromise();

    console.log("Number of wallets inserted: " + result.affectedRows);
  }

  if (config.isSend) {
    //Send funds from A,B,C to temp wallets...

    let sql =
      "SELECT * FROM accounts where 1=1 limit 0," + config.numTargetWallets;

    let transferPromise = () => {
      return new Promise((resolve, reject) => {
        con.query(sql, async function (err, result) {
          if (err) return reject(err);
          return resolve(result);
        });
      });
    };

    console.log(
      `\nStart Sending funds from treasury wallet to temp wallets...`
    );

    walletsABC = [];
    for (let i = 0; i < 3; i++) {
      const wallet = ethers.Wallet.createRandom();
      walletsABC.push({
        private_key: wallet.privateKey,
        public_key: wallet.address,
      });
    }

    let cycle = Math.floor(config.numTargetWallets / 3) + 1;
    let tAmnt = cycle * config.transAmounts * (1 + config.transfer_noise / 100);

    for (let i = 0; i < walletsABC.length; i++) {
      await sendBNB(
        tAmnt.toString(),
        walletsABC[i].public_key,
        config.treasuryWallet,
        config.treasuryKey
      );
    }

    const result = await transferPromise();

    console.log(`\nStart Sending funds to ${result.length} wallets ...`);

    let lenTargets = result.length;
    let lenFrom = walletsABC.length;
    let cycles = Math.floor(lenTargets / lenFrom) + 1;
    let oneBatch = [];
    for (let i = 0; i < cycles; i++) {
      if (i == cycles - 1) oneBatch = result.slice(i * lenFrom, lenTargets);
      else {
        oneBatch = result.slice(i * lenFrom, (i + 1) * lenFrom);
      }

      await Promise.all(
        oneBatch.map(async (item, index) => {
          // calculate the transfer amount based on the amounts and noise.
          let amnt;
          let amntNoise =
            (config.transAmounts * between(0, 100) * config.transfer_noise) /
            10000;
          let direction = between(1, 10) % 2 == 0 ? true : false;
          if (direction) {
            amnt = parseFloat(config.transAmounts) + parseFloat(amntNoise);
          } else {
            amnt = parseFloat(config.transAmounts) - parseFloat(amntNoise);
          }

          amnt = Math.floor(amnt * 1000) / 1000;

          await sendBNB(
            amnt.toString(),
            item.public_key,
            walletsABC[index].public_key,
            walletsABC[index].private_key
          );
        })
      );
      console.log(`${i + 1} Sending cycle is finished`);
    }

    // check if the temp wallets have rest BNB after transfer and send it to treasury wallet.

    await Promise.all(
      walletsABC.map(async (item, index) => {
        let balance = await getBalance(item.public_key);
        if (
          ethers.BigNumber.from(balance) >
          constant.decimals * constant.trasferFee
        ) {
          let balanceDecimal = balance / constant.decimals;
          let balWithoutFee = (
            Math.floor((balanceDecimal - constant.trasferFee) * 1000000) /
            1000000
          ).toString();

          await sendBNB(
            balWithoutFee.toString(),
            config.treasuryWallet,
            item.public_key,
            item.private_key
          );
        }
      })
    );

    console.log(`\nTransfer is finished\n`);
  }

  if (config.isMaketMaking) {
    /*
     *    "Nwallets"    : 10,    Numbers of wallets used by market making.
     *    "MinWallet"   : 5,    Min percentage of each wallet for one trade
     *    "MaxWallet"   : 10,   Max percentage of each wallet for one trade
     *    "Preparation" : 30,  Percentage of deposited BNB (buy action)
     *    "Volume_goal" : 2,  Total Volume
     *    "time_goal"   : 1   Period for volume goal (seconds)
     */

    // Load possible accounts (positive Balance )from the DB

    console.log(`\nStart Loading accounts from the DB for market making ...`);

    // in order to calculate the time for running.

    let sql = "SELECT * FROM accounts where 1=1 ORDER BY ID DESC";
    let loadPromise = () => {
      return new Promise((resolve, reject) => {
        con.query(sql, async function (err, result) {
          if (err) return reject(err);
          return resolve(result);
        });
      });
    };
    let possibleAccounts = [];
    const result = await loadPromise();
    await Promise.all(
      result.map(async (item, index) => {
        let balance = await getBalance(item.public_key);
        if (
          ethers.BigNumber.from(balance) >
          constant.decimals * constant.minForTrade
        ) {
          possibleAccounts.push(item);
        }
      })
    );

    let accountsTrade = [];
    if (possibleAccounts.length > config.Nwallets) {
      accountsTrade = getRandomArrayElements(possibleAccounts).slice(
        0,
        config.Nwallets
      );
    } else {
      console.log(
        `\nPossible acccounts are smaller than Nwallets(${config.Nwallets}). selecting all possible accounts(${possibleAccounts.length}) ... `
      );
      accountsTrade = possibleAccounts;
    }

    if (config.isPreparation) {
      /*
       *** Preparation ***
       *** Buy the token till volume reaches to the preparation amounts.
       */

      console.log(
        chalk.yellow(
          `Preparation ( use ${config.Preparation} % of deposited funds to buy tokens, ) is being started !`
        )
      );

      let goal_preparation =
        (config.transAmounts * config.Nwallets * config.Preparation) / 100;

      await do_market_making(
        0,
        accountsTrade,
        goal_preparation,
        config.preparation_time,
        true
      );

      console.log(
        chalk.yellow(`Preparation (${config.Preparation} %) is completed`)
      );
    }

    price_cur = await getPrice();
    price_before = price_cur;

    let isInfinite = true;
    while (isInfinite) {
      if (config.is_change_price_floor) {
        // According to the Price change, Buy & Sell.

        while (true) {
          price_cur = await getPrice();
          let priceHigh = price_before * (1 + config.buy_param / 100);
          let priceLow = price_before * (1 - config.buy_param / 100);
          if (price_cur > priceHigh) {
            await do_market_making(
              3,
              possibleAccounts,
              0,
              config.change_time_goal,
              false
            );
            price_before = await getPrice();
          } else if (price_cur < priceLow) {
            await do_market_making(
              4,
              possibleAccounts,
              0,
              config.change_time_goal,
              false
            );
            price_before = await getPrice();
          }
          await sleep(5000);
        }
      } else {
        // Random buy & Sell till Volume

        console.log(
          chalk.yellow(
            `\nMarket making  (Volume : ${config.Volume_goal} BNB ) is being started`
          )
        );

        await do_market_making(
          2,
          accountsTrade,
          config.Volume_goal,
          config.time_goal,
          false
        );
      }
      console.log(
        chalk.yellow(
          `\nMarket making  (Volume : ${config.Volume_goal} BNB ) is completed`
        )
      );
      if (config.run_again) isInfinite = true;
      else isInfinite = false;
    }
  }

  if (config.isTreasury) {
    await sendAllFunds();
  }

  if (config.isStatistics) {
    // For Statistics
    getAnalysis();
    console.log(
      chalk.green(
        `Volume traded so far buy: ${volume_buy}, sell: ${volume_sell}`
      )
    );
    console.log(chalk.green(`Volume per day : ${volume_perday}`));
    console.log(chalk.green(`Commission paid : ${commission_paid}`));
    console.log(chalk.green(`Number of transactions: ${amnt_transactions}`));
    console.log(
      chalk.green(`Transactions per wallet: ${amnt_pertransactions}`)
    );
  }
};

const sendAllFunds = async () => {
  // Send all funds from all trading wallets to one treasury wallet.
  console.log(
    chalk.yellow(
      "\nSend all funds from all trading wallets to one treasury wallet.\n"
    )
  );

  // Sell tokens in all accounts

  let sql = "SELECT * FROM accounts where 1=1";
  let loadPromise = () => {
    return new Promise((resolve, reject) => {
      con.query(sql, async function (err, result) {
        if (err) return reject(err);
        return resolve(result);
      });
    });
  };
  let possibleAccounts = [];
  const result = await loadPromise();
  await Promise.all(
    result.map(async (item, index) => {
      let balance = await getBalance(item.public_key);
      if (
        ethers.BigNumber.from(balance) >
        constant.decimals * constant.swapFee
      ) {
        possibleAccounts.push(item);
      }
    })
  );

  if (config.sell_coin_before_resend) {
    // Sell remained coins in all accounts.
    console.log(chalk.red("\n Sell remained tokens in all accounts . . ."));
    await do_market_making(1, possibleAccounts, 0, config.time_sellout, false);
    console.log(chalk.red("\n Remained tokens are successfully sold  . . ."));
  } else {
    console.log(
      chalk.red(
        "\n Send  remained tokens from  all accounts to treasury one . . ."
      )
    );

    await Promise.all(
      possibleAccounts.map(async (item, index) => {
        let balance = await getTokenBalance(
          config.tokenAddress,
          item.public_key
        );
        let balanceDecimal = balance / constant.decimals;
        await sendToken(
          config.tokenAddress,
          balanceDecimal.toString(),
          config.treasuryWallet,
          item.public_key,
          item.private_key
        );
      })
    );

    console.log(
      chalk.red(
        "\n Remained tokens are successfully sent to treasury one  . . ."
      )
    );
  }

  console.log(
    chalk.red(
      "\n Sending remained funds from all accounts to the treasury wallet . . .\n"
    )
  );

  await Promise.all(
    possibleAccounts.map(async (item, index) => {
      let balance = await getBalance(item.public_key);
      let balanceDecimal = balance / constant.decimals;
      let balWithoutFee = (
        Math.floor((balanceDecimal - constant.trasferFee) * 1000000) / 1000000
      ).toString();
      await sendBNB(
        balWithoutFee.toString(),
        config.treasuryWallet,
        item.public_key,
        item.private_key
      );
    })
  );

  console.log(chalk.red("\n Transfer is finished  . . .\n"));
};

const getAnalysis = () => {
  let stop = new Date();
  period_run = (stop - startTime) / 1000;
  commission_paid = (totalVolume * 0.3) / 100;
  amnt_pertransactions = amnt_transactions / config.Nwallets;
  volume_perday = (totalVolume * 3600 * 24) / period_run;
};

run();

app.get("/getAnalysis", function (req, res) {
  // For Statistics
  getAnalysis();
  res.status(201).json({
    period_run: period_run,
    volume_buy: volume_buy,
    volume_sell: volume_sell,
    volume_perday: volume_perday,
    commission_paid: commission_paid,
    amnt_transactions: amnt_transactions,
    amnt_pertransactions: amnt_pertransactions,
  });
});

app.get("/sendAllFunds", async function (req, res) {
  await sendAllFunds();
  res.status(201).json({
    msg: "success",
  });
});

const PORT = 5000;
httpServer.listen(PORT, console.log(chalk.yellow(`Listening for Analysis...`)));
