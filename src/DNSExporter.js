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
    }
    _createOrUpdate(record, srvRecord, done) {
        if(srvRecord) {
            let current = SRVData.parse(srvRecord.data);
            if (!current.equals(record.srvData)) {
                srvRecord.data = record.srvData.toString();
                this.client.updateRecord(String(zone.id), srvRecord, done);
            }
        } else {
            record.data = record.srvData.toString();
            this.client.createRecord(String(zone.id), record, done);
        }
    }
    export(name, port, weight, done) {
        let srvData = new SRVData(weight, port, this.fqdn);
        this.client.getRecords(String(zone.id), (err, records) => {
            if (err) {
                this.log.error('unable to read records from zone', err);
                return done && done(err);
            }
            let srvRecords = getSRV(name, this.fqdn, records);
            let srvRecord = srvRecords && srvRecords[0];
            let record = {
                name: name,
                type: 'SRV',
                data: srvData,
                ttl: ttl,
                priority: priority
            }
            this._createOrUpdate(record, srvRecord, (err) => {
                return done && done(err);
            });
        });
    }
}

module.exports = DNSExporter;