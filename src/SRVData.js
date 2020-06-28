class SRVData {
  constructor(weight, port, hostname) {
    this.weight = weight;
    this.port = port;
    this.hostname = hostname;
  }
  static parse(str) {
    let elems = str.split(" ");
    return new SRVData(elems[0], elems[1], elems[2]);
  }
  toString() {
    return [this.weight, this.port, this.hostname].join(" ");
  }
  equals(other) {
    return (
      this.weight === other.weight &&
      this.port === other.port &&
      this.hostname === other.hostname
    );
  }
}

module.exports = SRVData;
