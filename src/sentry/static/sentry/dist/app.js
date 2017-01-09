app = window.app = {
    config: {},
    templates: {},
    utils: {}
};

(function(app, Backbone){
    "use strict";

    app.models = {};

    app.models.Group = Backbone.Model.extend({

        defaults: {
            count: 0,
            version: 0,
            annotations: [],
            tags: [],
            hasSeen: false,
            isBookmarked: false,
            historicalData: []
        }

    });

}(app, Backbone));

(function(app){
    "use strict";

    app.templates = {
        group: '' +
            '<div class="count" data-count="<%= app.utils.formatNumber(count) %>">' +
                '<span title="<%= count %>"><%= app.utils.formatNumber(count) %></span>' +
            '</div>' +
            '<div class="details">' +
                '<h3><a href="<%= permalink %>"><%= title %></a></h3>' +
                '<p class="message">' +
                    '<%= message %>' +
                '</p>' +
                '<div class="meta">' +
                    '<% $.each(annotations, function(_, tag) { %>' +
                    '<span class="tag annotation" data-tag="<%= tag.label %>" data-count="<%= app.utils.formatNumber(tag.count) %>">' +
                        '<i><%= tag.label %></i>' +
                        '<span title="<%= count %>"><%= app.utils.formatNumber(tag.count) %></span>' +
                    '</span>' +
                    '<% }) %>' +
                    '<span class="last-seen pretty-date"></span>' +
                    '<% if (timeSpent) { %>' +
                        '<span class="tag time-spent"><%= Math.round(timeSpent) %>ms</span>' +
                    '<% } %>' +
                    '<span class="tag tag-project">' +
                        '<a href="<%= projectUrl %>"><%= project.name %></a>' +
                    '</span>' +
                    '<span class="tag tag-logger">' +
                        '<a href="<%= loggerUrl %>"><%= logger %></a>' +
                    '</span>' +
                    '<% _.each(tags, function(tag){ %> ' +
                        '<span class="tag"><%= tag %></span>' +
                    '<% }) %>' +
                '</div>' +
                '<span class="sparkline"></span>' +
                '<ul class="actions">' +
                    '<% if (canResolve) { %>' +
                        '<li>' +
                            '<a href="#" data-action="resolve">' +
                                '<i aria-hidden="true" class="icon-checkmark"></i>' +
                            '</a>' +
                        '</li>' +
                        '<li>' +
                            '<a href="#" data-action="bookmark" class="bookmark">' +
                                '<i aria-hidden="true" class="icon-star"></i>' +
                            '</a>' +
                        '</li>' +
                    '<% } %>' +
                '</ul>' +
            '</div>'
    };
}(app));

(function(app, jQuery, _, moment){
    "use strict";

    var $ = jQuery;
    var number_formats = [
        [1000000000, 'b'],
        [1000000, 'm'],
        [1000, 'k']
    ];

    app.utils = {
        getQueryParams: function() {

            var vars = {},
                href = window.location.href,
                hashes, hash;

            if (href.indexOf('?') == -1)
                return vars;

            hashes = href.slice(href.indexOf('?') + 1, (href.indexOf('#') != -1 ? href.indexOf('#') : href.length)).split('&');
            $.each(hashes, function(_, chunk){
                hash = chunk.split('=');
                if (!hash[0] && !hash[1])
                    return;

                vars[decodeURIComponent(hash[0])] = (hash[1] ? decodeURIComponent(hash[1]).replace(/\+/, ' ') : '');
            });

            return vars;
        },

        floatFormat: function(number, places){
            var multi = Math.pow(10, places);
            return parseInt(number * multi, 10) / multi;
        },

        formatNumber: function(number){
            var b, x, y, o, p;

            number = parseInt(number, 10);

            for (var i=0; (b=number_formats[i]); i++){
                x = b[0];
                y = b[1];
                o = Math.floor(number / x);
                p = number % x;
                if (o > 0) {
                    if (o / 10 > 1 || !p)
                        return '' + o + y;
                    return '' + this.floatFormat(number / x, 1) + y;
                }
            }
            return '' + number;
        },

        slugify: function(str) {
            str = str.replace(/^\s+|\s+$/g, ''); // trim
            str = str.toLowerCase();

            // remove accents, swap ñ for n, etc
            var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
            var to   = "aaaaeeeeiiiioooouuuunc------";
            for (var i=0, l=from.length ; i<l ; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }

            str = str.replace(/[^a-z0-9\s\-]/g, '') // remove invalid chars
                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                .replace(/-+/g, '-'); // collapse dashes

            return str;
        },

        varToggle: function(link, $elm) {
            var $link = $(link);

            // assume its collapsed by default
            if (!$link.attr('data-expand-label'))
                $link.attr('data-expand-label', $link.html());

            $elm.toggle();
            if ($elm.is(':visible'))
                $link.html($link.attr('data-collapse-label'));
            else
                $link.html($link.attr('data-expand-label'));
        },

        getSearchUsersUrl: function(){
            return app.config.urlPrefix + '/api/' + app.config.organizationId + '/users/search/';
        },

        getSearchProjectsUrl: function(){
            return app.config.urlPrefix + '/api/' + app.config.organizationId + '/projects/search/';
        },

        getSearchTagsUrl: function(){
            return app.config.urlPrefix + '/api/' + app.config.organizationId + '/' + app.config.projectId + '/tags/search/';
        },

        makeSearchableInput: function(el, url, callback, options) {
            $(el).select2($.extend({
                allowClear: true,
                width: 'element',
                initSelection: function (el, callback) {
                    var $el = $(el);
                    callback({id: $el.val(), text: $el.val()});
                },
                ajax: {
                    url: url,
                    dataType: 'json',
                    data: function (term, page) {
                        return {
                            query: term,
                            limit: 10
                        };
                    },
                    results: function(data, page) {
                        var results = callback(data);
                        return {results: callback(data)};
                    }
                }
            }, options || {}));
        },

        escape: function(str) {
            return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        },

        makeSearchableUsersInput: function(el) {
            this.makeSearchableInput(el, this.getSearchUsersUrl(), _.bind(function(data){
                var results = [];
                $(data.results).each(_.bind(function(_, val){
                    var label;
                    if (val.first_name) {
                        label = this.escape(val.first_name) + ' &mdash; ' + this.escape(val.username);
                    } else {
                        label = this.escape(val.username);
                    }
                    label += '<br>' + this.escape(val.email);
                    results.push({
                        id: val.username,
                        text: label
                    });
                }, this));

                if (data.query && $(results).filter(function(){
                    return this.id.localeCompare(data.query) === 0;
                }).length === 0) {
                    results.push({
                        id: this.escape(data.query),
                        text: this.escape(data.query)
                    });
                }

                return results;
            }, this), {
                escapeMarkup: function(s) { return s; }
            });
        },

        parseLinkHeader: function(header) {
          if (header === null) {
            return {};
          }

          var header_vals = header.split(','),
              links = {};

          $.each(header_vals, function(_, val){
              var match = /<([^>]+)>; rel="([^"]+)"/g.exec(val);

              links[match[2]] = match[1];
          });

          return links;
        },

    };

    $(function(){
        // Change all select boxes to select2 elements.
        $('.body select').each(function(){
            var $this = $(this),
                options = {
                    width: 'element',
                    allowClear: false,
                    minimumResultsForSearch: 10
                };

            if ($this.attr('data-allowClear')) {
                options.allowClear = $this.attr('data-allowClear');
            }

            $this.select2(options);
        });

        // Update date strings periodically
        setInterval(function() {
            $('.pretty-date').each(function(_, el){
                var $el = $(el);
                var dt = $el.data('datetime');
                if (dt) {
                    var date = moment(dt);
                    if (date) {
                        $el.text(date.fromNow());
                        $el.attr('title', date.format('llll'));
                    }
                }
            });
        }, 5000);
    });

}(app, jQuery, _, moment));

