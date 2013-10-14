# Conversations
This module is designed to provide developers with an extremely powerful testing framework for complex TCP servers which generally require a large amount of boilerplate code or custom test functions. This module provides a fluent, easy to use and incredibly powerful framework on which extremely complex protocols can be tested.

## Example
All these things start out with an example of how you can use the test framework. The following is an example of using *node-conversation* with *Mocha*.

```js
var Conversation = require('conversation');

describe('protocol', function() {
	it('should forward messages to the correct user', function(done) {
		new Conversation({ port: 9119 })
			.client('u1').u1.sendAnd('LOGIN:user1;').expect('OK;')
			.client('u2').u2.sendAnd('LOGIN:user2;').expect('OK;')
			.client('u3').u3.sendAnd('LOGIN:user3;').expect('OK;')

			.u1.writeAnd('CHAT:user2:hello;').expect('SENT:1;')
			.u2.expect('MESSAGE:user1:hello;')
			.u1.read('RECEIVED:1;')

			.u2.writeAnd('CHAT:user3:hi;').read('SENT:2;')
			.u3.read('MESSAGE:user2:hi;')
			.u2.read('RECEIVED:2;')

			.run(done);
	});
});
```

## Extensibility
Due to its design, it is extremely easy to automate common testing tasks (for example, login processes) by adding to the `Conversation.prototype` or `Conversations.Client.prototype`. This can help make testing systems which require setup tasks to be performed considerably easier.