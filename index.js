var config = require('./config/config.json'),
    server = require('./lib/server');

config.PORT         = process.env.PORT || config.PORT;
config.KEY          = config.KEY;
config.CERT         = config.CERT;
config.CA           = config.CA;
config.CERT_LOCAL   = config.CERT_LOCAL;
config.KEY_LOCAL    = config.KEY_LOCAL;

server.run(config);
