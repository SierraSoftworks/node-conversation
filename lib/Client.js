/// <reference path="../nodelib/node.js"/>
/// <reference path="../nodelib/should.js"/>
/// <reference path="Conversation.js"/>

var net = require('net');
var should = require('should');
var _ = require('lodash');

require.modules = require.modules || {};
require.modules.Client = module.exports = Client;

function Client(conversation, id, options) {
	/// <summary>Creates a new Client to participate in a conversation</summary>
	/// <param name="conversation" type="conversation">The conversation in which the Client will participate</param>
	/// <param name="id" type="String">The unique identifier by which this Client may be accessed</param>
	/// <param name="options" type="Object">Any options governing the Client's behaviour</param>
	
	var $ = this;

	this.conversation = conversation;
	this.id = id;
	this.options = options;
	this.received = [];
	this.handlers = [];

	this.socket = new net.Socket();
	
	this.socket.on('connect', function () {
		$.conversation.__dequeuePending();
	});

	this.socket.on('error', this.conversation.__done);

	this.socket.on('data', function (data) {
		data = data.toString('utf8');

		if ($.handlers.length > 0) $.handlers.shift().call($, data);
		else $.received.push(data);
	});

	Object.defineProperty(this, 'onDataReady', {
		value: function (handler) {
			/// <summary>Registers a one-shot handler for the next received data from this Client</summary>
			/// <param name="handler" type="Function">A function to be called with the received data</param>

			if (this.received.length > 0)
				handler.call(this.conversation, this.received.shift());
			else this.handlers.push(handler);
		},
		enumerable: false
	});
}

Client.prototype.write = Client.prototype.send = function (message) {
	/// <summary>Queues a write operation in sequence by the current Client</summary>
	/// <param name="message" type="String">The data packet to send from the Client</param>
	/// <returns type="conversation"/>

	return this.conversation.write(this.id, message);
}

Client.prototype.writeAnd = Client.prototype.sendAnd = function (message) {
	/// <summary>Queues a write operation in sequence by the current Client</summary>
	/// <param name="message" type="String">The data packet to send from the Client</param>
	/// <returns type="Client"/>

	this.write(message);
	return this;
}

Client.prototype.read = Client.prototype.expect = function (message) {
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the current Client</summary>
	/// <param name="message" type="String">The packet that the Client expects to receive</param>
	/// <returns type="conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the current Client</summary>
	/// <param name="message" type="Regex">A regex which will validate the packet received by the Client</param>
	/// <returns type="conversation"/>
	/// </signature>

	return this.conversation.expect(this.id, message);
};

Client.prototype.readAnd = Client.prototype.expectAnd = function (message) {
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the current Client</summary>
	/// <param name="message" type="String">The packet that the Client expects to receive</param>
	/// <returns type="Client"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the current Client</summary>
	/// <param name="message" type="Regex">A regex which will validate the packet received by the Client</param>
	/// <returns type="Client"/>
	/// </signature>

	this.expect(message);

	return this;
};