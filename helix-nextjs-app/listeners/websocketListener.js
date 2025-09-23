"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// listeners/websocketListener.ts
var fabric_network_1 = require("fabric-network");
var path = require("path");
var fs = require("fs");
var ws_1 = require("ws");
// Define the port for our WebSocket server
var WEBSOCKET_PORT = 8082;
// 1. Set up the WebSocket Server
var wss = new ws_1.WebSocketServer({ port: WEBSOCKET_PORT });
console.log("\u2705 WebSocket server started on ws://localhost:".concat(WEBSOCKET_PORT));
// A simple broadcast function to send data to all connected clients
function broadcast(data) {
    var message = JSON.stringify(data);
    console.log("Broadcasting message to ".concat(wss.clients.size, " clients: ").concat(message));
    wss.clients.forEach(function (client) {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}
wss.on('connection', function (ws) {
    console.log('🔗 New client connected.');
    ws.on('close', function () {
        console.log('✖️ Client disconnected.');
    });
});
// 2. Main Fabric Listener Logic (adapted from your blockListener.ts)
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var wallet, certPath, cert, keyPath, key, identity, ccpPath, ccp, gateway, network, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, fabric_network_1.Wallets.newInMemoryWallet()];
                case 1:
                    wallet = _a.sent();
                    certPath = path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-cert.pem');
                    cert = fs.readFileSync(certPath, 'utf8');
                    keyPath = path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-key.pem');
                    key = fs.readFileSync(keyPath, 'utf8');
                    identity = {
                        credentials: { certificate: cert, privateKey: key },
                        mspId: 'Org1MSP',
                        type: 'X.509',
                    };
                    return [4 /*yield*/, wallet.put('Org1Admin', identity)];
                case 2:
                    _a.sent();
                    ccpPath = path.resolve(__dirname, '..', 'fabric_config', 'connection-org1.json');
                    ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
                    gateway = new fabric_network_1.Gateway();
                    return [4 /*yield*/, gateway.connect(ccp, {
                            wallet: wallet,
                            identity: 'Org1Admin',
                            discovery: { enabled: true, asLocalhost: true }
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, gateway.getNetwork('mychannel')];
                case 4:
                    network = _a.sent();
                    // Register the block listener
                    return [4 /*yield*/, network.addBlockListener(function (event) { return __awaiter(_this, void 0, void 0, function () {
                            var blockNumber, _i, _a, tx, payload, txId;
                            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                            return __generator(this, function (_o) {
                                blockNumber = event.blockNumber.toString();
                                if ('data' in event.blockData) {
                                    for (_i = 0, _a = (_c = (_b = event.blockData.data) === null || _b === void 0 ? void 0 : _b.data) !== null && _c !== void 0 ? _c : []; _i < _a.length; _i++) {
                                        tx = _a[_i];
                                        payload = (_j = (_h = (_g = (_f = (_e = (_d = tx === null || tx === void 0 ? void 0 : tx.payload) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.actions[0]) === null || _f === void 0 ? void 0 : _f.payload) === null || _g === void 0 ? void 0 : _g.action) === null || _h === void 0 ? void 0 : _h.proposal_response_payload) === null || _j === void 0 ? void 0 : _j.extension;
                                        txId = (_m = (_l = (_k = tx === null || tx === void 0 ? void 0 : tx.payload) === null || _k === void 0 ? void 0 : _k.header) === null || _l === void 0 ? void 0 : _l.channel_header) === null || _m === void 0 ? void 0 : _m.tx_id;
                                        if (payload && txId) {
                                            // Instead of console.log, we now broadcast the event
                                            broadcast({
                                                type: 'NEW_TRANSACTION',
                                                blockNumber: blockNumber,
                                                txId: txId,
                                                chaincode: payload.chaincode_id.name,
                                                timestamp: new Date().toISOString()
                                            });
                                        }
                                    }
                                }
                                return [2 /*return*/];
                            });
                        }); })];
                case 5:
                    // Register the block listener
                    _a.sent();
                    console.log('✅ Fabric listener registered. Listening for new block events...');
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error("\uD83D\uDD34 Failed to run the Fabric listener: ".concat(error_1));
                    process.exit(1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Start the Fabric listener after setting up the WebSocket server
main();
