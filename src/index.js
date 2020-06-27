const os = require('os'),
  pkgcloud = require('pkgcloud'),
  DNSExporter = require('./DNSExporter')

function getFQDN(zone, host, done) {
    client.getRecords(String(zone.id), (err, records) => {
        if (err) {
            return done(err);
        }
        return records.filter(r => r.type === "A" && r.name.indexOf(host) === 0)[0].name;
    });
}

module.exports = function setup(config, imports, done) {
    const log = imports.log.getLogger("dns-exporter");
    const host = os.hostname();
    const client = pkgcloud.dns.createClient(config.client);
    let targetZoneName = config.targetZone;
    let exporter;
    const package = require.main.require('package.json');

    imports.hub.on('app', (app) => {
        (config.services|[]).forEach((shortName) => {
            let name = '_' + shortName + '._tcp.' + package.name;
            let port = app.services[shortName].address.port;
            log.info('registering service', name, 'has listening on', port, '@', exporter.fqdn);
            exporter.export(name, port, config.weight || 33);
        });
    });
    

    client.getZones({}, (err, zones) => {
        if (err) {
            log.error('unable to read zones', err);
            return done(err);
        }
        if (!zones || zones.length === 0) {
            log.error('no zones found');
            return done();
        }
        let zone = zones.filter(z=> z.name === targetZoneName)[0];
        if(!zone) {
            log.error('unable to find target zone', targetZoneName);
            return done();
        }   
        getFQDN(zone, host, (err, fqdn) => {
            exporter = new DNSExporter(client, zone, fqdn, log);
            return done(err);
        });
    });
};
module.exports.consumes = ['log', 'hub'];
