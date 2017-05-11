import web3 from "web3-wrapper";
import Stream from "mithril/stream";
import moment from "moment";
import m from "mithril";
import { address, abi } from "contract-details";

const contract = web3.eth.contract(abi).at(address);

class WorkflowEvent {
  static create(event, contract) {
    return new Promise((resolve, reject) => {
      web3.eth.getBlock(event.blockNumber, (error, block) => {
        if (error) reject(error);
        resolve({
          blockNumber: block.number,
          blockHash: block.hash,
          timestamp: moment.unix(block.timestamp),
          transactionHash: event.transactionHash,
        });
      });
    });
  }
}

class WorkflowCreationEvent extends WorkflowEvent {
  static create(event) {
    return super.create(event).then(result => new Promise((resolve, reject) => {
      result.type = "workflow-creation";
      result.senderAddress = event.args.creator;
      result.senderName = event.args.creator;
      result.workflowId = event.args.workflowId;
      result.workflowName = web3.toAscii(event.args.workflowName).trim();
      resolve(result);
    }));
  }
}

class ExecutionEvent extends WorkflowEvent {
  static create(event) {
    return super.create(event).then(result => new Promise((resolve, reject) => {
      contract.getWorkflowName(event.args.workflowId, (error, workflowName) => {
        if (error) reject(error);
        contract.getActivityName(event.args.activityId, (error, activityName) => {
          if (error) reject(error);
          result.type = "execution";
          result.senderAddress = event.args.executor;
          result.senderName = event.args.executor;
          result.workflowId = event.args.workflowId;
          result.workflowName = workflowName;
          result.activityId = event.args.activityId;
          result.activityName = activityName;
          resolve(result);
        });
      });
    }));
  }
}

class Activity {
  constructor(id, name, included, executed, pending) {
    this.is = id;
    this.name = name;
    this.included = included;
    this.executed = executed;
    this.pending = pending;
  }
}

class Relation {
  constructor(from, to, type) {
    this.from = from;
    this.to = to;
    this.type = type;
  }
}

// Converts a web3-style callback function to an ES6 promise
function promiseCall(fn) {
  return function () {
    return new Promise((resolve, reject) => {
      let args = Array.prototype.slice.call(arguments);
      args.push((error, result) => error ? reject(error) : resolve(result));
      fn.apply(null, args);
    });
  };
}

class WorkflowManager {
  constructor(workflowId) {
    this.workflowId = workflowId;

    this.blockNumber = Stream();
    this.transactionHash = Stream();
    this.creatorAddress = Stream();
    this.workflowName = Stream();
    this.events = Stream([]);
    this.activities = Stream([]);
    this.relations = this.activities.map(activities =>
      activities.map(activity => activity.relations).reduce((acc, relations) => acc.concat(relations), []));

    // Bind instance functions
    this.createEvent = this.createEvent.bind(this);

    // Convert all contract calls to ES6 promise calls
    this.getWorkflowName = promiseCall(contract.getWorkflowName).bind(null, this.workflowId);
    this.getGroupNames = promiseCall(contract.getGroupNames).bind(null, this.workflowId);
    this.getGroupsOfAccount = promiseCall(contract.getGroupsOfAccount).bind(null, this.workflowId);
    this.getActivityCount = promiseCall(contract.getActivityCount).bind(null, this.workflowId);
    this.getActivityName = promiseCall(contract.getActivityName).bind(null, this.workflowId);
    this.isIncluded = promiseCall(contract.isIncluded).bind(null, this.workflowId);
    this.isExecuted = promiseCall(contract.isExecuted).bind(null, this.workflowId);
    this.isPending = promiseCall(contract.isPending).bind(null, this.workflowId);
    this.getIncludes = promiseCall(contract.getIncludes).bind(null, this.workflowId);
    this.getExcludes = promiseCall(contract.getExcludes).bind(null, this.workflowId);
    this.getResponses = promiseCall(contract.getResponses).bind(null, this.workflowId);
    this.getConditions = promiseCall(contract.getConditions).bind(null, this.workflowId);
    this.getMilestones = promiseCall(contract.getMilestones).bind(null, this.workflowId);
    this.getGroupWhitelist = promiseCall(contract.getGroupWhitelist).bind(null, this.workflowId);
    this.getAccountWhitelist = promiseCall(contract.getAccountWhitelist).bind(null, this.workflowId);
    this.isAuthDisabled = promiseCall(contract.isAuthDisabled).bind(null, this.workflowId);
    this.canExecute = promiseCall(contract.canExecute).bind(null, this.workflowId);
    this.execute = promiseCall(contract.execute).bind(null, this.workflowId);
    
    // Fetch  workflow name, activities and relations
    this.block = contract.LogWorkflowCreation({
      workflowId: workflowId
    }, {
      fromBlock: 0
    }, (error, event) => {
      this.creatorAddress(event.args.creator);
      this.blockNumber(event.blockNumber);
      this.transactionHash(event.transactionHash);
    });

    this.getWorkflowName()
      .then(web3.toAscii)
      .then(String.trim)
      .then(this.workflowName);

    this.getActivityCount()
      .then(count => {
        let promises = [];
        for (let activityId = 0; activityId < count; activityId++) {
          this.activities()[activityId] = { relations: [] };
          promises.push(this.getActivityName(activityId).then(web3.toAscii).then(name => this.activities()[activityId].name = name));
          promises.push(this.isIncluded(activityId).then(isIncluded => this.activities()[activityId].isIncluded = isIncluded));
          promises.push(this.isExecuted(activityId).then(isExecuted => this.activities()[activityId].isExecuted = isExecuted));
          promises.push(this.isPending(activityId).then(isPending => this.activities()[activityId].isPending = isPending));
          promises.push(this.canExecute(activityId).then(canExecute => this.activities()[activityId].canExecute = canExecute));

          promises.push(this.getIncludes(activityId).then(includes => includes.forEach(to => this.activities()[activityId].relations.push(new Relation(activityId, to.toNumber(), "include")))));
          promises.push(this.getExcludes(activityId).then(excludes => excludes.forEach(to => this.activities()[activityId].relations.push(new Relation(activityId, to.toNumber(), "exclude")))));
          promises.push(this.getResponses(activityId).then(responses => responses.forEach(to => this.activities()[activityId].relations.push(new Relation(activityId, to.toNumber(), "response")))));
          promises.push(this.getConditions(activityId).then(conditions => conditions.forEach(from => this.activities()[activityId].relations.push(new Relation(from.toNumber(), activityId, "condition")))));
          promises.push(this.getMilestones(activityId).then(milestones => milestones.forEach(from => this.activities()[activityId].relations.push(new Relation(from.toNumber(), activityId, "milestone")))));
        }
        return Promise.all(promises);
      })
      .then(() => this.activities(this.activities()));

    // Fetch all events so far and subscribe to future events
    contract.allEvents({ fromBlock: 0 }, (error, event) => {
      this.createEvent(event).then(event => {
        let events = this.events();
        events.push(event);
        this.events(events);
        m.redraw();
      })
    });
  };

  createEvent(event) {
    switch (event.event) {
      case "LogWorkflowCreation":
        return WorkflowCreationEvent.create(event);
      case "LogExecution":
        return ExecutionEvent.create(event);
      default:
        console.error("Unknown event type", event.event);
    }
  }
}

WorkflowManager.createWorkflow = promiseCall(contract.createWorkflow);

export default WorkflowManager;
