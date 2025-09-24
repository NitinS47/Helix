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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
// listeners/websocketListener.ts
var fabric_network_1 = require("fabric-network");
var path = require("path");
var fs = require("fs");
var ws_1 = require("ws");
// END OF CHANGES
var WEBSOCKET_PORT = 8082;
// --- WebSocket Server Setup ---
var wss = new ws_1.WebSocketServer({ port: WEBSOCKET_PORT });
console.log("\u2705 WebSocket server started on ws://localhost:".concat(WEBSOCKET_PORT));
// --- Global State Management ---
var gateway;
var networkNodes = [];
var networkEdges = [];
/**
 * The single source of truth function. It gets the current network map,
 * fetches all records from the ledger, combines them, and broadcasts
 * the complete graph state to all connected clients.
 */
function broadcastFullGraphState() {
    return __awaiter(this, void 0, void 0, function () {
        var network, contract, resultBytes, records, recordNodes, recordEdges, fullNodes, fullEdges, message_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!gateway) {
                        console.log('Gateway not connected. Skipping broadcast.');
                        return [2 /*return*/];
                    }
                    console.log('🔄 Recalculating and broadcasting full graph state...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, gateway.getNetwork('mychannel')];
                case 2:
                    network = _a.sent();
                    contract = network.getContract('helixcc');
                    return [4 /*yield*/, contract.evaluateTransaction('GetAllRecords')];
                case 3:
                    resultBytes = _a.sent();
                    records = JSON.parse(Buffer.from(resultBytes).toString('utf8'));
                    recordNodes = records.map(function (record, index) { return ({
                        id: record.RecordID,
                        data: { label: "Record: ".concat(record.RecordID) },
                        position: { x: 150 + (index * 120), y: 550 },
                        style: { background: '#f97316', color: 'white', border: '1px solid white', borderRadius: '100%' },
                        type: 'output'
                    }); });
                    recordEdges = records.flatMap(function (record) {
                        return networkNodes.filter(function (n) { return n.id.startsWith('peer'); }).map(function (peerNode) { return ({
                            id: "edge-".concat(record.RecordID, "-").concat(peerNode.id),
                            source: record.RecordID,
                            target: peerNode.id,
                            type: 'smoothstep',
                            style: { stroke: '#f97316' }
                        }); });
                    });
                    fullNodes = __spreadArray(__spreadArray([], networkNodes, true), recordNodes, true);
                    fullEdges = __spreadArray(__spreadArray([], networkEdges, true), recordEdges, true);
                    message_1 = JSON.stringify({
                        type: 'GRAPH_UPDATE',
                        payload: { nodes: fullNodes, edges: fullEdges }
                    });
                    // 5. Broadcast to all clients.
                    wss.clients.forEach(function (client) {
                        if (client.readyState === client.OPEN) {
                            client.send(message_1);
                        }
                    });
                    console.log("Broadcast complete. Sent graph with ".concat(fullNodes.length, " nodes."));
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('🔴 Error broadcasting full graph state:', error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Connects to the Fabric network and discovers its topology (peers, orderers).
 */
function discoverNetwork() {
    return __awaiter(this, void 0, void 0, function () {
        var network, channel, discoveryService, endorsingPeers, discoveryRequest, discoveryResult, nodes_1, edges_1, peers, orderers, error_2;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!gateway)
                        return [2 /*return*/];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 5, , 6]);
                    console.log('🔍 Performing network discovery...');
                    return [4 /*yield*/, gateway.getNetwork('mychannel')];
                case 2:
                    network = _d.sent();
                    channel = network.getChannel();
                    discoveryService = channel.newDiscoveryService('discovery');
                    endorsingPeers = channel.getEndorsers();
                    discoveryRequest = {
                        target: endorsingPeers[0], // Target the first available endorsing peer
                        config: true,
                    };
                    return [4 /*yield*/, discoveryService.send(discoveryRequest)];
                case 3:
                    discoveryResult = _d.sent();
                    nodes_1 = [];
                    edges_1 = [];
                    peers = ((_a = discoveryResult.peers_by_org['Org1MSP']) === null || _a === void 0 ? void 0 : _a.peers) || [];
                    peers.forEach(function (peer, i) {
                        nodes_1.push({ id: "peer".concat(i, ".org1"), data: { label: "Peer ".concat(i, " (Org1)") }, position: { x: 100 + i * 400, y: 200 }, style: { background: '#0ea5e9', color: 'white', border: 'none' } });
                    });
                    orderers = ((_c = (_b = discoveryResult.orderers) === null || _b === void 0 ? void 0 : _b['OrdererMSP']) === null || _c === void 0 ? void 0 : _c.endpoints) || [];
                    orderers.forEach(function (orderer, i) {
                        var ordererId = "orderer".concat(i);
                        nodes_1.push({ id: ordererId, data: { label: "Orderer ".concat(i) }, position: { x: 300, y: 400 }, style: { background: '#a855f7', color: 'white', border: 'none' } });
                        nodes_1.filter(function (n) { return n.id.startsWith('peer'); }).forEach(function (peerNode) {
                            edges_1.push({ id: "edge-".concat(peerNode.id, "-").concat(ordererId), source: peerNode.id, target: ordererId, type: 'step' });
                        });
                    });
                    // Update the global state
                    networkNodes = nodes_1;
                    networkEdges = edges_1;
                    console.log("Discovery complete. Found ".concat(networkNodes.length, " base nodes."));
                    return [4 /*yield*/, broadcastFullGraphState()];
                case 4:
                    _d.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_2 = _d.sent();
                    console.error('🔴 Error during network discovery:', error_2);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main function to set up the gateway connection and listeners.
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var wallet, cert, key, identity, ccp, network, error_3;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, fabric_network_1.Wallets.newInMemoryWallet()];
                case 1:
                    wallet = _a.sent();
                    cert = fs.readFileSync(path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-cert.pem'), 'utf8');
                    key = fs.readFileSync(path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-key.pem'), 'utf8');
                    identity = { credentials: { certificate: cert, privateKey: key }, mspId: 'Org1MSP', type: 'X.509' };
                    return [4 /*yield*/, wallet.put('Org1Admin', identity)];
                case 2:
                    _a.sent();
                    ccp = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'fabric_config', 'connection-org1.json'), 'utf8'));
                    gateway = new fabric_network_1.Gateway();
                    return [4 /*yield*/, gateway.connect(ccp, { wallet: wallet, identity: 'Org1Admin', discovery: { enabled: true, asLocalhost: true } })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, gateway.getNetwork('mychannel')];
                case 4:
                    network = _a.sent();
                    // The block listener now simply triggers a full graph state refresh.
                    return [4 /*yield*/, network.addBlockListener(function (event) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        console.log("\uD83D\uDE80 New Block Detected! Block Number: ".concat(event.blockNumber, ". Triggering graph update."));
                                        return [4 /*yield*/, broadcastFullGraphState()];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 5:
                    // The block listener now simply triggers a full graph state refresh.
                    _a.sent();
                    console.log('✅ Fabric listener registered.');
                    // Run discovery on startup and then periodically.
                    return [4 /*yield*/, discoverNetwork()];
                case 6:
                    // Run discovery on startup and then periodically.
                    _a.sent();
                    setInterval(discoverNetwork, 60000); // Refresh network map every minute
                    return [3 /*break*/, 8];
                case 7:
                    error_3 = _a.sent();
                    console.error("\uD83D\uDD34 Fatal error in main function: ".concat(error_3));
                    process.exit(1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// When a new browser connects, immediately send it the current graph state.
wss.on('connection', function () {
    console.log('🔗 New client connected. Sending current graph state.');
    broadcastFullGraphState();
});
main();
