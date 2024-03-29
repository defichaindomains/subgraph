// Import types and APIs from graph-ts
import { ByteArray, crypto, ens } from "@graphprotocol/graph-ts";

import {
  createEventID,
  ROOT_NODE,
  EMPTY_ADDRESS,
  uint256ToByteArray,
  byteArrayFromHex,
  concat,
} from "./utils";

// Import event types from the registry contract ABI
import {
  NameRegistered as NameRegisteredEvent,
  Transfer as TransferEvent,
} from "../generated/BaseRegistrar/BaseRegistrar";

import { NameRegistered as ControllerNameRegisteredEvent } from "../generated/ETHRegistrarController/ETHRegistrarController";

// Import entity types generated from the GraphQL schema
import {
  Account,
  Domain,
  Registration,
  NameRegistered,
  NameTransferred,
} from "../generated/schema";

var rootNode: ByteArray = byteArrayFromHex(
  "456b2fc8f8d0e69c7692da4ac45c1337cd08999944aa5aa106b9863c31799ef3"
);

export function handleNameRegistered(event: NameRegisteredEvent): void {
  let account = new Account(event.params.owner.toHex());
  account.save();

  let label = uint256ToByteArray(event.params.id);
  let registration = new Registration(label.toHex());
  registration.domain = crypto.keccak256(concat(rootNode, label)).toHex();
  registration.registrationDate = event.block.timestamp;
  registration.registrant = account.id;

  let labelName = ens.nameByHash(label.toHexString());
  if (labelName != null) {
    registration.labelName = labelName;
  }
  registration.save();

  let registrationEvent = new NameRegistered(createEventID(event));
  registrationEvent.registration = registration.id;
  registrationEvent.blockNumber = event.block.number.toI32();
  registrationEvent.transactionID = event.transaction.hash;
  registrationEvent.registrant = account.id;
  registrationEvent.save();
}

export function handleNameRegisteredByController(
  event: ControllerNameRegisteredEvent
): void {
  let domain = new Domain(
    crypto.keccak256(concat(rootNode, event.params.label)).toHex()
  );
  if (domain.labelName !== event.params.name) {
    domain.labelName = event.params.name;
    domain.name = event.params.name + ".forever";
    domain.save();
  }

  let registration = Registration.load(event.params.label.toHex());
  if (registration == null) return;
  registration.labelName = event.params.name;
  registration.cost = event.params.cost;
  registration.save();
}

export function handleNameTransferred(event: TransferEvent): void {
  let account = new Account(event.params.to.toHex());
  account.save();

  let label = uint256ToByteArray(event.params.tokenId);
  let registration = Registration.load(label.toHex());
  if (registration == null) return;

  registration.registrant = account.id;
  registration.save();

  let transferEvent = new NameTransferred(createEventID(event));
  transferEvent.registration = label.toHex();
  transferEvent.blockNumber = event.block.number.toI32();
  transferEvent.transactionID = event.transaction.hash;
  transferEvent.newOwner = account.id;
  transferEvent.save();
}
