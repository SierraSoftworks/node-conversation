/// <reference path="../nodelib/node.js"/>
/// <reference path="../nodelib/should.js"/>
/// <reference path="Client.js"/>
/// <reference path="AllClients.js"/>

var net = require('net');
var should = require('should');
var _ = require('lodash');
var Client = require('./Client');
var AllClients = require('./AllClients');

require.modules = require.modules || {};
require.modules['sierra-conversation'] = module.exports = Conversation;

function Conversation(options) {
	/// <summary>Creates a new Conversation object which tests a protocol sequentially</summary>
	/// <param name="options" type="Object">Options dictating how the Conversation is handled</param>

	this.options = options;
	this.clients = {};

	var $ = this;

	this.handlers = {
		success: [],
		fail: [],
		done: []
	};

	/// <field name="__lastClient" type="Client">The most recently referenced client</var>
	this.__lastClient = null;

	/// <value type="Client">The last referenced client</value>
	Object.defineProperty(this, 'and', {
		get: function() {
			/// <value type="Client">The last referenced client</value>
			return $.__lastClient;
		},
		enumerable: true
	});

	var allClients = new AllClients($);

	Object.defineProperty(this, 'all', {
		get: function() {
			/// <value type="AllClients">Perform operations on all connected clients</value>
			return allClients;
		}
	});

	Object.defineProperty(this, '__done', {
		get: function () {
			return function () {
				/// <summary>Handles completion of this Conversation as well as cleanup of any open sockets</summary>

				if(arguments[0]) {
					for(var i = 0; i < $.handlers.fail.length; i++)
						$.handlers.fail[i].apply($, arguments);
				} else {
					for(var i = 0; i < $.handlers.success.length; i++)
						$.handlers.success[i].apply($, arguments);
				}

				for(var i = 0; i < $.handlers.done.length; i++)
					$.handlers.done[i].apply($, arguments);

				for(var k in $.sockets)
					$.sockets[k].end();
				
			}
		},
		enumerable: false
	});

	var pending_operations = 0;
	var pending_error = null;
	var pending_continue = null;

	Object.defineProperty(this, '__enqueuePending', {
		value: function (next) {
			/// <signature>
			/// <summary>Enqueues a pending asyncronous operation</summary>
			/// </signature>
			/// <signature>
			/// <summary>Enqueues a pending asyncronous operation</summary>
			/// <param name="next" type="Function">A function to call once the operation has completed</param>
			/// </signature>

			if (next) pending_continue = next;
			pending_operations++;
		}
	});

	Object.defineProperty(this, '__dequeuePending', {
		value: function (err) {
			/// <signature>
			/// <summary>Indicates that a pending asyncronous operation has completed</summary>
			/// </signature>
			/// <signature>
			/// <summary>Indicates that a pending asyncronous operation has failed</summary>
			/// <param name="err" type="Error">The error that occurred within the async operation</param>
			/// </signature>

			if (err) pending_error = err;

			if (--pending_operations == 0) {
				var next = pending_continue;
				pending_continue = null;
				if(!pending_error) return next();
				return $.__done(pending_error);
			}			
		}
	});

	Object.defineProperty(this, '__clientDisconnect', {
		value: function(client) {
			delete $.clients[client.id];
		}
	});

	this.operations = [];
	this.hooks = {
		preSend: [],
		preReceive: [],
		preOperation: []
	};

	Object.defineProperty(this, '__nextop', {
		value: function (err) {
			if (err) return $.__done(err);
			if ($.operations.length == 0) return $.__done();

			var i, client;

			try
			{
				var op = $.operations.shift();

				for (i = 0; i < $.hooks.preOperation.length; i++)
					$.hooks.preOperation[i].call($, op);

				switch(op.op) {
					case 'wait': return setTimeout($.__nextop, op.wait);
					case 'hook':
						if (op.hook.length > 0) return op.hook($.__nextop);
						op.hook();
						return setTimeout($.__nextop, 1);
					case 'send':
						var send = op.send;
						for (i = 0; i < $.hooks.preSend.length; i++) {
							send = $.hooks.preSend[i].call($, send) || send;
						}
						op.client.socket.write(send);
						return setTimeout($.__nextop, 1);
					case 'receive':
						return op.client.onDataReady(function (data) {
							try {

								for (i = 0; i < $.hooks.preReceive.length; i++) {
									data = $.hooks.preReceive[i].call($, data) || data;
								}

								if (op.receive instanceof RegExp) op.receive.test(data).should.be.true;
								else if(typeof op.receive == 'function') op.receive(data);
								else data.should.equal(op.receive);

								setTimeout($.__nextop, 1);
							} catch (ex) {
								return $.__done(ex);
							}
						});
					case 'disconnect':
						op.client.socket.end();
						return setTimeout($.__nextop, 1);
					case 'drop':
						while(op.drop-- != 0 && op.client.__received.length > 0)
							op.client.__received.shift();
						return setTimeout($.__nextop, 1);
				}
			} catch (ex) {
				return $.__done(ex);
			}
		}
	});
}

