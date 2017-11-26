import { deflate, inflate } from 'pako';
import { INVARIANT_UNREACHABLE_CODE } from '../errors';
import { Message } from './message';
import { Pointer, List, Struct, StructCtor } from './pointers';
import { Uint64 } from '../types/uint64';
import { Segment } from './segment';
import { base64ToBuffer, bufferToBase64 } from '../util';
import * as initTrace from 'debug';

const trace = initTrace('capnp:schema');

export interface _Value {
  getText(): string;
  getStruct(): Pointer;
  getData(): Pointer;
  getList(): Pointer;
  getAnyPointer(): Pointer;
  which(): number;
}

export interface _NestedNode {
  getId(): Uint64;
}

export interface _Node extends _NestedNode {
  getNestedNodes(): List<_NestedNode>;
  getStruct(): {
    getFields(): {
      get(index: number): {
        getSlot(): {
          getDefaultValue(): _Value;
        };
      };
    };
  };
}

export interface _CodeGeneratorRequest extends Struct {
  getNodes(): List<_Node>;
}

export const SchemaMap: { [id: string]: _CodeGeneratorRequest } = {};

export function dumpSchema(req: _CodeGeneratorRequest, chunkSize = 112): string[] {

  const packedMessage = deflate(new Uint8Array(req.segment.message.toPackedArrayBuffer()));
  const b64Message = bufferToBase64(packedMessage);
  const chunks: string[] = [];

  for (let i = 0; i < b64Message.length; i += chunkSize) chunks.push(b64Message.substr(i, chunkSize));

  return chunks;

}

export function findNode(req: _CodeGeneratorRequest, id: Uint64) {

  const node = req.getNodes().find((n) => n.getId().equals(id));

  if (!node) throw new Error(INVARIANT_UNREACHABLE_CODE);

  return node;

}

export function getPointerDefault(id: string, fieldIndex: number): Pointer {

  const p = getDefaultValue(id, fieldIndex);

  switch (p.which()) {

    case 18:  // Value_Which.ANY_POINTER

      return p.getAnyPointer();

    case 13: // Value_Which.DATA

      return p.getData();

    case 14: // Value_Which.LIST

      return p.getList();

    case 16: // Value_Which.STRUCT

      return p.getStruct();

    default:

      throw new Error(INVARIANT_UNREACHABLE_CODE);

  }

}

export function getTextDefault(id: string, fieldIndex: number): string {

  return getDefaultValue(id, fieldIndex).getText();

}

export function getDefaultValue(id: string, fieldIndex: number): _Value {

  if (!SchemaMap[id]) throw new Error(INVARIANT_UNREACHABLE_CODE);

  const f = findNode(SchemaMap[id], Uint64.fromHexString(id));

  return f.getStruct().getFields().get(fieldIndex).getSlot().getDefaultValue();

}

export function registerSchema(
  MessageRoot: StructCtor<_CodeGeneratorRequest>, fileId: string, rawSchema: string[],
): void {

  const compressed = base64ToBuffer(rawSchema.join(''));
  let req: _CodeGeneratorRequest;

  try {

    req = new Message(inflate(compressed)).getRoot(MessageRoot);

  } catch (err) {

    trace('failed to register schema for %s; default values will not work!', fileId);
    trace(err);
    console.log('failed to register schema for %s; default values will not work!', fileId);
    console.log(err);

    return;

  }

  const fileNode = findNode(req, Uint64.fromHexString(fileId));

  SchemaMap[fileId] = req;

  fileNode.getNestedNodes().forEach((n) => {

    SchemaMap[n.getId().toHexString()] = req;

  });

}
