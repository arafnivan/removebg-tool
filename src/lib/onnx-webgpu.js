/**
 * Rewrites an ONNX model so it runs on ONNX Runtime's WebGPU backend.
 *
 *  - WebGPU caps the storage buffers one compute shader may bind
 *    (maxStorageBuffersPerShaderStage: 8 by default, 10–16 on many GPUs), and
 *    the backend binds every tensor input and output of a node as one buffer.
 *    BiRefNet has Concats with up to 1024 inputs and Splits with 32 outputs,
 *    which fail on those GPUs. They become trees of smaller nodes along the
 *    same axis.
 *  - The backend has no Sum kernel, so Sum ran on the CPU (WASM), where
 *    BiRefNet's large deformable-conv tensors exhaust the 4 GB memory. Sum
 *    becomes a chain of Adds.
 *
 * Every rewrite computes exactly the same result.
 *
 * Only the protobuf wire format is touched: ModelProto.graph (field 7) and
 * GraphProto.node (field 1). Everything else is copied byte for byte.
 */

const MODEL_GRAPH = 7;
const GRAPH_NODE = 1;
const NODE_INPUT = 1;
const NODE_OUTPUT = 2;
const NODE_NAME = 3;
const NODE_OP_TYPE = 4;
const NODE_ATTRIBUTE = 5;
const NODE_DOMAIN = 7;
const ATTR_NAME = 1;
const ATTR_TENSOR = 5;
const ATTR_TYPE = 20;
const ATTR_TYPE_TENSOR = 4;
const TENSOR_DIMS = 1;
const TENSOR_DATA_TYPE = 2;
const TENSOR_INT64_DATA = 7;
const TENSOR_RAW_DATA = 9;
const INT64 = 7;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function readVarint(buf, pos) {
  let value = 0;
  let scale = 1;
  for (;;) {
    const byte = buf[pos++];
    value += (byte & 0x7f) * scale;
    if (byte < 0x80) return [value, pos];
    scale *= 128;
  }
}

function varint(value) {
  const out = [];
  while (value >= 0x80) {
    out.push((value % 128) | 0x80);
    value = Math.floor(value / 128);
  }
  out.push(value);
  return Uint8Array.from(out);
}

/** Every field of the message in buf[start, end). */
function fields(buf, start, end) {
  const out = [];
  let pos = start;
  while (pos < end) {
    const begin = pos;
    let key;
    [key, pos] = readVarint(buf, pos);
    const field = Math.floor(key / 8);
    const wire = key % 8;
    let valueStart = pos;
    if (wire === 0) [, pos] = readVarint(buf, pos);
    else if (wire === 1) pos += 8;
    else if (wire === 5) pos += 4;
    else if (wire === 2) {
      let length;
      [length, valueStart] = readVarint(buf, pos);
      pos = valueStart + length;
    } else throw new Error(`Unsupported protobuf wire type ${wire}`);
    out.push({ field, wire, begin, valueStart, end: pos });
  }
  return out;
}

function lengthField(field, parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  return [varint(field * 8 + 2), varint(size)].concat(parts);
}

/** Append without spreading: graphs have too many parts for one call's arguments. */
function pushAll(target, items) {
  for (const item of items) target.push(item);
}

const varintField = (field, value) => [varint(field * 8), varint(value)];
const stringField = (field, text) => lengthField(field, [encoder.encode(text)]);
const text = (buf, f) => decoder.decode(buf.subarray(f.valueStart, f.end));

function readNode(buf, start, end) {
  const node = { inputs: [], outputs: [], name: "", opType: "", domain: "", attributes: [] };
  for (const f of fields(buf, start, end)) {
    if (f.field === NODE_INPUT) node.inputs.push(text(buf, f));
    else if (f.field === NODE_OUTPUT) node.outputs.push(text(buf, f));
    else if (f.field === NODE_NAME) node.name = text(buf, f);
    else if (f.field === NODE_OP_TYPE) node.opType = text(buf, f);
    else if (f.field === NODE_DOMAIN) node.domain = text(buf, f);
    else if (f.field === NODE_ATTRIBUTE) node.attributes.push(f);
  }
  return node;
}

