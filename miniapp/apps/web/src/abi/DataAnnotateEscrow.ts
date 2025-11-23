export const DATA_ANNOTATE_ESCROW_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "usdcToken", type: "address", internalType: "contract IERC20" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "USDC",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IERC20" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "closeDataset",
    inputs: [{ name: "datasetId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createDataset",
    inputs: [
      { name: "budget", type: "uint256", internalType: "uint256" },
      { name: "curator", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "datasetId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "datasets",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "funder", type: "address", internalType: "address" },
      { name: "curator", type: "address", internalType: "address" },
      { name: "remainingBudget", type: "uint256", internalType: "uint256" },
      { name: "active", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "distribute",
    inputs: [
      { name: "datasetId", type: "uint256", internalType: "uint256" },
      { name: "user", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nextDatasetId",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "topUpDataset",
    inputs: [
      { name: "datasetId", type: "uint256", internalType: "uint256" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "DatasetClosed",
    inputs: [
      {
        name: "datasetId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "refunded",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DatasetCreated",
    inputs: [
      {
        name: "datasetId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "curator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "budget",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Distributed",
    inputs: [
      {
        name: "datasetId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
];
