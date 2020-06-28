const os = require('os'),
  pkgcloud = require('pkgcloud'),
  DNSExporter = require('./DNSExporter')

module.exports = function setup(config, imports, done) {
    const log = imports.log.getLogger("dns-exporter");
    const host = os.hostname().split('.')[0];
    const client = pkgcloud.dns.createClient(config.client);
    let targetZoneName = config.targetZone;
    let exporter;

    imports.hub.on('ready', (app) => {
        Promise.all((config.services||[]).map((shortName) => {
            let name = '_' + shortName + '._tcp.' + config.name + '.' + targetZoneName;
            let port = app.services[shortName].address().port;
            log.info('registering service', name, 'has listening on', port, '@', exporter.fqdn);
            return exporter.publish(name, port, config.weight || 33);
        })).catch((e) => {
            log.error('error while publishing service', e);
        });
    });

    function getFQDN(zone, host, done) {
        client.getRecords(String(zone.id), (err, records) => {
            if (err) {
                return done(err);
            }
            let matches = records.filter(r => r.type === "A" && r.name.indexOf(host) === 0);
            return done(null, matches[0] && matches[0].name);
        });
    }
    

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
            return done(err, {
                dns_exporter: exporter,
                onDestroy: function () {
                    exporter.unpublish();
                }
            });
        });
    });
};
module.exports.consumes = ['log', 'hub'];
module.exports.provides = ['dns_exporter']