/** The int64 values of a Constant node's `value` tensor, or null. */
function constantInt64s(buf, node) {
  for (const a of node.attributes) {
    const attr = fields(buf, a.valueStart, a.end);
    const name = attr.find((f) => f.field === ATTR_NAME);
    const tensor = attr.find((f) => f.field === ATTR_TENSOR);
    if (!name || !tensor || text(buf, name) !== "value") continue;
    const tf = fields(buf, tensor.valueStart, tensor.end);
    const type = tf.find((f) => f.field === TENSOR_DATA_TYPE);
    if (!type || readVarint(buf, type.valueStart)[0] !== INT64) return null;
    const raw = tf.find((f) => f.field === TENSOR_RAW_DATA);
    if (raw) {
      const view = new DataView(buf.buffer, buf.byteOffset + raw.valueStart, raw.end - raw.valueStart);
      return Array.from({ length: view.byteLength / 8 }, (_, i) => Number(view.getBigInt64(i * 8, true)));
    }
    const values = [];
    for (const f of tf.filter((x) => x.field === TENSOR_INT64_DATA)) {
      // Packed (wire 2) or one varint per field (wire 0); only non-negative sizes matter here.
      if (f.wire === 0) values.push(readVarint(buf, f.valueStart)[0]);
      else for (let p = f.valueStart; p < f.end; ) {
        let v;
        [v, p] = readVarint(buf, p);
        values.push(v);
      }
    }
    return values;
  }
  return null;
}

function nodeField({ name, opType, inputs = [], outputs, attributes = [] }) {
  return lengthField(GRAPH_NODE, [
    ...inputs.flatMap((input) => stringField(NODE_INPUT, input)),
    ...outputs.flatMap((output) => stringField(NODE_OUTPUT, output)),
    ...stringField(NODE_NAME, name),
    ...stringField(NODE_OP_TYPE, opType),
    ...attributes,
  ]);
}