(function(app, Backbone){
    "use strict";

    app.ScoredList = Backbone.Collection.extend({
        comparator: function(member){
            return -member.get('score');
        }
    });
}(app, Backbone));

/*global Sentry:true*/

(function(app, Backbone, jQuery, moment){
    "use strict";

    var $ = jQuery;

    app.charts = {

        render: function(el, options) {
            var $el = $(el);
            var url = $el.attr('data-api-url');
            var title = $(el).attr('data-title');
            var $spark = $el.find('.sparkline');

            $spark.height($el.height());

            $.ajax({
                url: $el.attr('data-api-url'),
                type: 'get',
                dataType: 'json',
                data: {
                    since: new Date().getTime() / 1000 - 3600 * 24,
                    resolution: '1h'
                },
                success: function(resp) {
                    var data = [], maxval = 10;
                    $spark.empty();
                    $.each(resp, function(_, val){
                        var date = new Date(val[0] * 1000);
                        data.push({
                            y: val[1],
                            label: moment(date).fromNow()
                        });
                        if (val[1] > maxval) {
                            maxval = val[1];
                        }
                    });
                    app.charts.createSparkline($spark, data, options);
                }
            });
        },

        createSparkline: function(el, points, options){
            // TODO: maxval could default to # of hours since first_seen / times_seen
            var $el = $(el),
                existing = $el.children(),
                maxval = 10,
                title, point, pct, child, point_width;

            if (options === undefined) {
                options = {};
            }

            for (var i=0; i<points.length; i++) {
                point = points[i];
                if (typeof(point) === "number") {
                    point = points[i] = {
                        y: point
                    };
                }
                if (point.y > maxval) {
                    maxval = point.y;
                }
            }

            point_width = app.utils.floatFormat(100.0 / points.length, 2) + '%';

            // TODO: we should only remove nodes that are no longer valid
            for (i=0; i<points.length; i++) {
                point = points[i];
                pct = app.utils.floatFormat(point.y / maxval * 99, 2) + '%';
                title = point.y + ' events';
                if (point.label) {
                    title = title + '<br>(' + point.label + ')';
                }
                if (existing.get(i) === undefined) {
                    $('<a style="width:' + point_width + ';" rel="tooltip" title="' + title + '"><span style="height:' + pct + '">' + point.y + '</span></a>').tooltip({
                        placement: options.placement || 'bottom',
                        html: true,
                        container: 'body'
                    }).appendTo($el);
                } else {
                    $(existing[i]).find('span').css('height', pct).text(point.y).attr('title', (point.label || point.y));
                }
            }
        }

    };
}(app, Backbone, jQuery, moment));

