# Conversations
This module is designed to provide developers with an extremely powerful testing framework for complex TCP servers which generally require a large amount of boilerplate code or custom test functions. This module provides a fluent, easy to use and incredibly powerful framework on which extremely complex protocols can be tested.

## Setup
To use this module, simply add it to your package dependencies and run `npm install`. Alternatively, you can install it manually using the following command.

```
npm install sierra-conversation
```

## Example
All these things start out with an example of how you can use the test framework. The following is an example of using *node-conversation* with *Mocha*.

```js
var Conversation = require('conversation');

describe('protocol', function() {
	it('should forward messages to the correct user', function(done) {
		new Conversation({ port: 9119 })
			.client('u1').u1.send('LOGIN:user1;').and.expect('OK;')
			.client('u2').u2.send('LOGIN:user2;').and.expect('OK;')
			.client('u3').u3.send('LOGIN:user3;').and.expect('OK;')

			.u1.write('CHAT:user2:hello;').and.expect('SENT:1;')
			.u2.expect('MESSAGE:user1:hello;')
			.u1.read('RECEIVED:1;')

			.u2.write('CHAT:user3:hi;').and.read('SENT:2;')
			.u3.read('MESSAGE:user2:hi;')
			.u2.read('RECEIVED:2;')

			.u1.send('LOGOUT;')
			.all.expect('LOGOUT:user1;')

			.run(done);
	});
});
```

## Extensibility
Due to its design, it is extremely easy to automate common testing tasks (for example, login processes) by adding to the `Conversation.prototype` or `Conversations.Client.prototype`. This can help make testing systems which require setup tasks to be performed considerably easier.

## API
### Conversation
The conversation object provides the following API methods through which you can interact with a remote server.

```js
Conversation(options) {	
	/// <summary>Creates a new Conversation object which tests a protocol sequentially</summary>
	/// <param name="options" type="Object">Options dictating how the Conversation is handled</param>

	options = {
		port: Number,
		initializer: function(socket) { }
	}
}

Conversation.prototype.client = function(id, initializer) {	
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
};


Conversation.prototype.wait = function (time) {
	/// <summary>Waits for the specified interval before continuing the Conversation</summary>
	/// <param name="time" type="Number">The amount of time to wait in milliseconds</param>
	/// <returns type="Conversation"/>
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
};


Conversation.prototype.call = Conversation.prototype.then = function (callback) {
	/// <summary>Queues a call to the given function when the relevant point in the Conversation is reached</summary>
	/// <param name="callback" type="Function">The function to call</param>
	/// <returns type="Conversation"/>
};

Conversation.prototype.disconnect = Conversation.prototype.end = function(id) {
	/// <summary>Queues a disconnection event for the specified client</summary>
	/// <param name="id">The ID of the client who should disconnect</param>
	/// <returns type="Conversation"/>
};

Conversation.prototype.succeded = function(callback) {
	/// <summary>Runs the given callback if no error occurs</summary>
	/// <param name="callback">A function to be called once the conversation completes</param>
	/// <returns type="Conversation"/>
};

Conversation.prototype.failed = function(callback) {
	/// <summary>Runs the given callback if an error occurs</summary>
	/// <param name="callback">A function to be called to handle the error</param>
	/// <returns type="Conversation"/>
};

Conversation.prototype.finished = Conversation.prototype.done = function(callback) {
	/// <summary>Runs the given callback when the conversation finishes</summary>
	/// <param name="callback">A function to be called once the conversation completes</param>
	/// <returns type="Conversation"/>
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
};

Conversation.prototype.preSend = function (callback) {
	/// <summary>Registers a hook to preprocess data prior to it being sent</summary>
	/// <param name="callback" type="Function">A function which preprocesses the data</param>
	/// <returns type="Conversation"/>
};

Conversation.prototype.preReceive = function (callback) {
	/// <summary>Registers a hook to preprocess data prior to it being processed</summary>
	/// <param name="callback" type="Function">A function which preprocesses the data</param>
	/// <returns type="Conversation"/>
};


Conversation.prototype.preOperation = function (callback) {
	/// <summary>Registers a hook to preprocess an operation prior to it being dispatched</summary>
	/// <param name="callback" type="Function">A function which preprocesses the operation</param>
	/// <returns type="Conversation"/>
};
```
