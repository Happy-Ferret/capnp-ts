import { ListCtor, List } from './list';
import { Message, getSegment } from '../message';
import { setListPointer, setStructPointer } from './pointer';
import { StructCtor, Struct } from './struct';

export function makeConstList<T>(ListClass: ListCtor<T>, data: ArrayBufferView, length: number): List<T> {

  const s = getSegment(0, new Message(data, false, true));
  const list = new ListClass(s, 0);

  setListPointer(0, ListClass._capnp.size, length, list, ListClass._capnp.compositeSize);

  return list;

}

export function makeConstStruct<T extends Struct>(StructClass: StructCtor<T>, data: ArrayBufferView): T {

  const s = getSegment(0, new Message(data, false, true));
  const struct = new StructClass(s, 0);

  setStructPointer(0, StructClass._capnp.size, struct);

  return struct;

}
