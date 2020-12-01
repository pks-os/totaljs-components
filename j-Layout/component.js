COMPONENT('layout', 'space:1;border:0;parent:window;margin:0;remember:1;autoresize:1', function(self, config, cls) {

	var cls2 = '.' + cls;
	var cache = {};
	var drag = {};
	var s = {};
	var events = {};
	var istop2 = false;
	var isbottom2 = false;
	var isright2 = false;
	var loaded = false;
	var resizecache = '';
	var settings;
	var prefkey = '';
	var prefexpire = '1 month';
	var isreset = false;
	var layout = null;

	self.readonly();

	self.init = function() {
		ON('resize2 + resize', function() {
			for (var i = 0; i < M.components.length; i++) {
				var com = M.components[i];
				if (com.name === 'layout' && com.dom.offsetParent && com.$ready && !com.$removed && com.config.autoresize)
					com.resize();
			}
		});
	};

	self.make = function() {

		self.aclass(cls);
		self.find('> section').each(function() {
			var el = $(this);
			var type = el.attrd('type');

			if (type.charAt(type.length - 1) === '2') {
				type = type.substring(0, type.length - 1);

				switch (type) {
					case 'top':
						istop2 = true;
						break;
					case 'bottom':
						isbottom2 = true;
						break;
					case 'right':
						isright2 = true;
						break;
				}
			}
			el.aclass(cls + '-' + type + ' hidden ui-layout-section');
			el.after('<div class="{0}-resize-{1} {0}-resize" data-type="{1}"></div>'.format(cls, type));
			el.after('<div class="{0}-lock hidden" data-type="{1}"></div>'.format(cls, type));
			s[type] = el;
		});

		self.find('> .{0}-resize'.format(cls)).each(function() {
			var el = $(this);
			s[el.attrd('type') + 'resize'] = el;
		});

		self.find('> .{0}-lock'.format(cls)).each(function() {
			var el = $(this);
			s[el.attrd('type') + 'lock'] = el;
		});

		var tmp = self.find('> script');
		if (tmp.length) {
			self.rebind(tmp.html(), true);
			tmp.remove();
		}

		events.bind = function() {
			var el = self.element;
			el.bind('mousemove', events.mmove);
			el.bind('mouseup', events.mup);
			el.bind('mouseleave', events.mup);
		};

		events.unbind = function() {
			var el = self.element;
			el.unbind('mousemove', events.mmove);
			el.unbind('mouseup', events.mup);
			el.unbind('mouseleave', events.mup);
		};

		events.mdown = function(e) {

			var target = $(e.target);
			var type = target.attrd('type');
			var w = self.width();
			var h = self.height();
			var m = 2; // size of line

			self.element.find('iframe').css('pointer-events', 'none');

			drag.cur = self.element.offset();
			drag.cur.top -= 10;
			drag.cur.left -= 8;
			drag.offset = target.offset();
			drag.el = target;
			drag.x = e.pageX;
			drag.y = e.pageY;
			drag.horizontal = type === 'left' || type === 'right' ? 1 : 0;
			drag.type = type;
			drag.plusX = 10;
			drag.plusY = 10;

			var ch = cache[type];
			var offset = 0;
			var min = ch.minsize ? (ch.minsize.value - 1) : 0;

			target.aclass(cls + '-drag');

			switch (type) {
				case 'top':
					drag.min = min || (ch.size - m);
					drag.max = (h - (cache.bottom ? s.bottom.height() : 0) - 50);
					break;
				case 'right':
					offset = w;
					drag.min = (cache.left ? s.left.width() : 0) + 50 + min;
					drag.max = offset - (min || ch.size);
					break;
				case 'bottom':
					offset = h;
					drag.min = (cache.top ? s.top.height() : 0) + 50;
					drag.max = offset - (min || ch.size);
					break;
				case 'left':
					drag.min = min || (ch.size - m);
					drag.max = w - (cache.right ? s.right.width() : 0) - 50;
					break;
			}

			events.bind();
		};

		events.mmove = function(e) {
			if (drag.horizontal) {
				var x = drag.offset.left + (e.pageX - drag.x) - drag.plusX - drag.cur.left;

				if (x < drag.min)
					x = drag.min + 1;

				if (x > drag.max)
					x = drag.max - 1;

				drag.el.css('left', x + 'px');

			} else {
				var y = drag.offset.top + (e.pageY - drag.y) - drag.plusY;

				if (y < drag.min)
					y = drag.min + 1;
				if (y > drag.max)
					y = drag.max - 1;

				drag.el.css('top', (y - drag.cur.top) + 'px');
			}
		};

		events.mup = function() {

			self.element.find('iframe').css('pointer-events', '');

			var offset = drag.el.offset();
			var d = WIDTH();
			var pk = prefkey + '_' + layout + '_' + drag.type + '_' + d;

			drag.el.rclass(cls + '-drag');

			if (drag.horizontal) {

				offset.left -= drag.cur.left;

				if (offset.left < drag.min)
					offset.left = drag.min;

				if (offset.left > drag.max)
					offset.left = drag.max;

				var w = offset.left - (drag.offset.left - drag.cur.left);

				if (!isright2 && drag.type === 'right')
					w = w * -1;

				drag.el.css('left', offset.left);
				w = s[drag.type].width() + w;
				s[drag.type].css('width', w);
				config.remember && PREF.set(pk, w, prefexpire);

			} else {

				offset.top -= drag.cur.top;

				if (offset.top < drag.min)
					offset.top = drag.min;
				if (offset.top > drag.max)
					offset.top = drag.max;

				drag.el.css('top', offset.top);

				var h = offset.top - (drag.offset.top - drag.cur.top);
				if (drag.type === 'bottom' || drag.type === 'preview')
					h = h * -1;

				h = s[drag.type].height() + h;
				s[drag.type].css('height', h);
				config.remember && PREF.set(pk, h, prefexpire);
			}

			events.unbind();
			self.refresh();
		};

		self.find('> ' + cls2 + '-resize').on('mousedown', events.mdown);
	};

	self.lock = function(type, b) {
		var el = s[type + 'lock'];
		el && el.tclass('hidden', b == null ? b : !b);
	};

	self.rebind = function(code, noresize) {
		code = code.trim();
		prefkey = 'L' + HASH(code);
		resizecache = '';
		settings = new Function('return ' + code)();
		!noresize && self.resize();
	};

	var getSize = function(display, data) {

		var obj = data[display];
		if (obj)
			return obj;

		switch (display) {
			case 'md':
				return getSize('lg', data);
			case 'sm':
				return getSize('md', data);
			case 'xs':
				return getSize('sm', data);
		}

		return data;
	};

	self.resize = function() {

		if (self.dom.offsetParent == null) {
			setTimeout(self.resize, 100);
			return;
		}

		if (settings == null)
			return;

		var d = WIDTH();
		var el = self.parent(config.parent);
		var width = el.width();
		var height = el.height();
		var key = d + 'x' + width + 'x' + height;

		if (resizecache === key)
			return;

		var tmp = layout ? settings[layout] : settings;

		if (tmp == null) {
			WARN('j-Layout: layout "{0}" not found'.format(layout));
			tmp = settings;
		}

		var size = getSize(d, tmp);
		var keys = Object.keys(s);

		height -= config.margin;
		resizecache = key;
		self.css({ width: width, height: height });

		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			el = s[key];
			self.update(key, size[key] ? size[key] : settings[key]);
		}

		config.resize && EXEC(config.resize, d, width, height);
	};

	var parseSize = function(val, size) {
		var str = typeof(val) === 'string';
		var obj = { raw : str ? val.parseFloat() : val, percentage: str ? val.charAt(val.length - 1) === '%' : false };
		obj.value = obj.percentage ? ((((size / 100) * obj.raw) >> 0) - config.space) : obj.raw;
		return obj;
	};

	self.reset = function() {
		isreset = true;
		resizecache = '';
		self.resize();
	};

	self.layout = function(name) {

		if (name == null)
			name = '';

		if (layout != name) {
			layout = name;
			resizecache = '';
			self.resize();
		}
	};

	self.update = function(type, opt) {

		if (opt == null)
			return;

		if (typeof(opt) === 'string')
			opt = opt.parseConfig();

		if (s[type] == null)
			return;

		var el = s[type];
		var css = {};
		var is = 0;
		var size = null;
		var d = WIDTH();

		var c = cache[type];
		if (c == null)
			c = cache[type] = {};

		var w = self.width();
		var h = self.height();
		var pk = prefkey + '_' + layout + '_' + type + '_' + d;
		var cached = PREF.get(pk, prefexpire);

		if (isreset) {
			cached && PREF.set(pk); // remove value
			cached = 0;
		}

		c.minsize = opt.minwidth ? parseSize(opt.minwidth, w) : opt.minsize ? parseSize(opt.minsize, w) : 0;

		var def = getSize(d, settings);
		var width = (opt.size || opt.width) || (def[type] ? def[type].width : 0);
		var height = (opt.size || opt.height) || (def[type] ? def[type].height : 0);

		if (width && (type === 'left' || type === 'right')) {
			size = parseSize(width, w);
			c.size = size.value;
			css.width = cached ? cached : size.value;
			is = 1;
		}

		c.minsize = opt.minheight ? parseSize(opt.minheight, w) : opt.minsize ? parseSize(opt.minsize, w) : 0;
		if (height && (type === 'top' || type === 'bottom')) {
			size = parseSize(height, h);
			c.size = size.value;
			css.height = (cached ? cached : size.value);
			is = 1;
		}

		if (opt.show == null)
			opt.show = true;

		el.tclass('hidden', !opt.show);
		c.show = !!opt.show;
		c.resize = opt.resize == null ? false : !!opt.resize;
		el.tclass(cls + '-resizable', c.resize);
		s[type + 'resize'].tclass('hidden', !c.show || !c.resize);

		is && el.css(css);
		setTimeout2(self.ID + 'refresh', self.refresh, 50);
	};

	var getWidth = function(el) {
		return el.hclass('hidden') ? 0 : el.width();
	};

	var getHeight = function(el) {
		return el.hclass('hidden') ? 0 : el.height();
	};

	self.refresh = function() {

		var top = 0;
		var bottom = 0;
		var right = 0;
		var left = 0;
		var hidden = 'hidden';
		var top2 = 0;
		var bottom2 = 0;
		var space = 2;
		var topbottomoffset = 0;
		var right2visible = isright2 && !s.right.hclass(hidden);

		if (s.top)
			top = top2 = getHeight(s.top);

		if (s.bottom)
			bottom = bottom2 = getHeight(s.bottom);

		var width = self.width() - (config.border * 2);
		var height = self.height() - (config.border * 2);

		if (istop2) {
			topbottomoffset++;
			top2 = 0;
		}

		if (isbottom2) {
			topbottomoffset--;
			bottom2 = 0;
		}

		if (s.left && !s.left.hclass(hidden)) {
			var cssleft = {};
			space = top && bottom ? 2 : top || bottom ? 1 : 0;
			cssleft.left = 0;
			cssleft.top = istop2 ? config.border : (top ? (top + config.space) : 0);
			cssleft.height = isbottom2 ? (height - top2 - config.border) : (height - top2 - bottom2 - (config.space * space));
			cssleft.height += topbottomoffset;
			s.left.css(cssleft);
			cssleft.width = s.left.width();
			s.leftlock.css(cssleft);
			delete cssleft.width;
			left = s.left.width();
			cssleft.left = s.left.width();
			s.leftresize.css(cssleft);
			s.leftresize.tclass(hidden, !s.left.hclass(cls + '-resizable'));
		}

		if (s.right && !s.right.hclass(hidden)) {
			right = s.right.width();
			space = top && bottom ? 2 : top || bottom ? 1 : 0;
			var cssright = {};
			cssright.left = right2visible ? (getWidth(s.left) + config.border + config.space) : (width - right);
			cssright.top = istop2 ? config.border : (top ? (top + config.space) : 0);
			cssright.height = isbottom2 ? (height - top2 - config.border) : (height - top2 - bottom2 - (config.space * space));
			cssright.height += topbottomoffset;

			s.right.css(cssright);
			cssright.width = s.right.width();

			if (!isright2 && (cssright.left - cssright.width) <= 0) {
				s.right.css('left', 0);
				cssright.width++;
			}

			s.rightlock.css(cssright);
			delete cssright.width;

			if (right2visible)
				cssright.left += s.right.width();
			else
				cssright.left = width - right - 2;

			s.rightresize.css(cssright);
			s.rightresize.tclass(hidden, !s.right.hclass(cls + '-resizable'));
		}

		if (s.top) {
			var csstop = {};
			space = left ? config.space : 0;
			csstop.left = istop2 ? (left + space) : 0;

			if (right2visible && istop2)
				csstop.left += getWidth(s.right) + config.space;

			space = left && right ? 2 : left || right ? 1 : 0;
			csstop.width = istop2 ? (width - right - left - (config.space * space)) : width;
			csstop.top = 0;
			s.top.css(csstop);
			s.topresize.css(csstop);
			csstop.height = s.top.height();
			s.toplock.css(csstop);
			delete csstop.height;
			csstop.top = s.top.height();
			s.topresize.css(csstop);
			s.topresize.tclass(hidden, !s.top.hclass(cls + '-resizable'));
		}

		if (s.bottom) {
			var cssbottom = {};
			cssbottom.top = height - bottom;
			space = left ? config.space : 0;
			cssbottom.left = isbottom2 ? (left + space) : 0;

			if (right2visible && isbottom2)
				cssbottom.left += getWidth(s.right) + config.space;

			space = left && right ? 2 : left || right ? 1 : 0;
			cssbottom.width = isbottom2 ? (width - right - left - (config.space * space)) : width;
			s.bottom.css(cssbottom);
			cssbottom.height = s.bottom.height();
			s.bottomlock.css(cssbottom);
			delete cssbottom.height;
			cssbottom.top = cssbottom.top - 2;
			s.bottomresize.css(cssbottom);
			s.bottomresize.tclass(hidden, !s.bottom.hclass(cls + '-resizable'));
		}

		var space = left && right ? 2 : left ? 1 : right ? 1 : 0;
		var css = {};
		css.left = left ? left + config.space : 0;

		if (right2visible)
			css.left += getWidth(s.right) + config.space;

		css.width = (width - left - right - (config.space * space));
		css.top = top ? top + config.space : 0;

		space = top && bottom ? 2 : top || bottom ? 1 : 0;
		css.height = height - top - bottom - (config.space * space);

		s.main && s.main.css(css);
		s.mainlock && s.mainlock.css(css);

		self.element.SETTER('*', 'resize');

		if (loaded == false) {
			loaded = true;
			self.rclass('invisible');
		}

		isreset = false;
	};

	self.setter = function(value) {
		self.layout(value);
	};

});