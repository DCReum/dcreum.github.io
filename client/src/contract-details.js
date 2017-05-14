const address = "0x5A9726C2326F0cc5825Bd2C77f9017b1879f2b34";

const abi = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "workflowName",
        "type": "bytes32"
      },
      {
        "name": "activityNames",
        "type": "bytes32[]"
      },
      {
        "name": "includedStates",
        "type": "uint256"
      },
      {
        "name": "executedStates",
        "type": "uint256"
      },
      {
        "name": "pendingStates",
        "type": "uint256"
      },
      {
        "name": "includesTo",
        "type": "uint256[]"
      },
      {
        "name": "excludesTo",
        "type": "uint256[]"
      },
      {
        "name": "responsesTo",
        "type": "uint256[]"
      },
      {
        "name": "conditionsFrom",
        "type": "uint256[]"
      },
      {
        "name": "milestonesFrom",
        "type": "uint256[]"
      },
      {
        "name": "authDisabled",
        "type": "uint256"
      },
      {
        "name": "authAccounts",
        "type": "address[]"
      },
      {
        "name": "authWhitelist",
        "type": "uint256[]"
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
    "inputs": [],
    "name": "getWorkflowCount",
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