Conversation.Client = Client;
Conversation.AllClients = AllClients;

Conversation.prototype.isConversation = true;

Conversation.prototype.client = function (id, initializer) {
	/// <signature>
	/// <summary>Adds a new client to the Conversation, using the Conversation's initializer or port number</summary>
	/// <param name="id" type="String">A unique client identifier used to indicate which client to use when sending a message</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Adds a new client to the Conversation</summary>
	/// <param name="id" type="String">A unique client identifier used to indicate which client to use when sending a message</param>
	/// <param name="initializer" type="Number">The port to which the client should connect</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Adds a new client to the Conversation</summary>
	/// <param name="id" type="String">A unique client identifier used to indicate which client to use when sending a message</param>
	/// <param name="initializer" type="Function">A function to be called once the client is connected, allowing for any setup</param>
	/// <returns type="Conversation"/>
	/// </signature>
	
	var options = {};

	if (typeof initializer === 'number') options.port = initializer;
	if (typeof initializer === 'function') options.initializer = initializer;

	this.clients[id] = new Client(this, id, options);

	var $ = this;
	Object.defineProperty(this, id, {
		get: function () { 
			var client = $.clients[id];
			if(!client) throw new Error('The client you attempted to access has disconnected');
			return client;
		}
	});

	this.__lastClient = this.clients[id];

	return this;
};

Conversation.prototype.write = Conversation.prototype.send = function (id, message) {
	/// <signature>
	/// <summary>Queues a write operation in sequence by the default client ID</summary>
	/// <param name="message" type="String">The data packet to send from the client</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a write operation in sequence by the given client ID</summary>
	/// <param name="id" type="String">The ID of the client from whom the packet will be sent</param>
	/// <param name="message" type="String">The data packet to send from the client</param>
	/// <returns type="Conversation"/>
	/// </signature>

	if (!message) {
		message = id;
		id = null;
	}

	if (!id && _.keys(this.clients).length > 1) throw new Error('Cannot use a default client if more than one client is present');
	if (!id) id = _.keys(this.clients)[0];

	var client = this.clients[id];
	if(!client) return this.__done(new Error('Couldn\'t find a registered client with the ID "' + id + '"'));
	this.__lastClient = client;

	this.operations.push({ 
		op: 'send',
		client: client, 
		send: message
		});

	return this;
};

Conversation.prototype.expect = Conversation.prototype.read = function (id, message) {
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the default client</summary>
	/// <param name="message" type="String">The packet that the client expects to receive</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the default client</summary>
	/// <param name="message" type="Regex">A regex which will validate the packet received by the client</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the default client</summary>
	/// <param name="message" type="Function">A function which will validate the received data</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the given client ID</summary>
	/// <param name="id" type="String">The ID of the client to whom the message should be sent</param>
	/// <param name="message" type="String">The packet that the client expects to receive</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the given client ID</summary>
	/// <param name="id" type="String">The ID of the client to whom the message should be sent</param>
	/// <param name="message" type="Regex">A regex which will validate the packet received by the client</param>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Queues a receive operation in sequence to the given client ID</summary>
	/// <param name="id" type="String">The ID of the client to whom the message should be sent</param>
	/// <param name="message" type="Function">A function which will validate the received data</param>
	/// <returns type="Conversation"/>
	/// </signature>
	
	if (!message) {
		message = id;
		id = null;
	}

	if (!id && _.keys(this.clients).length > 1) throw new Error('Cannot use a default client if more than one client is present');
	if (!id) id = _.keys(this.clients)[0];

	var client = this.clients[id];
	if(!client) return this.__done(new Error('Couldn\'t find a registered client with the ID "' + id + '"'));
	this.__lastClient = client;

	this.operations.push({ 
		op: 'receive',
		client: client, 
		receive: message 
	});

	return this;
};

Conversation.prototype.wait = function (time) {
	/// <summary>Waits for the specified interval before continuing the Conversation</summary>
	/// <param name="time" type="Number">The amount of time to wait in milliseconds</param>
	/// <returns type="Conversation"/>

	this.operations.push({ op: 'wait', wait: time });
	return this;
};

