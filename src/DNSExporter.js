const SRVData = require("./SRVData");

function getSRV(name, hostname, records) {
    return records.filter(
      r =>
        r.type === "SRV" &&
        r.name === name &&
        r.data.match(new RegExp(" " + hostname + "$"))
    );
  }

class DNSExporter {
    constructor(client, zone, fqdn, log) {
        this.client = client;
        this.zone = zone;
        this.fqdn = fqdn;
        this.log = log;
        this.records = [];
    }
    _createOrUpdate(record, srvRecord, done) {
        this.records.push(record);
        if(srvRecord) {
            let current = SRVData.parse(srvRecord.data);
            if (!current.equals(record.data)) {
                srvRecord.data = record.data.toString();
                return this.client.updateRecord(String(this.zone.id), srvRecord, done);
            }
            return done(null, srvRecord);
        } 
        record.data = record.data.toString();
        this.client.createRecord(String(this.zone.id), record, done);
    }
    publish(name, port, weight) {
        let srvData = new SRVData(weight, port, this.fqdn);
        return new Promise((resolve, reject) => {
            this.client.getRecords(String(this.zone.id), (err, records) => {
                if (err) {
                    this.log.error('unable to read records from zone', err);
                    return reject(err);
                }
                let srvRecords = getSRV(name, this.fqdn, records);
                let srvRecord = srvRecords && srvRecords[0];
                let record = {
                    name: name,
                    type: 'SRV',
                    data: srvData,
                    ttl: 300,
                    priority: 100
                }
                this._createOrUpdate(record, srvRecord, (err, res) => {
                    if (res) {
                        this.records.push(res.id);
                    }
                    if (err) {
                        return reject(err);
                    }
                    return resolve(err);
                });
            });
        });
    }
    _delete(id) {
        return new Promise((resolve, reject) => {
            this.client.createRecord(String(this.zone.id), id, (err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            });
        });
    }
    unpublish() {
        this.log.info('unpublishing services');
        return Promise.all(this.records.map((r) => this._delete(r)));
    }
}

module.exports = DNSExporter;