(function(window, app, Backbone, jQuery, _, moment){
    "use strict";

    var $ = jQuery;

    app.GroupView = Backbone.View.extend({
        tagName: 'li',
        className: 'group',
        template: _.template(app.templates.group),

        initialize: function(){
            Backbone.View.prototype.initialize.apply(this, arguments);

            _.bindAll(this, 'updateCount', 'updateAllAnnotations', 'updateAnnotation', 'updateLastSeen',
                'updateResolved', 'updateHasSeen', 'renderSparkline', 'updateBookmarked',
                'render');

            this.model.on({
                'change:count': this.updateCount,
                'change:annotations': this.updateAllAnnotations,
                'change:lastSeen': this.updateLastSeen,
                'change:isBookmarked': this.updateBookmarked,
                'change:isResolved': this.updateResolved,
                'change:hasSeen': this.updateHasSeen,
                'change:historicalData': this.renderSparkline
            }, this);
        },

        render: function(){
            var data = this.model.toJSON();
            data.projectUrl = app.config.urlPrefix + '/' + app.config.organizationId +
                '/' + data.project.slug + '/';
            data.loggerUrl = data.projectUrl + '?logger=' + data.logger;

            this.$el.html(this.template(data));
            this.$el.attr('data-id', this.model.id);
            this.$el.addClass(this.getLevelClassName());
            this.$el.find('a[data-action=resolve]').click(_.bind(function(e){
                e.preventDefault();
                if (this.model.get('isResolved')) {
                    this.unresolve();
                } else {
                    this.resolve();
                }
            }, this));
            this.$el.find('a[data-action=bookmark]').click(_.bind(function(e){
                e.preventDefault();
                this.bookmark();
            }, this));
            this.updateLastSeen();
            this.renderSparkline();
            this.updateResolved();
            this.updateHasSeen();
            this.updateBookmarked();
        },

        updateBookmarked: function(){
            if (this.model.get('isBookmarked')) {
                this.$el.find('a[data-action=bookmark]').addClass('checked');
            } else {
                this.$el.find('a[data-action=bookmark]').removeClass('checked');
            }
        },

        updateResolved: function(){
            if (this.model.get('isResolved')) {
                this.$el.addClass('resolved');
            } else {
                this.$el.removeClass('resolved');
            }
        },

        updateHasSeen: function(){
            if (this.model.get('hasSeen')) {
                this.$el.addClass('seen');
            } else {
                this.$el.removeClass('seen');
            }
        },

        renderSparkline: function(obj){
            var data = this.model.get('historicalData');
            if (!data || !data.length)
                return;

            this.$el.addClass('with-sparkline');

            app.charts.createSparkline(this.$el.find('.sparkline'), data);
        },

        resolve: function(){
            $.ajax({
                url: this.getResolveUrl(),
                type: 'post',
                dataType: 'json',
                success: _.bind(function(response) {
                    this.model.set('version', response.version + 5000);
                    this.model.set('isResolved', true);
                }, this)
            });
        },

        unresolve: function(){
            $.ajax({
                url: this.getUnresolveUrl(),
                type: 'post',
                dataType: 'json',
                success: _.bind(function(response) {
                    this.model.set('version', response.version + 5000);
                    this.model.set('isResolved', false);
                }, this)
            });
        },

        getResolveUrl: function(){
            return app.config.urlPrefix + '/api/' + app.config.organizationId + '/' +
                    app.config.projectId + '/group/' + this.model.get('id') +
                    '/set/resolved/';
        },

        getUnresolveUrl: function(){
            return app.config.urlPrefix + '/api/' + app.config.organizationId + '/' +
                    app.config.projectId + '/group/' + this.model.get('id') +
                    '/set/unresolved/';
        },

        getBookmarkUrl: function(){
            return app.config.urlPrefix + '/api/' + app.config.organizationId + '/' + app.config.projectId + '/bookmark/';
        },

        bookmark: function(){
            $.ajax({
                url: this.getBookmarkUrl(),
                type: 'post',
                dataType: 'json',
                data: {
                    gid: this.model.get('id')
                },
                success: _.bind(function(response){
                    this.model.set('version', response.version);
                    this.model.set('isBookmarked', response.isBookmarked);
                }, this)
            });
        },

        getLevelClassName: function(){
            return 'level-' + this.model.get('levelName');
        },

        updateLastSeen: function(){
            var dt = moment(this.model.get('lastSeen'));
            this.$el.find('.last-seen')
                .text(dt.fromNow())
                .data('datetime', this.model.get('lastSeen'))
                .attr('title', dt.format('llll'));
        },

        updateCount: function(){
            var new_count = app.utils.formatNumber(this.model.get('count'));
            var counter = this.$el.find('.count');
            var digit = counter.find('span');

            if (digit.is(':animated'))
                return false;

            if (counter.data('count') == new_count) {
                // We are already showing this number
                return false;
            }

            counter.data('count', new_count);

            var replacement = $('<span></span>', {
                css: {
                    top: '-2.1em',
                    opacity: 0
                },
                text: new_count
            });

            // The .static class is added when the animation
            // completes. This makes it run smoother.

            digit.before(replacement).animate({
                top: '2.5em',
                opacity: 0
            }, 'fast', function(){
                digit.remove();
            });

            replacement.delay(100).animate({
                top: 0,
                opacity: 1
            }, 'fast');
        },

        updateAnnotation: function(annotation){
            var value = annotation.count;
            if (value === null)
                return;
            var new_count = app.utils.formatNumber(value);
            var counter = this.$el.find('.annotation[data-tag="' + annotation.label + '"]');
            var digit = counter.find('span');

            if (digit.is(':animated'))
                return false;

            if (counter.data('count') == new_count) {
                // We are already showing this number
                return false;
            }

            counter.data('count', new_count);

            var replacement = $('<span></span>', {
                css: {
                    top: '-2.1em',
                    opacity: 0
                },
                text: new_count
            });

            // The .static class is added when the animation
            // completes. This makes it run smoother.

            digit.before(replacement).animate({
                top: '2.5em',
                opacity: 0
            }, 'fast', function(){
                digit.remove();
            });

            replacement.delay(100).animate({
                top: 0,
                opacity: 1
            }, 'fast');
        },

        updateAllAnnotations: function(){
            var self = this;
            $.each(this.model.get('annotations'), function(index, annotation){
                self.updateAnnotation(annotation);
            });
        }

    });

    app.OrderedElementsView = Backbone.View.extend({

        loadingMessage: '<p>Loading...</p>',
        model: app.models.Group,

        defaults: {
            emptyMessage: '<p>There is no data to show.</p>',
            maxItems: 50,
            view: Backbone.View
        },

        initialize: function(data){
            if (_.isUndefined(data))
                data = {};

            var members = data.members;

            Backbone.View.prototype.initialize.apply(this, arguments);

            this.options = $.extend({}, this.defaults, this.options, data);

            this.$wrapper = $('#' + this.id);
            this.$parent = $('<ul></ul>');
            this.$empty = $('<li class="empty"></li>');
            this.$wrapper.html(this.$parent);

            if (this.options.className)
                this.$parent.addClass(this.options.className);

            _.bindAll(this, 'renderMemberInContainer', 'unrenderMember', 'reSortMembers');

            this.collection = new app.ScoredList([], {
                model: data.model
            });
            this.collection.on('add', this.renderMemberInContainer, this);
            this.collection.on('remove', this.unrenderMember, this);
            this.collection.on('reset', this.reSortMembers, this);

            delete data.members;

            this.reset(members);
        },

        reset: function(members){
            this.$parent.empty();
            this.setEmpty();

            if (members === undefined) {
                this.$empty.html(this.loadingMessage);
                this.collection.reset();
                this.setEmpty();
                this.loaded = false;
            } else {
                this.$empty.html(this.options.emptyMessage);
                this.collection.reset(members);
                this.loaded = true;
            }
        },

        setEmpty: function(){
            this.$parent.html(this.$empty);
        },

        extend: function(data){
            for (var i=0; i<data.length; i++) {
                this.addMember(data[i]);
            }
        },

        addMember: function(member){
            var existing = this.collection.get(member.id);

            function getAttr(x) {
                if (typeof member.get === 'function') {
                    return member.get(x);
                } else {
                    return member[x];
                }
            }
            if (!existing) {
                if (this.collection.length >= this.options.maxItems) {
                    // bail early if the score is too low
                    if (getAttr('score') < this.collection.last().get('score'))
                        return;

                    // make sure we limit the number shown
                    while (this.collection.length >= this.options.maxItems)
                        this.collection.pop();
                }
            } else if (existing.get('version') >= (getAttr('version') || 0)) {
                return;
            }
            this.collection.add(member, {merge: true});
        },

        reSortMembers: function(){
            this.collection.each(_.bind(function(member){
                this.renderMemberInContainer(member);
            }, this));
        },

        updateMember: function(member, options){
            if (_.isUndefined(options))
                options = {};

            var existing = this.collection.get(member.id);
            if (existing.get('version') >= member.get('version'))
                return;

            this.collection.add(member, {
                merge: true,
                sort: options.sort !== false ? true : false
            });

        },

        hasMember: function(member){
            return (this.collection.get(member.id) ? true : false);
        },

        removeMember: function(member){
            this.collection.remove(member);
        },

        renderMemberInContainer: function(member){
            var new_pos = this.collection.indexOf(member),
                $el, $rel;

            this.$parent.find('li.empty').remove();

            $el = $('#' + this.id + member.id);

            if (!$el.length) {
                // create the element if it does not yet exist
                $el = this.renderMember(member);
            } else if ($el.index() === new_pos) {
                // if the row was already present, ensure it moved
                return;
            }

            // top item
            if (new_pos === 0) {
                this.$parent.prepend($el);
            } else {
                // find existing item at new position
                $rel = $('#' + this.id + this.collection.at(new_pos).id);
                if (!$rel.length) {
                    this.$parent.append($el);
                } else if ($el.id !== $rel.id) {
                    // TODO: why do we get here?
                    $el.insertBefore($rel);
                } else {

                    return;
                }
            }

            if (this.loaded)
                $el.css('background-color', '#eee').animate({backgroundColor: '#fff'}, 300);
        },

        renderMember: function(member){
            var view = new this.options.view({
                model: member,
                id: this.id + member.id
            });
            view.render();
            return view.$el;
        },

        unrenderMember: function(member){
            this.$parent.find('#' + this.id + member.id).remove();
            if (!this.$parent.find('li').length)
                this.setEmpty();
        }

    });


    app.GroupListView = app.OrderedElementsView.extend({

        defaults: {
            emptyMessage: '<p>There is no data to show.</p>',
            maxItems: 50,
            realtime: false,
            stream: false,
            pollUrl: null,
            pollTime: 1000,
            tickTime: 100
        },

        initialize: function(data){
            if (_.isUndefined(data))
                data = {};

            data.model = app.models.Group;
            data.view = app.GroupView;

            app.OrderedElementsView.prototype.initialize.call(this, data);

            this.options = $.extend({}, this.defaults, this.options, data);

            this.queue = new app.ScoredList([], {
                model: data.model
            });

            this.cursor = null;

            _.bindAll(this, 'poll', 'pollSuccess', 'pollFailure', 'tick');

            this.poll();

            window.setInterval(this.tick, this.options.tickTime);
        },

        tick: function(){
            if (!this.queue.length)
                return;

            var item = this.queue.pop();
            if (this.options.canStream){
                this.addMember(item);
            } else if (this.hasMember(item)) {
                this.updateMember(item, {
                    sort: false
                });
            }
        },

        pollSuccess: function(groups, _, jqXHR){
            if (!groups.length)
                return window.setTimeout(this.poll, this.options.pollTime * 5);

            var links = app.utils.parseLinkHeader(jqXHR.getResponseHeader('Link'));

            this.options.pollUrl = links.previous;

            this.queue.add(groups, {merge: true});

            window.setTimeout(this.poll, this.options.pollTime);
        },

        pollFailure: function(jqXHR, textStatus, errorThrown){
            // if an error happened lets give the server a bit of time before we poll again
            window.setTimeout(this.poll, this.options.pollTime * 10);
        },

        poll: function(){
            var data;

            if (!this.options.realtime || !this.options.pollUrl)
                return window.setTimeout(this.poll, this.options.pollTime);

            data = app.utils.getQueryParams();
            data.cursor = this.cursor || undefined;

            $.ajax({
                url: this.options.pollUrl,
                type: 'GET',
                dataType: 'json',
                data: data,
                success: this.pollSuccess,
                error: this.pollFailure
            });
        }

    });

}(window, app, Backbone, jQuery, _, moment));