Conversation.prototype.drop = function(id, count) {
	/// <signature>
	/// <summary>Drops any pending messages from the receive buffer for the specified client</summary>
	/// <param name="id" type="String">The ID of the client who's receive buffer should be cleared</param>
	/// </signature>	
	/// <signature>
	/// <summary>Drops the specified number of pending messages from the receive buffer for the specified client</summary>
	/// <param name="id" type="String">The ID of the client who's receive buffer should be cleared</param>
	/// <param name="count" type="Number">The number of messages to drop from the receive buffer, starting at the front</param>
	/// </signature>

	var client = this.clients[id];
	if(!client) return this.__done(new Error('Couldn\'t find a registered client with the ID "' + id + '"'));
	this.__lastClient = client;

	this.operations.push({ 
		op: 'drop',
		client: client, 
		drop: count || -1 
	});

	return this;
};

Conversation.prototype.call = Conversation.prototype.then = function (callback) {
	/// <summary>Queues a call to the given function when the relevant point in the Conversation is reached</summary>
	/// <param name="callback" type="Function">The function to call</param>
	/// <returns type="Conversation"/>

	this.operations.push({ 
		op: 'hook',
		hook: callback 
	});

	return this;
};

Conversation.prototype.disconnect = Conversation.prototype.end = function(id) {
	/// <summary>Queues a disconnection event for the specified client</summary>
	/// <param name="id">The ID of the client who should disconnect</param>
	/// <returns type="Conversation"/>

	var client = this.clients[id];
	if(!client) return this.__done(new Error('Couldn\'t find a registered client with the ID "' + id + '"'));
	this.__lastClient = client;

	this.operations.push({ 
		client: client, 
		op: 'disconnect'
	});

	return this;
};

Conversation.prototype.succeded = function(callback) {
	/// <summary>Runs the given callback if no error occurs</summary>
	/// <param name="callback">A function to be called once the conversation completes</param>
	/// <returns type="Conversation"/>

	this.handlers.success.push(callback);
	return this;
};

Conversation.prototype.failed = function(callback) {
	/// <summary>Runs the given callback if an error occurs</summary>
	/// <param name="callback">A function to be called to handle the error</param>
	/// <returns type="Conversation"/>

	this.handlers.fail.push(callback);
	return this;
};

Conversation.prototype.finished = Conversation.prototype.done = function(callback) {
	/// <summary>Runs the given callback when the conversation finishes</summary>
	/// <param name="callback">A function to be called once the conversation completes</param>
	/// <returns type="Conversation"/>

	this.handlers.done.push(callback);
	return this;
};

Conversation.prototype.run = function (done) {
	/// <signature>
	/// <summary>Runs the prepared Conversation</summary>
	/// <returns type="Conversation"/>
	/// </signature>
	/// <signature>
	/// <summary>Runs the prepared Conversation, calling the given callback once complete</summary>
	/// <param name="done" type="Function">A function to be called once the Conversation has been completed</param>
	/// <returns type="Conversation"/>
	/// </signature>

	if(done)
		this.handlers.done.push(done);

	this.__enqueuePending(this.__nextop);
	for (var k in this.clients) {
		this.__enqueuePending();

		if (this.clients[k].__options.initializer) this.clients[k].__options.initializer.call(this, this.clients[k].socket);
		else if (this.clients[k].__options.port) this.clients[k].socket.connect(this.clients[k].__options.port);
		else if (this.options.initializer) this.options.initializer.call(this, this.clients[k].socket);
		else if (this.options.port) this.clients[k].socket.connect(this.options.port);
		else return this.__dequeuePending(new Error('No feasible way to initialize client "' + k + '"'));
	}

	this.__dequeuePending();
};

Conversation.prototype.preSend = function (callback) {
	/// <summary>Registers a hook to preprocess data prior to it being sent</summary>
	/// <param name="callback" type="Function">A function which preprocesses the data</param>
	/// <returns type="Conversation"/>

	this.hooks.preSend.push(callback);

	return this;
};

Conversation.prototype.preReceive = function (callback) {
	/// <summary>Registers a hook to preprocess data prior to it being processed</summary>
	/// <param name="callback" type="Function">A function which preprocesses the data</param>
	/// <returns type="Conversation"/>

	this.hooks.preReceive.push(callback);

	return this;
};

Conversation.prototype.preOperation = function (callback) {
	/// <summary>Registers a hook to preprocess an operation prior to it being dispatched</summary>
	/// <param name="callback" type="Function">A function which preprocesses the operation</param>
	/// <returns type="Conversation"/>

	this.hooks.preOperation.push(callback);

	return this;
};