function int64ConstantNode(name, output, values) {
  const raw = new Uint8Array(values.length * 8);
  const view = new DataView(raw.buffer);
  values.forEach((v, i) => view.setBigInt64(i * 8, BigInt(v), true));
  const tensor = lengthField(ATTR_TENSOR, [
    ...varintField(TENSOR_DIMS, values.length),
    ...varintField(TENSOR_DATA_TYPE, INT64),
    ...lengthField(TENSOR_RAW_DATA, [raw]),
  ]);
  const attribute = lengthField(NODE_ATTRIBUTE, [
    ...stringField(ATTR_NAME, "value"),
    ...tensor,
    ...varintField(ATTR_TYPE, ATTR_TYPE_TENSOR),
  ]);
  return nodeField({ name, opType: "Constant", outputs: [output], attributes: attribute });
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** A tree of Concats with at most `max` inputs each. */
function splitConcat(node, attributes, max) {
  const parts = [];
  let level = node.inputs;
  for (let depth = 0; level.length > max; depth++) {
    level = chunk(level, max).map((group, i) => {
      if (group.length === 1) return group[0];
      const id = `${node.name}__concat${depth}_${i}`;
      pushAll(parts, nodeField({ name: id, opType: "Concat", inputs: group, outputs: [id], attributes }));
      return id;
    });
  }
  pushAll(parts, nodeField({ name: node.name, opType: "Concat", inputs: level, outputs: node.outputs, attributes }));
  return parts;
}

/** A tree of Splits with at most `max` outputs each. */
function splitSplit(input, outputs, sizes, attributes, max, id) {
  const parts = [];
  if (outputs.length <= max) {
    pushAll(parts, int64ConstantNode(`${id}__sizes`, `${id}__sizes`, sizes));
    pushAll(parts, nodeField({ name: id, opType: "Split", inputs: [input, `${id}__sizes`], outputs, attributes }));
    return parts;
  }
  const groups = chunk(outputs.map((output, i) => ({ output, size: sizes[i] })), max);
  const groupOutputs = groups.map((g, i) => (g.length === 1 ? g[0].output : `${id}__part${i}`));
  const groupSizes = groups.map((g) => g.reduce((sum, m) => sum + m.size, 0));
  pushAll(parts, splitSplit(input, groupOutputs, groupSizes, attributes, max, `${id}__top`));
  groups.forEach((g, i) => {
    if (g.length === 1) return;
    pushAll(parts, splitSplit(groupOutputs[i], g.map((m) => m.output), g.map((m) => m.size), attributes, max, `${id}__part${i}`));
  });
  return parts;
}

function join(parts) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** A chain of two-input Adds. */
function sumToAdds(node) {
  const parts = [];
  let acc = node.inputs[0];
  for (let i = 1; i < node.inputs.length; i++) {
    const last = i === node.inputs.length - 1;
    const id = last ? node.outputs[0] : `${node.name}__add${i}`;
    pushAll(parts, nodeField({ name: last ? node.name : id, opType: "Add", inputs: [acc, node.inputs[i]], outputs: [id] }));
    acc = id;
  }
  return parts;
}

/**
 * Returns the rewritten model, or the input itself when nothing needed to
 * change. `maxBuffers` is the number of tensors (inputs + outputs) one node
 * may have. `stats` receives a short description of each rewritten node.
 */
export function prepareForWebGpu(model, maxBuffers, stats = []) {
  const max = maxBuffers - 1;
  const modelFields = fields(model, 0, model.length);
  const graph = modelFields.find((f) => f.field === MODEL_GRAPH && f.wire === 2);
  if (!graph) return model;

  const constants = new Map();
  const graphParts = [];
  let changed = false;
  for (const f of fields(model, graph.valueStart, graph.end)) {
    if (f.field === GRAPH_NODE && f.wire === 2) {
      const node = readNode(model, f.valueStart, f.end);
      const name = node.name || node.outputs[0];
      const attributes = node.attributes.map((a) => model.subarray(a.begin, a.end));
      if (!node.domain && node.opType === "Constant" && node.outputs.length === 1) {
        const values = constantInt64s(model, node);
        if (values) constants.set(node.outputs[0], values);
      }
      if (!node.domain && node.opType === "Sum" && node.outputs.length === 1 && node.inputs.length > 1) {
        stats.push(`Sum ${node.inputs.length}`);
        pushAll(graphParts, sumToAdds({ ...node, name }));
        changed = true;
        continue;
      }
      if (!node.domain && node.opType === "Concat" && node.outputs.length === 1) {
        const inputs = node.inputs.filter(Boolean);
        if (inputs.length > max) {
          stats.push(`Concat ${inputs.length}`);
          pushAll(graphParts, splitConcat({ ...node, name, inputs }, attributes, max));
          changed = true;
          continue;
        }
      }
      if (!node.domain && node.opType === "Split" && node.outputs.length > max && node.outputs.every(Boolean)) {
        const sizes = constants.get(node.inputs[1]);
        if (node.inputs.length === 2 && sizes?.length === node.outputs.length) {
          stats.push(`Split ${node.outputs.length}`);
          pushAll(graphParts, splitSplit(node.inputs[0], node.outputs, sizes, attributes, max, name));
          changed = true;
          continue;
        }
      }
    }
    graphParts.push(model.subarray(f.begin, f.end));
  }
  if (!changed) return model;

  const parts = [];
  for (const f of modelFields) {
    if (f === graph) pushAll(parts, lengthField(MODEL_GRAPH, graphParts));
    else parts.push(model.subarray(f.begin, f.end));
  }
  return join(parts);
}
