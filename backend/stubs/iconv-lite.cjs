function asString(buf) {
  if (typeof buf === "string") return buf;
  if (Buffer.isBuffer(buf)) return buf.toString("utf8");
  return String(buf ?? "");
}

function decoder() {
  return {
    write(chunk) {
      return asString(chunk);
    },
    end() {
      return "";
    },
  };
}

function encoder() {
  return {
    write(str) {
      return Buffer.from(asString(str));
    },
    end() {
      return Buffer.alloc(0);
    },
  };
}

module.exports = {
  encodingExists() {
    return true;
  },
  decode(buf) {
    return asString(buf);
  },
  encode(str) {
    return Buffer.from(asString(str));
  },
  getDecoder() {
    return decoder();
  },
  getEncoder() {
    return encoder();
  },
};
