'use strict';

var   xmpp          = require('xmpp-ftw')
    , express       = require('express')
    , app           = express()
    , engine        = require('ejs-locals')
    , Emitter       = require('primus-emitter')
    , Primus        = require('primus')
    , helmet        = require('helmet')
    , winston       = require('winston')
    , winstonConfig = require('winston-config')
    , bodyParser    = require('body-parser')
    , methodOverride = require('method-override')
    , morgan        = require('morgan')
    , errorHandler  = require('errorhandler')

var port = process.env.PORT || process.argv[2] || 3000

helmet.defaults(app)
/* jshint -W098 */
try {
    var config = require('./config/logging.json')
} catch (e) {
    var config = require('./config/logger.default.json')
}

winstonConfig.fromJson(config, function(error, winston) {
    if (error) {
        console.error('Error configuring winston')
        process.exit(1)
    }
})

var server = require('http').createServer(app)
server.listen(port)
winston.info('Server started and listening on port ' + port)

var version = require('xmpp-ftw/package.json').version

var options = {
    transformer: 'socket.io',
    parser: 'JSON',
    transports: [
        'websocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ]
}

var primus = new Primus(server, options)
primus.use('emitter', Emitter)
primus.save(__dirname + '/public/scripts/primus.js')

var Muc = require('xmpp-ftw-muc')
var Disco = require('xmpp-ftw-disco')
var Pubsub = require('xmpp-ftw-pubsub')
var Register = require('xmpp-ftw-register')
var Superfeedr = require('xmpp-ftw-superfeedr')
var Buddycloud = require('xmpp-ftw-buddycloud')
var Avatar = require('xmpp-ftw-avatar')
var Search = require('xmpp-ftw-search')
var Rpc = require('xmpp-ftw-rpc')
var Fanout = require('xmpp-ftw-fanout')
var Jingle = require('xmpp-ftw-jingle')
var Mam = require('xmpp-ftw-mam')
var Command = require('xmpp-ftw-command')
var Ping = require('xmpp-ftw-ping')

primus.on('connection', function(socket) {
    var xmppFtw = new xmpp.Xmpp(socket)
    xmppFtw.setLogger(winston)
    xmppFtw.addListener(new Muc())
    xmppFtw.addListener(new Disco())
    xmppFtw.addListener(new Pubsub())
    xmppFtw.addListener(new Register())
    xmppFtw.addListener(new Superfeedr())
    xmppFtw.addListener(new Buddycloud())
    xmppFtw.addListener(new Avatar())
    xmppFtw.addListener(new Search())
    xmppFtw.addListener(new Rpc())
    xmppFtw.addListener(new Fanout())
    xmppFtw.addListener(new Jingle())
    xmppFtw.addListener(new Mam())
    xmppFtw.addListener(new Command())
    xmppFtw.addListener(new Ping())
    socket.xmppFtw = xmppFtw
})

primus.on('disconnection', function(socket) {
    console.log('Client disconnected, logging them out')
    socket.xmppFtw.logout()
})

var readme = require('express-middleware-readme.md')
readme.setOptions({
    htmlWrap: {
        meta: [
            { charset: 'utf-8' }
        ],
        title: 'XMPP-FTW Github README.md'
    }
})

var addCorsHeaders = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With')
    next()
}

app.disable('x-powered-by')
app.use(express.static(__dirname + '/public'))
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(bodyParser())
app.use(methodOverride())
app.use(readme.run)
app.use(addCorsHeaders)
app.use(morgan())
app.set('strict routing', false)
app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
}))

app.engine('ejs', engine)

var configuration = {
    ga: process.env.GOOGLE_ANALYTICS_ID || null,
    webmasterTools: process.env.GOOGLE_WEBMASTER_TOOLS || null,
    body:     {},
    title:    'XMPP-FTW ⟫ ',
    version:  version
}

require('./lib/routes')(app, configuration)

process.on('uncaughtException', function(error) {
    // Try and prevent issues crashing the whole system
    // for other users too
    console.error(error)
})
