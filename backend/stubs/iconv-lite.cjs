function asString(buf) {
  if (typeof buf === "string") return buf;
  if (Buffer.isBuffer(buf)) return buf.toString("utf8");
  return String(buf ?? "");
}

module.exports = {
  encodingExists() {
    return false;
  },
  decode(buf) {
    return asString(buf);
  },
  encode(str) {
    return Buffer.from(asString(str));
  },
};
