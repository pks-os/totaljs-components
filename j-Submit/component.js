COMPONENT('submit', 'delay:100;flags:visible;loading:1;default:1;messages:1;blocked:2000;newbie:n=>!n.id;selector:button[name="submit"];update_modified:1', function(self, config, cls) {

	var path, old, track, enter, elements = null;
	var flags = null;
	var tracked = false;
	var issending = false;
	var isdisabled = true;
	var reset = 0;
	var messages = {};

	self.readonly();

	self.make = function() {
		elements = self.find(config.selector);
		path = self.path.replace(/\.\*$/, '');

		if (config.enter) {
			enter = self.element.closest(config.enter);
			enter.on('keydown', self.onkeydown);
		}

		self.event('click', 'button[name]', function(e) {
			switch (this.name) {
				case 'submit':
					e.preventDefault();
					e.stopPropagation();
					self.submit();
					break;
				case 'reset':
					e.preventDefault();
					e.stopPropagation();
					self.reset();
					break;
			}
		});
	};

	self.reset = function() {
		if (!issending)
			config.default && DEFAULT(self.path + '__{}');
	};

	self.submit = function() {

		if (isdisabled || issending || BLOCKED(self.ID, config.blocked))
			return;

		var modified = MODIFIED(self.path);
		var data = CLONE(GETR(self.path));
		var isnewbie = config.newbie && FN(config.newbie)(data);
		var url = (isnewbie ? config.create : config.update) || config.url;

		if (!url)
			return;

		if (url.indexOf('{{') !== -1)
			url = Tangular.render(url, data);
		else if (url.indexOf('{') !== -1)
			url = url.arg(data);

		var model = data;

		config.prepare && SEEX(self.makepath(config.prepare), data, self.element);

		if (!data)
			return;

		issending = true;
		config.loading && SETTER('loading', 'show');
		config.sending && SEEX(self.makepath(config.sending), true, model, self.element);

		if (!isnewbie && url.indexOf('PATCH') !== -1 && config.update_modified) {
			var obj = {};
			for (var i = 0; i < modified.length; i++) {
				var key = modified[i].substring(self.path.length + 1);
				obj[key] = data[key];
			}
			data = obj;
		}

		AJAX(url + ' REPEAT', data, function(response, err) {

			model.response = data.response = response;
			config.loading && SETTER('loading', 'hide', 500);
			config.sending && SEEX(self.makepath(config.sending), false, model, self.element);
			issending = false;

			config.exec && SEEX(self.makepath(config.exec), response, self.element);
			SET(self.path + '.response', response);

			if (response instanceof Array || err) {

				if (err)
					response = [{ error: err + '' }];

				config.fail && SEEX(self.makepath(config.fail), response, self.element);
				var msg = [];
				for (var i = 0; i < response.length; i++)
					msg.push(response[i].error);
				config.messages && SETTER('message', 'warning', msg.join('<br />'));
			} else {
				self.rclass(cls + '-modified');
				response.success && config.done && SEEX(self.makepath(config.done), response, self.element);
				if (config.messages) {
					var msg = (isnewbie ? messages.create_success : messages.update_success) || messages.success;
					msg && SETTER('message', 'success', msg(model));
				}
				if (config.null)
					NULL(config.null);
				else if (config.default)
					DEFAULT(self.path + '__{}');
			}
		});
	};

	self.onkeydown = function(e) {
		if (e.which === 13)
			setTimeout2(self.ID, self.submit, self.delay + 50);
	};

	self.destroy = function() {
		enter && enter.off('keydown', self.onkeydown);
	};

	self.configure = function(key, value, init) {
		switch (key) {
			case 'selector':
				if (!init)
					elements = self.find(value);
				break;
			case 'flags':
				if (value) {
					flags = value.split(',');
					for (var i = 0; i < flags.length; i++)
						flags[i] = '@' + flags[i];
				} else
					flags = null;
				break;
			case 'track':
				track = value.split(',').trim();
				break;
			case 'create_success':
			case 'update_success':
			case 'success':
				messages[key] = Tangular.compile(value);
				break;
		}
	};

	self.setter = function(value, path, type) {

		var is = path === self.path || path.length < self.path.length;

		if (reset !== is) {
			reset = is;
			self.tclass(cls + '-modified', !reset);
		}

		if ((type === 1 || type === 2) && track && track.length) {
			for (var i = 0; i < track.length; i++) {
				if (path.indexOf(track[i]) !== -1) {
					tracked = 1;
					return;
				}
			}
			if (tracked === 1) {
				tracked = 2;
				setTimeout(function() {
					tracked = 0;
				}, config.delay * 3);
			}
		}
	};

	self.state = function(type, what) {
		if (type === 3 || what === 3)
			tracked = 0;
		setTimeout2(self.ID, function() {
			var disabled = tracked ? !VALID(path, flags) : DISABLED(path, flags);
			if (!disabled && config.if)
				disabled = !EVALUATE(self.path, config.if);
			if (disabled !== old) {
				elements.prop('disabled', disabled);
				self.tclass(cls + '-ok', !disabled);
				self.tclass(cls + '-no', disabled);
				old = disabled;
			}
			isdisabled = disabled;
		}, config.delay);
	};
});
