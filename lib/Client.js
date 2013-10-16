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
	this.__options = options;
	this.__received = [];
	this.__handlers = [];

	this.socket = new net.Socket();
	
	this.socket.on('connect', function () {
		$.conversation.__dequeuePending();
	});

	this.socket.on('error', this.conversation.__done);

	this.socket.on('data', function (data) {
		data = data.toString('utf8');

		if ($.__handlers.length > 0) $.__handlers.shift().call($, data);
		else $.__received.push(data);
	});

	this.socket.on('close', function() {
		$.conversation.__clientDisconnect($);
	});

	Object.defineProperty(this, 'onDataReady', {
		value: function (handler) {
			/// <summary>Registers a one-shot handler for the next received data from this Client</summary>
			/// <param name="handler" type="Function">A function to be called with the received data</param>

			if (this.__received.length > 0)
				handler.call(this.conversation, this.__received.shift());
			else this.__handlers.push(handler);
		},
		enumerable: false
	});
}

Client.prototype.write = Client.prototype.send = function (message) {
	/// <summary>Queues a write operation in sequence by the current Client</summary>
	/// <param name="message" type="String">The data packet to send from the Client</param>
	/// <returns type="Conversation"/>

	return this.conversation.write(this.id, message);
};

Client.prototype.read = Client.prototype.expect = function (message) {
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

	return this.conversation.expect(this.id, message);
};

Client.prototype.disconnect = Client.prototype.end = function() {
	/// <summary>Queues a disconnect event for the current client</summary>
	/// <returns type="Conversation"/>
	return this.conversation.disconnect(this.id);
};

Client.prototype.drop = function(count) {	
	/// <signature>
	/// <summary>Drops any pending messages from the receive buffer for the current client</summary>
	/// </signature>	
	/// <signature>
	/// <summary>Drops the specified number of pending messages from the receive buffer for the current client</summary>
	/// <param name="count" type="Number">The number of messages to drop from the receive buffer, starting at the front</param>
	/// </signature>

	return this.conversation.drop(this.id, count);
};