/*global Sentry:true*/

(function(window, app, Backbone, jQuery, _){
    "use strict";

    var $ = jQuery;
    var BasePage = Backbone.View.extend({

        defaults: {
            // can this view stream updates?
            canStream: false,
            // should this view default to streaming updates?
            realtime: false
        },

        initialize: function(data){
            Backbone.View.prototype.initialize.apply(this, arguments);

            if (_.isUndefined(data))
                data = {};

            this.options = $.extend({}, this.defaults, this.options, data);

            this.views = {};
            this.initializeAjaxTabs();
        },

        initializeAjaxTabs: function(){
            $('a[data-toggle=ajtab]').click(_.bind(function(e){
                var $tab = $(e.target),
                    uri = $tab.attr('data-uri'),
                    view_id = $tab.attr('href').substr(1),
                    view = this.getView(view_id, uri),
                    $cont, $parent;

                e.preventDefault();

                if (!uri)
                    return view.reset();

                $cont = $('#' + view_id);
                $parent = $cont.parent();
                $parent.css('opacity', 0.6);

                $.ajax({
                    url: uri,
                    dataType: 'json',
                    success: function(data){
                        view.reset(data);
                        $parent.css('opacity', 1);
                        $tab.tab('show');
                    },
                    error: function(){
                        $cont.html('<p>There was an error fetching data from the server.</p>');
                    }
                });
            }, this));

            // initialize active tabs
            $('li.active a[data-toggle=ajtab]').click();
        },

        makeDefaultView: function(id){
            return new app.GroupListView({
                emptyMessage: '<p>There are no events to show.</p>',
                className: 'group-list small',
                id: id,
                maxItems: 5,
                stream: this.options.stream,
                realtime: this.options.realtime,
                model: app.models.Group,
            });
        },

        getView: function(id, uri){
            if (!this.views[id])
                this.views[id] = this.makeDefaultView(id);
            var view = this.views[id];
            view.options.pollUrl = uri;
            return view;
        }

    });

    app.StreamPage = BasePage.extend({

        initialize: function(data){
            BasePage.prototype.initialize.apply(this, arguments);

            this.group_list = new app.GroupListView({
                className: 'group-list',
                id: 'event_list',
                members: data.groups,
                maxItems: 50,
                realtime: ($.cookie('pausestream') ? false : true),
                canStream: this.options.canStream,
                pollUrl: app.config.urlPrefix + '/api/' + app.config.organizationId + '/' + app.config.projectId + '/poll/',
                model: app.models.Group,
                emptyMessage: $('#empty_message').html()
            });

            this.control = $('a[data-action=pause]');
            this.updateStreamOptions();
            this.initFilters();

            this.control.click(_.bind(function(e){
                e.preventDefault();
                this.options.realtime = this.group_list.options.realtime = this.control.hasClass('realtime-pause');
                this.updateStreamOptions();
            }, this));

            $('#chart').height('50px');
            app.charts.render('#chart', {
                placement: 'left'
            });
        },

        initFilters: function(){
            $('.filter').each(_.bind(function(_, el){
                var $filter = $(el);
                var $input = $filter.find('input[type=text]');
                if ($input.length > 0) {
                    $input.select2({
                        initSelection: function (el, callback) {
                            var $el = $(el);
                            callback({id: $el.val(), text: $el.val()});
                        },
                        allowClear: true,
                        minimumInputLength: 3,
                        ajax: {
                            url: app.utils.getSearchTagsUrl(),
                            dataType: 'json',
                            data: function (term, page) {
                                return {
                                    query: term,
                                    quietMillis: 300,
                                    name: $input.attr('name'),
                                    limit: 10
                                };
                            },
                            results: function (data, page) {
                                var results = [];
                                $(data.results).each(function(_, val){
                                    results.push({
                                        id: app.utils.escape(val),
                                        text: app.utils.escape(val)
                                    });
                                });
                                return {results: results};
                            }
                        }
                    });
                } else {
                    $input = $filter.find('select').select2({
                        allowClear: true
                    });
                }
                if ($input.length > 0) {
                    $input.on('change', function(e){
                        var query = app.utils.getQueryParams();
                        query[e.target.name] = e.val;
                        window.location.href = '?' + $.param(query);
                    });
                }
            }, this));
        },

        updateStreamOptions: function(){
            if (this.options.realtime){
                $.removeCookie('pausestream');
                this.control.removeClass('realtime-pause');
                this.control.addClass('realtime-play');
                this.control.html(this.control.attr('data-pause-label'));
            } else {
                $.cookie('pausestream', '1', {expires: 7});
                this.control.addClass('realtime-pause');
                this.control.removeClass('realtime-play');
                this.control.html(this.control.attr('data-play-label'));
            }
        }

    });

    app.DashboardPage = BasePage.extend({

        initialize: function(data){
            BasePage.prototype.initialize.apply(this, arguments);

            $('#chart').height('150px');
            Sentry.charts.render('#chart');
        }

    });

    app.GroupDetailsPage = BasePage.extend({

        initialize: function(data){
            BasePage.prototype.initialize.apply(this, arguments);

            this.group_list = new app.GroupListView({
                className: 'group-list',
                id: 'event_list',
                members: [data.group],
                model: app.models.Group
            });

            $('#chart').height('150px');
            Sentry.charts.render('#chart');

            $('.share-link').popover({
                html: true,
                placement: 'left',
                container: document.body,
                title: 'Share Event',
                content: function(){
                    var $this = $(this);
                    var $content = $('<form class="share-form"></form>');
                    var $urlel = $('<code class="clippy">' + $this.data('share-url') + '</code>');
                    var isChecked = $this.data('public');

                    $urlel.clippy({
                        clippy_path: app.config.clippyPath,
                        keep_text: true
                    });
                    $content.append($urlel);
                    $content.append($('<label class="checkbox">' +
                        '<input type="checkbox"' + (isChecked ? ' checked="checked"' : '') + '/>' +
                        'Allow anonymous users to view this event.' +
                    '</label>'));

                    var $checkbox = $content.find('input[type=checkbox]').change(function(){
                        var url = $this.data($(this).is(':checked') ? 'public-url' : 'private-url');
                        $.ajax({
                            url: url,
                            type: 'post',
                            success: function(group){
                                $this.data('public', group.isPublic);
                            },
                            error: function(){
                                window.alert('There was an error changing the public status');
                            }
                        });
                    });

                    return $content;
                }
            });

            $('.add-note-btn').click(function(e){
                var $el = $(this),
                    $form = $('.add-note-form', $el.parent());

                e.preventDefault();

                if ($el.hasClass('selected')) {
                    $el.removeClass('selected');
                    $form.addClass('hide');
                } else {
                    $el.addClass('selected');
                    $form.removeClass('hide');
                    $form.find('textarea:first').focus();
                }
            });

            $('.add-note-form').submit(function(el){
                var $this = $(this);
                $this.find('button[type=submit]').attr('disabled', true).addClass('disabled');
                $this.find('textarea').addClass('disabled');
            });

            $('.tag-widget').each(function(){
                var $widget = $(this);
                $.ajax({
                    url: $widget.data('url'),
                    error: function() {
                        $widget.find('.loading').remove();
                        $widget.append($('<li class="error">Unable to load tag information</li>'));
                    },
                    success: function(data) {
                        var total = data.total,
                            eTagName = encodeURIComponent(data.name);

                        $widget.find('.loading').remove();
                        if (total === 0) {
                            $widget.append($('<li>No data available.</li>'));
                        } else {
                            $.each(data.values, function(_, item){
                                var tagValue = item.value,
                                    timesSeen = item.count,
                                    tagLabel = app.utils.escape(item.label || item.value),
                                    percent = parseInt(timesSeen / total * 100, 10),
                                    url = app.config.urlPrefix + '/' + app.config.organizationId + '/' + app.config.projectId + '/';

                                $('<li>' +
                                    '<div class="progressbar">' +
                                        '<div style="width:' + percent + '%">' + timesSeen + '</div>' +
                                        '<a href="' + url + '?' + eTagName + '=' + encodeURIComponent(tagValue) + '">' +
                                            tagLabel +
                                            '<span>' + percent + '%</span>' +
                                        '</a>' +
                                    '</div>' +
                                '</li>').appendTo($widget);
                            });
                        }
                    }
                });
            });

            var $event_nav = $('#event_nav');
            if ($event_nav.length > 0) {
                var $window = $(window);
                var $nav_links = $event_nav.find('a[href*=#]');
                var $nav_targets = [];
                var scroll_offset = $event_nav.offset().top;
                var event_nav_height;
                var last_target;

                $window.resize(function(){
                    event_nav_height = $event_nav.find('.nav').outerHeight();
                    $event_nav.height(event_nav_height + 'px');
                }).resize();

                $nav_links.click(function(e){
                    var $el = $(this);
                    var target = $(this.hash);

                    $el.parent().addClass('active').siblings().removeClass('active');

                    $('html,body').animate({
                        scrollTop: target.position().top + event_nav_height
                    }, 'fast');

                    if (history.pushState) {
                        history.pushState({}, '', this.hash);
                    }

                    e.preventDefault();
                }).each(function(){
                    if (this.hash.length > 1 && $(this.hash).length) {
                        $nav_targets.push(this.hash);
                    }
                });

                var resizeTimer;
                $window.scroll(function(){
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(function(){
                        // Change fixed nav if needed
                        if ($window.scrollTop() > scroll_offset) {
                            if (!$event_nav.hasClass('fixed')) {
                                $event_nav.addClass('fixed');
                            }
                        } else if ($event_nav.hasClass('fixed')) {
                            $event_nav.removeClass('fixed');
                        }

                        if ($nav_targets.length) {
                            // Get container scroll position
                            var from_top = $window.scrollTop() + event_nav_height + 20;

                            // Get id of current scroll item
                            var cur = $.map($nav_targets, function(hash){
                                if ($(hash).offset().top < from_top) {
                                    return hash;
                                }
                            });

                            // Get the id of the current element
                            var target = cur ? cur[cur.length - 1] : null;

                            if (!target) {
                                target = $nav_targets[0];
                            }

                            if (last_target !== target) {
                               last_target = target;

                               // Set/remove active class
                               $nav_links
                                 .parent().removeClass("active")
                                 .end().filter("[href=" + target + "]").parent().addClass("active");
                            }
                        }
                    }, 1);
                }).scroll();
            }
        }
    });

    app.WallPage = BasePage.extend({
        initialize: function(){
            BasePage.prototype.initialize.apply(this, {
                realtime: true,
                pollTime: 3000
            });

            this.sparkline = $('.chart');
            this.sparkline.height(this.sparkline.parent().height());
            this.stats = $('#stats');

            _.bindAll(this, 'refreshStats', 'refreshSparkline');

            this.refreshSparkline();
            this.refreshStats();
        },

        makeDefaultView: function(id){
            return new app.GroupListView({
                className: 'group-list',
                id: id,
                maxItems: 5,
                stream: this.options.stream,
                realtime: this.options.realtime,
                model: app.models.Group
            });
        },

        refreshSparkline: function(){
            $.ajax({
                url: this.sparkline.attr('data-api-url'),
                type: 'get',
                dataType: 'json',
                data: {
                    since: new Date().getTime() / 1000 - 3600 * 24,
                    resolution: '1h'
                },
                success: _.bind(function(data){
                    for (var i = 0; i < data.length; i++) {
                        // set timestamp to be in millis
                        data[i][0] = data[i][0] * 1000;
                    }
                    this.sparkline.empty();
                    $.plot(this.sparkline, [{
                            data: data,
                            color: '#52566c',
                            shadowSize: 0,
                            lines: {
                                lineWidth: 2,
                                show: true,
                                fill: true,
                                fillColor: '#232428'
                            }
                        }], {
                            yaxis: {
                                min: 0
                            },
                            grid: {
                                show: false
                            },
                            hoverable: false,
                            legend: {
                                noColumns: 5
                            },
                            lines: {
                                show: false
                            }
                        }
                    );

                    window.setTimeout(this.refreshSparkline, 10000);
                }, this)
            });
        },

        refreshStats: function(){
            $.ajax({
                url: this.stats.attr('data-uri'),
                dataType: 'json',
                success: _.bind(function(data){
                    this.stats.find('[data-stat]').each(function(){
                        var $this = $(this);
                        var new_count = data[$this.attr('data-stat')];
                        var counter = $this.find('big');
                        var digit = counter.find('span');

                        if (digit.is(':animated'))
                            return false;

                        if (counter.data('count') == new_count) {
                            // We are already showing this number
                            return false;
                        }

                        counter.data('count', new_count);

                        var replacement = $('<span></span>', {
                            css: {
                                top: '-2.1em',
                                opacity: 0
                            },
                            text: new_count
                        });

                        // The .static class is added when the animation
                        // completes. This makes it run smoother.

                        digit.before(replacement).animate({
                            top: '2.5em',
                            opacity: 0
                        }, 'fast', function(){
                            digit.remove();
                        });

                        replacement.delay(100).animate({
                            top: 0,
                            opacity: 1
                        }, 'fast');

                    });
                    window.setTimeout(this.refreshStats, 1000);
                }, this)
            });
        }
    });

    app.TeamDetailsPage = BasePage.extend({
        initialize: function(){
            BasePage.prototype.initialize.apply(this, arguments);

            app.utils.makeSearchableUsersInput('form input[name=owner]');
        }
    });

    app.ProjectDetailsPage = BasePage.extend({
        initialize: function(){
            BasePage.prototype.initialize.apply(this, arguments);

            app.utils.makeSearchableUsersInput('form input[name=owner]');

            $("input[name='scrub_data']").change(function(){
                if ($(this).is(':checked')) {
                    $("#div_id_sensitive_fields").show();
                } else {
                    $("#div_id_sensitive_fields").hide();
                }
            }).change();

            $("input[type=range]").each(_.bind(function loop(n, el){
                var $el = $(el),
                    min = parseInt($el.attr('min'), 10),
                    max = parseInt($el.attr('max'), 10),
                    step = parseInt($el.attr('step'), 10),
                    values = [],
                    $value = $('<span class="value"></span>');

                var i = min;
                while (i <= max) {
                    values.push(i);
                    if (i < 12) {
                        i += 1;
                    } else if (i < 24) {
                        i += 3;
                    } else if (i < 36) {
                        i += 6;
                    } else if (i < 48) {
                        i += 12;
                    } else {
                        i += 24;
                    }
                }

                $el.on("slider:ready", _.bind(function sliderready(event, data) {
                    $value.appendTo(data.el);
                    $value.html(this.formatHours(data.value));
                }, this)).on("slider:changed", _.bind(function sliderchanged(event, data) {
                    $value.html(this.formatHours(data.value));
                }, this)).simpleSlider({
                    range: [min, max],
                    step: step,
                    allowedValues: values,
                    snap: true
                });
            }, this));
        },

        formatHours: function formatHours(val) {
            val = parseInt(val, 10);
            if (val === 0) {
                return 'Disabled';
            } else if (val > 23 && val % 24 === 0) {
                val = (val / 24);
                return val + ' day' + (val != 1 ? 's' : '');
            }
            return val + ' hour' + (val != 1 ? 's' : '');
        }
    });

    app.ProjectNotificationsPage = BasePage.extend({
        initialize: function(){
            BasePage.prototype.initialize.apply(this, arguments);

            $("input[type=range]").each(_.bind(function loop(n, el){
                var $el = $(el),
                    min = parseInt($el.attr('min'), 10),
                    max = parseInt($el.attr('max'), 10),
                    step = parseInt($el.attr('step'), 10),
                    $value = $('<span class="value"></span>');

                $el.on("slider:ready", _.bind(function sliderready(event, data) {
                    $value.appendTo(data.el);
                    $value.html(this.formatThreshold(data.value));
                }, this)).on("slider:changed", _.bind(function sliderchanged(event, data) {
                    $value.html(this.formatThreshold(data.value));
                }, this)).simpleSlider({
                    range: [min, max],
                    step: step,
                    snap: true
                });
            }, this));
        },

        formatThreshold: function formatThreshold(value) {
            if (!value) {
                return 'Disabled';
            }
            return value + '%';
        }

    });

    app.NewProjectPage = BasePage.extend({

        initialize: function(data){
            this.el = $(data.el);

            BasePage.prototype.initialize.apply(this, arguments);

            if (this.options.canSelectTeam && this.options.canCreateTeam) {
                $('#new_team').hide();
                $('a[rel="create-new-team"]').click(function(){
                    $('#new_team').show();
                    $('#select_team').hide();
                });
                $('a[rel="select-team"]').click(function(){
                    $('#new_team').hide();
                    $('#select_team').show();
                });
            }
        }

    });


    app.NewProjectRulePage = BasePage.extend({

        initialize: function(data){
            var select2_options = {
                width: 'element',
                allowClear: false,
                minimumResultsForSearch: 10
            };

            BasePage.prototype.initialize.apply(this, arguments);

            _.bindAll(this, 'addAction', 'addCondition', 'parseFormData');

            this.actions_by_id = {};
            this.conditions_by_id = {};
            this.el = $(data.el);
            this.action_sel = this.el.find('select[id="action-select"]');
            this.action_table = this.el.find('table.action-list');
            this.action_table_body = this.action_table.find('tbody');
            this.condition_sel = this.el.find('select[id="condition-select"]');
            this.condition_table = this.el.find('table.condition-list');
            this.condition_table_body = this.condition_table.find('tbody');

            this.action_sel.empty();
            this.action_sel.append($('<option></option>'));
            $.each(data.actions, _.bind(function(_, action) {
                var opt = $('<option></option>');
                opt.attr({
                    value: action.id
                });
                opt.text(action.label);
                opt.appendTo(this.action_sel);

                this.actions_by_id[action.id] = action;
            }, this));

            this.condition_sel.empty();
            this.condition_sel.append($('<option></option>'));
            $.each(data.conditions, _.bind(function(_, condition) {
                var opt = $('<option></option>');
                opt.attr({
                    value: condition.id
                });
                opt.text(condition.label);
                opt.appendTo(this.condition_sel);

                this.conditions_by_id[condition.id] = condition;
            }, this));

            this.action_sel.select2(select2_options);
            this.condition_sel.select2(select2_options);

            this.action_sel.change(_.bind(function(){
                var val = this.action_sel.val();
                if (val) {
                    this.addAction(val);
                }
            }, this));
            this.condition_sel.change(_.bind(function(){
                var val = this.condition_sel.val();
                if (val) {
                    this.addCondition(val);
                }
            }, this));

            this.parseFormData(data.form_data, data.form_errors);
        },

        parseFormData: function(form_data, form_errors) {
            // start by parsing into condition/action bits
            var data = {
                    action: {},
                    action_match: form_data.action_match || 'all',
                    condition: {},
                    label: form_data.label || ''
                };

            form_errors = form_errors || {};

            $.each(form_data, function(key, value){
                var matches = key.match(/^(condition|action)\[(\d+)\]\[(.+)\]$/);
                var type, num;
                if (!matches) {
                    return;
                }
                type = matches[1];
                num = matches[2];
                if (data[type][num] === undefined) {
                    data[type][num] = {};
                }
                data[type][num][matches[3]] = value;
            });

            this.el.find('input[name=label]').val(data.label);
            this.el.find('select[name="action_match"]').val(data.action_match);

            $.each(_.sortBy(data.condition), _.bind(function(num, item){
                this.addCondition(item.id, item, form_errors['condition[' + num + ']'] || false);
            }, this));
            $.each(_.sortBy(data.action), _.bind(function(num, item){
                this.addAction(item.id, item, form_errors['action[' + num + ']'] || false);
            }, this));
        },

        addInputRow: function(container, prefix, node, options, has_errors) {
            var num = container.find('tr').length;

            prefix = prefix + '[' + num + ']';
            has_errors = has_errors || false;
            options = options || {};

            var row = $('<tr></tr>'),
                remove_btn = $('<button class="btn btn-small">Remove</button>'),
                html = $('<div>' + node.html + '</div>'),
                id_field = $('<input type="hidden" name="' + prefix + '[id]" value="' + node.id + '">');

            if (has_errors) {
                row.addClass('error');
            }

            // we need to update the id of all form elements
            html.find('input, select, textarea').each(function(_, el){
                var $el = $(el),
                    name = $el.attr('name');
                $el.attr('name', prefix + '[' + name + ']');
                $el.val(options[name] || '');
            });

            html.find('input.typeahead').each(function(){
                var $this = $(this),
                    options = {
                        initSelection: function(el, callback) {
                            var $el = $(el);
                            callback({id: $el.val(), text: $el.val()});
                        },
                        data: $this.data('choices'),
                        createSearchChoice: function(term) {
                            return {id: $.trim(term), text: $.trim(term)};
                        }
                    };

                $this.select2(options);
            });

            html.find('select').each(function(){
                var $this = $(this),
                    options = {
                        width: 'element',
                        allowClear: false,
                        minimumResultsForSearch: 10
                    };

                if ($this.data('allow-clear')) {
                    options.allowClear = $this.data('allow-clear');
                }

                $this.select2(options);
            });

            row.append($('<td></td>').append(html).append(id_field));
            row.append($('<td></td>').append(remove_btn));
            row.appendTo(container);

            remove_btn.click(function(){
                row.remove();
                return false;
            });
        },

        addCondition: function(id, options, has_errors) {
            this.addInputRow(this.condition_table_body, 'condition',
                             this.conditions_by_id[id], options, has_errors);

            this.condition_sel.data("select2").clear();
            this.condition_table.show();
        },

        addAction: function(id, options, has_errors) {
            this.addInputRow(this.action_table_body, 'action',
                             this.actions_by_id[id], options, has_errors);

            this.action_sel.data("select2").clear();
            this.action_table.show();
        }

    });

    Backbone.sync = function(method, model, success, error){
        success();
    };
}(window, app, Backbone, jQuery, _));