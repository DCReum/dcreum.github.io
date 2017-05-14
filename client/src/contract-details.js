const address = "0x513f9A8f6D84246B48C494297b40aDd088c1fEbc";

const abi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getMilestones",
    "outputs": [
      {
        "name": "",
        "type": "uint8[]"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "canExecute",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getResponses",
    "outputs": [
      {
        "name": "",
        "type": "uint8[]"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "execute",
    "outputs": [],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getExcludes",
    "outputs": [
      {
        "name": "",
        "type": "uint8[]"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "isIncluded",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      }
    ],
    "name": "getWorkflowName",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "names",
        "type": "bytes32[]"
      },
      {
        "name": "activityStates",
        "type": "bool[3][]"
      },
      {
        "name": "activityData",
        "type": "uint32[2][]"
      },
      {
        "name": "relationTypes",
        "type": "uint8[]"
      },
      {
        "name": "relationActivityIds",
        "type": "uint32[]"
      },
      {
        "name": "authAccounts",
        "type": "address[]"
      },
      {
        "name": "authDisabled",
        "type": "bool[]"
      }
    ],
    "name": "createWorkflow",
    "outputs": [],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "isPending",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getAccountWhitelist",
    "outputs": [
      {
        "name": "",
        "type": "address[]"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getActivityName",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getIncludes",
    "outputs": [
      {
        "name": "",
        "type": "uint8[]"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      }
    ],
    "name": "getActivityCount",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "isExecuted",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "isAuthDisabled",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getConditions",
    "outputs": [
      {
        "name": "",
        "type": "uint8[]"
      }
    ],
    "payable": false,
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "workflowName",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "LogWorkflowCreation",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "workflowId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "activityId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "executor",
        "type": "address"
      }
    ],
    "name": "LogExecution",
    "type": "event"
  }
];

export { address, abi }
