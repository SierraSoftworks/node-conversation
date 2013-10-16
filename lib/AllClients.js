/// <reference path="../nodelib/node.js"/>
/// <reference path="../nodelib/should.js"/>
/// <reference path="Conversation.js"/>
/// <reference path="Client.js"/>

var net = require('net');
var should = require('should');
var _ = require('lodash');

require.modules = require.modules || {};
require.modules.AllClients = module.exports = AllClients;

function AllClients(conversation) {
	/// <summary>Creates a new wrapper for operations on all clients within a conversation</summary>
	/// <param name="conversation" type="conversation">The conversation in which the clients are participating/param>
	
	var $ = this;

	this.conversation = conversation;	
}

AllClients.prototype.write = AllClients.prototype.send = function (message) {
	/// <summary>Queues a write operation in sequence by the current Client</summary>
	/// <param name="message" type="String">The data packet to send from the Client</param>
	/// <returns type="Conversation"/>

	_.each(this.conversation.clients, function(client) { client.write(message); })

	return this.conversation;
};

AllClients.prototype.read = AllClients.prototype.expect = function (message) {
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the current Client</summary>
	/// <param name="message" type="String">The packet that the Client expects to receive</param>
	/// <returns type="conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the current Client</summary>
	/// <param name="message" type="Regex">A regex which will validate the packet received by the Client</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the current Client</summary>
	/// <param name="message" type="Function">A function which will validate the received data</param>
	/// <returns type="Conversation"/>
	/// </signature>

	_.each(this.conversation.clients, function(client) { client.expect(message); })

	return this.conversation;
};

AllClients.prototype.disconnect = AllClients.prototype.end = function() {
	/// <summary>Queues a disconnect event for the current client</summary>
	/// <returns type="Conversation"/>

	_.each(this.conversation.clients, function(client) { client.disconnect(); })

	return this.conversation;
};

AllClients.prototype.drop = function(count) {	
	/// <signature>
	/// <summary>Drops any pending messages from the receive buffer for the current client</summary>
	/// </signature>	
	/// <signature>
	/// <summary>Drops the specified number of pending messages from the receive buffer for the current client</summary>
	/// <param name="count" type="Number">The number of messages to drop from the receive buffer, starting at the front</param>
	/// </signature>

	_.each(this.conversation.clients, function(client) { client.drop(count); })

	return this.conversation;
};