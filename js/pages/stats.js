// Helper class
class DynamicLoader {
    constructor (container) {
        this.callback = null;
        this.observer = new IntersectionObserver(
            () => this._callback(),
            { threshold: 1.0 }
        );

        this.observed = container.insertAdjacentElement('afterend', document.createElement('div'));
        this.observer.observe(this.observed);
    }

    _callback () {
        if (this.callback) {
            this.callback();
        }
    }

    start (callback) {
        this.callback = callback;
        this.callback();
    }

    stop () {
        this.callback = null;
    }
}

// Context menu handler
class CustomMenu {
    constructor (parent, items) {
        this.parent = parent;
        this.source = null;
        this.timer = null;

        this.container = document.createElement('div');
        this.container.setAttribute('class', 'ui custom inverted popup right center css-context-menu hidden');

        this.parent.insertAdjacentElement('afterbegin', this.container);

        for (const { label, action } of items) {
            const item = document.createElement('div');
            item.setAttribute('class', 'ui fluid basic inverted button css-context-menu-item');
            item.innerText = label;

            item.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                action(this.source);

                if (this._visible()) {
                    this._hide();
                }
            });

            this.container.insertAdjacentElement('beforeend', item);
        }

        window.addEventListener('click', () => {
            if (this._visible()) {
                this._hide();
            }
        })

        this.container.addEventListener('mouseenter', () => {
            this._endTimer();
        })

        this.container.addEventListener('mouseleave', () => {
            this._startTimer();
        })
    }

    attach (elements) {
        this.source = null;

        for (const element of elements) {
            element.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                event.stopPropagation();

                const bounds = event.currentTarget.getBoundingClientRect();
                this._show(
                    event.currentTarget,
                    window.scrollX + bounds.left + bounds.width,
                    window.scrollY + bounds.top
                )
            })
        }
    }

    _visible () {
        return this.container.classList.contains('visible');
    }

    _hidden () {
        return this.container.classList.contains('hidden');
    }

    _startTimer () {
        if (this.timer) {
            return;
        }

        this.timer = setTimeout(
            () => this._hide(),
            1500
        );
    }

    _endTimer () {
        if (this.timer) {
            clearTimeout(this.timer);

            this.timer = null;
        }
    }

    _show (element, x, y) {
        this.source = element;

        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;

        if (this._hidden()) {
            $(this.container).transition('fade').show();
        }

        this._endTimer();
        this._startTimer();
    }

    _hide () {
        if (this._visible()) {
            $(this.container).transition('fade').hide();
        }

        this._endTimer();
    }
}

// Search class list
const PLAYER_CLASS_SEARCH = [
    '',
    'warrior',
    'mage',
    'scout',
    'assassin',
    'battle mage',
    'berserker',
    'demon hunter',
    'druid',
    'bard'
];

// Group Detail View
class GroupDetailTab extends Tab {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');
        this.table = new TableController(this.$table, TableType.Group);

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            var node = document.createElement('div');
            node.innerHTML = `${ _formatDate(Number(this.timestamp)) } - ${ _formatDate(Number(this.reference)) }`;

            document.body.prepend(node);
            var range = document.createRange();
            range.selectNode(node);

            var range2 = document.createRange();
            range2.selectNode(this.$table.get(0));

            window.getSelection().removeAllRanges();

            window.getSelection().addRange(range);
            window.getSelection().addRange(range2);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();

            document.body.removeChild(node);
        });

        // Copy 2
        this.$parent.find('[data-op="copy-sim"]').click(() => {
            copyJSON(this.table.getArray().map(p => ModelUtils.toSimulatorData(p.player)));
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.toImage(($document) => {
                const ta = Number(this.timestamp);
                const tb = Number(this.reference);

                $document.find('tbody').prepend($(`<tr style="height: 2em;"><td colspan="8" class="text-left" style="padding-left: 8px;">${_formatDate(ta)}${ta != tb ? ` - ${_formatDate(tb)}` : ''}</td></tr>`));
            }).then((blob) => {
                Exporter.png(blob, `${this.group.Latest.Name}.${this.timestamp}${this.timestamp != this.reference ? `.${this.reference}` : ''}`);
            });
        });

        this.$parent.find('[data-op="save-csv"]').click(() => {
            this.table.toCSV().then((blob) => {
                Exporter.csv(blob, `${this.group.Latest.Name}.${this.timestamp}${this.timestamp != this.reference ? `.${this.reference}` : ''}`);
            });
        });

        this.$parent.operator('export').click(() => {
            const createExport = (timestamps) => (() => DatabaseManager.export(null, timestamps, (player) => player.group == this.identifier))

            DialogController.open(
                ExportFileDialog,
                {
                    currentWithReference: createExport([ this.timestamp, this.reference ]),
                    current: createExport([ this.timestamp ]),
                    last: createExport([ _dig(this.list, 0, 'Timestamp') ]),
                    last5: createExport(this.list.slice(0, 5).map(entry => entry.Timestamp)),
                    all: createExport(this.list.map(entry => entry.Timestamp))
                },
                this.identifier
            )
        });

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.copy.player'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, this.timestamp)));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, this.timestamp), true));
                    }
                }
            ]
        );

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.Scripts, { key: this.identifier })
            }
        });

        this.$name = this.$parent.find('[data-op="name"]');
        this.$identifier = this.$parent.find('[data-op="identifier"]');

        this.$timestamp = this.$parent.find('[data-op="timestamp"]');
        this.$reference = this.$parent.find('[data-op="reference"]');
    }

    refreshTemplateDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            action: (value, text, element) => {
                this.$configure.find('.item').removeClass('active');

                if (this.templateOverride == value) {
                    this.templateOverride = '';
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                }

                this.load();

                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: intl('stats.templates.quick_swap'),
                    type: 'header',
                    class: 'header font-bold !text-center'
                },
                ... TemplateManager.sortedList().map(({ name }) => {
                    return {
                        value: name,
                        name
                    };
                })
            ]
        });
    }

    show ({ identifier }) {
        this.refreshTemplateDropdown();

        this.identifier = identifier;
        this.group = DatabaseManager.getGroup(identifier);

        this.$name.html(this.group.Latest.Name);
        this.$identifier.html(this.identifier);

        var listTimestamp = [];
        var listReference = [];

        this.list = SiteOptions.groups_empty ? this.group.List : this.group.List.filter((g) => g.MembersPresent);

        this.timestamp = _dig(this.list, 0, 'Timestamp');
        this.reference = (SiteOptions.always_prev ? _dig(this.list, 1, 'Timestamp') : undefined) || this.timestamp;

        const formatEntry = (group) => {
            if (group.MembersPresent >= group.MembersTotal) {
                return _formatDate(group.Timestamp);
            } else {
                return `<div class="flex justify-content-between"><span>${_formatDate(group.Timestamp)}</span><span class="text-gray">${group.MembersPresent} / ${group.MembersTotal}</span></div>`
            }
        }

        for (const group of this.list) {
            const timestamp = group.Timestamp;

            listTimestamp.push({
                name: formatEntry(group),
                value: timestamp,
                selected: timestamp == this.timestamp
            });

            if (timestamp <= this.timestamp) {
                listReference.push({
                    name: formatEntry(group),
                    value: timestamp,
                    selected: timestamp == this.reference
                });
            }
        }

        // Dropdowns
        this.$timestamp.dropdown({
            values: listTimestamp
        }).dropdown('setting', 'onChange', (value, text) => {
            this.timestamp = value;
            if (this.reference > this.timestamp) {
                this.reference = value;
            }

            var subref = listReference.slice(listReference.findIndex(entry => entry.value == this.timestamp));
            for (var i = 0; i < subref.length; i++) {
                subref[i].selected = subref[i].value == this.reference;
            }

            this.$reference.dropdown({
                values: subref
            }).dropdown('setting', 'onChange', (value) => {
                this.reference = value;
                this.load();
            });

            this.load();
        });

        this.$reference.dropdown({
            values: listReference
        }).dropdown('setting', 'onChange', (value) => {
            this.reference = value;
            this.load();
        });

        this.table.clearSorting();
        this.load();
    }

    load () {
        DOM.settingsButton(this.$configure.get(0), ScriptManager.exists(this.identifier));

        if (this.templateOverride) {
            this.table.clearSorting();
        }

        this.table.setScript(this.templateOverride ? TemplateManager.getContent(this.templateOverride) : ScriptManager.getContent(this.identifier, 'guilds', DefaultScripts.getContent('groups')));

        var current = this.group[this.timestamp];
        var reference = this.group[this.reference];

        // Joined and kicked members
        var joined = current.Members.filter(id => !reference.Members.includes(id)).map(id => {
            let p = DatabaseManager.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                return _dig(DatabaseManager.getPlayer(id), 'Latest', 'Name') || id;
            }
        });

        var kicked = reference.Members.filter(id => !current.Members.includes(id)).map(id => {
            let p = DatabaseManager.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                return _dig(DatabaseManager.getPlayer(id), 'Latest', 'Name') || id;
            }
        });

        // Members
        var members = [];
        var missing = [];
        for (var id of current.Members) {
            let player = DatabaseManager.getPlayer(id, this.timestamp);
            if (player) {
                members.push(player);
            } else {
                missing.push(current.Names[current.Members.findIndex(x => x == id)]);
            }
        }

        // Reference members
        var membersReferences = [];
        for (var member of members) {
            var player = DatabaseManager.getPlayer(member.Identifier);
            if (player) {
                var playerReference = DatabaseManager.getPlayer(member.Identifier, this.reference);
                if (playerReference && playerReference.Group.Identifier == this.identifier) {
                    membersReferences.push(playerReference);
                } else {
                    var p = player.List.concat().reverse().find(p => p.Timestamp >= this.reference && p.Timestamp <= member.Timestamp && p.Group.Identifier == this.identifier);
                    if (p) {
                        membersReferences.push(p);
                    }
                }
            } else {
                membersReferences.push(member);
            }
        }

        // Add entries
        const entries = new GroupTableArray({
            joined,
            kicked,
            missing,
            timestamp: _safeInt(this.timestamp),
            reference: _safeInt(this.reference)
        });

        members.forEach(function (player) {
            entries.add(player, membersReferences.find(c => c.Identifier == player.Identifier));
        });

        this.table.setEntries(entries);
        this.refresh();
    }

    refresh () {
        this.table.refresh(() => {
            this.table.bodyElement.insertAdjacentHTML('beforeend', '<tr style="height: 2em;"></tr>');
        }, (element) => {
            const clickableElements = Array.from(element.querySelectorAll('[data-id]'));
            for (const clickableElement of clickableElements) {
                clickableElement.addEventListener('click', (event) => {
                    DialogController.open(PlayerDetailDialog, { identifier: event.currentTarget.dataset.id, timestamp: this.timestamp, reference: this.reference || this.timestamp })
                })
            }

            this.contextMenu.attach(clickableElements);
        });
    }

    reload () {
        this.templateOverride = '';
        this.refreshTemplateDropdown();
        this.load();
    }
}

class PlayerDetailTab extends Tab {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');
        this.table = new TableController(this.$table, TableType.Player);

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            this.table.forceInject();

            copyNode(this.table.element);
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.toImage().then((blob) => {
                Exporter.png(blob, `${this.player.Name}.${Exporter.time}`);
            });
        });

        this.$parent.find('[data-op="save-csv"]').click(() => {
            this.table.toCSV().then((blob) => {
                Exporter.csv(blob, `${this.player.Name}.${Exporter.time}`);
            });
        });

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.copy.player'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, target.dataset.ts)));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, target.dataset.ts), true));
                    }
                }
            ]
        );

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.Scripts, { key: this.identifier })
            }
        });

        this.$parent.operator('export').click(() => {
            const createExport = (timestamps) => (() => DatabaseManager.export([ this.identifier ], timestamps))

            DialogController.open(
                ExportFileDialog,
                {
                    last: createExport([ _dig(this.list, 0, 'Timestamp') ]),
                    last5: createExport(this.list.slice(0, 5).map(entry => entry.Timestamp)),
                    all: createExport()
                },
                this.identifier
            )
        });

        this.$name = this.$parent.find('[data-op="name"]');
        this.$identifier = this.$parent.find('[data-op="identifier"]');
    }

    refreshTemplateDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            action: (value, text, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.templateOverride == value) {
                    this.templateOverride = '';

                    settings = ScriptManager.getContent(this.identifier, 'me', DefaultScripts.getContent('players'));
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = TemplateManager.getContent(value);
                }

                this.table.setScript(settings);
                this.refresh();

                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: intl('stats.templates.quick_swap'),
                    type: 'header',
                    class: 'header font-bold !text-center'
                },
                ... TemplateManager.sortedList().map(({ name }) => {
                    return {
                        value: name,
                        name
                    };
                })
            ]
        });
    }

    show ({ identifier }) {
        this.refreshTemplateDropdown();
        this.identifier = identifier;

        const { List: list, Latest: player } = DatabaseManager.getPlayer(identifier);
        this.list = list;
        this.player = player;

        this.array = new PlayerTableArray();
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            const c = list[i + 1];

            this.array.add(p, c || p);
        }

        this.$name.html(this.player.Name);
        this.$identifier.html(this.identifier);

        this.load();
    }

    load () {
        this.templateOverride = '';
        this.$configure.find('.item').removeClass('active');

        // Table instance
        this.table.setScript(ScriptManager.getContent(this.identifier, 'me', DefaultScripts.getContent('players')));

        this.array.forEach((e) => DatabaseManager.loadPlayer(e.player));

        // Configuration indicator
        DOM.settingsButton(this.$configure.get(0), ScriptManager.exists(this.identifier));
        
        this.refresh();
    }

    refresh () {
        this.table.setEntries(this.array);
        this.table.refresh(undefined, (element) => {
            const clickableElements = Array.from(element.querySelectorAll('[data-id]'));
            for (const clickableElement of clickableElements) {
                clickableElement.addEventListener('click', (event) => {
                    const dataset = event.currentTarget.dataset;
                    DialogController.open(PlayerDetailDialog, { identifier: dataset.id, timestamp: dataset.ts, reference: dataset.ts })
                });
            }

            this.contextMenu.attach(clickableElements);
        });
    }

    reload () {
        this.refreshTemplateDropdown();
        this.load();
    }
}

// Browse View
class BrowseTab extends Tab {
    constructor (parent) {
        super(parent);

        this.$table1 = this.$parent.find('[data-op="table1"]');
        this.$table2 = this.$parent.find('[data-op="table2"]');

        // Tables
        this.tableBase = new TableController(this.$table1, TableType.Browse);
        this.tableQ = new TableController(this.$table2, TableType.Browse);

        // Keep track of what table is displayed and swap if necessary later
        this.table = this.tableBase;
        this.tableQEnabled = false;

        this.$reference = this.$parent.find('[data-op="reference"]');
        this.$timestamp = this.$parent.find('[data-op="timestamp"]');

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            this.table.forceInject();

            copyNode(this.table.element);
        });

        document.addEventListener('keyup', (event) => {
            if (event.keyCode == 17) {
                if (UI.current == UI.Browse) {
                    this.$parent.find('.css-op-select').removeClass('css-op-select');
                }
            }
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.toImage().then((blob) => {
                Exporter.png(blob, `players.${this.timestamp}`);
            });
        });

        this.$parent.find('[data-op="save-csv"]').click(() => {
            this.table.toCSV().then((blob) => {
                Exporter.csv(blob, `players.${this.timestamp}`);
            });
        });

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        var sel = this.$parent.find('[data-id].css-op-select');
                        if (sel.length) {
                            for (var el of sel) {
                                DatabaseManager.hideIdentifier($(el).attr('data-id'));
                            }
                        } else {
                            DatabaseManager.hideIdentifier(source.dataset.id);
                        }

                        this.$filter.trigger('change');
                    }
                },
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        let sel = this.$parent.find('[data-id].css-op-select');
                        let cnt = null;

                        if (sel.length) {
                            cnt = sel.toArray().map(x => ModelUtils.toSimulatorData(DatabaseManager.getPlayer(x.dataset.id, x.dataset.ts)));
                        } else {
                            cnt = ModelUtils.toSimulatorData(DatabaseManager.getPlayer(source.dataset.id, source.dataset.ts));
                        }

                        copyJSON(cnt);
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (source) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(source.dataset.id, source.dataset.ts), true));
                    }
                },
                {
                    label: intl('stats.share.title_short'),
                    action: (source) => {
                        let ids = this.$parent.find('[data-id].css-op-select').toArray().map(el => el.dataset.id);
                        ids.push(source.dataset.id);

                        DialogController.open(
                            ExportFileDialog,
                            () => DatabaseManager.export(_uniq(ids)),
                            'players'
                        )
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        let elements = this.$parent.find('[data-id].css-op-select').toArray();
                        let identifiers = elements.length ? elements.map(el => el.dataset.id) : [source.dataset.id];

                        DatabaseManager.safeRemove({ identifiers }, () => this.$filter.trigger('change'));
                    }
                }
            ]
        );

        // Copy 2
        this.$parent.find('[data-op="copy-sim"]').click(() => {
            var array = this.table.getInternalEntries();
            var slice = this.table.getArray().entryLimit || this.table.getEntryLimit();
            if (slice) {
                array = array.slice(0, slice);
            }

            copyJSON(array.map(p => ModelUtils.toSimulatorData(p.player)));
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.Scripts, { key: 'players' })
            }
        });

        // Hidden toggle
        this.hidden = SiteOptions.browse_hidden;

        DOM.toggle({
            element: this.$parent.operator('show-hidden').get(0),
            value: SiteOptions.browse_hidden,
            callback: (active) => {
                SiteOptions.browse_hidden = (this.hidden = active);

                this.recalculate = true;
                this.$filter.trigger('change');
            }
        })

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _arrayToHash(
                ['c', 'p', 'g', 's', 'e', '#', 'l', 'f', 'r', 'h', 'o', 'sr', 'q', 'qc', 't'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change(async (event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b|^)(c|p|g|s|e|l|f|r|h|o|sr|q|qc|t|#):/);

            var terms = [
                {
                   test: function (arg, player, timestamp) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.toLowerCase().includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            var entryLimit = undefined;

            this.shidden = false;
            this.autosort = undefined;
            this.tableQEnabled = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'c') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (PLAYER_CLASS_SEARCH[player.Class] == term) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'p') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'g') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.hasGuild() && player.Group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == '#') {
                    terms.push({
                        test: (arg, player) => {
                            return player.Data.tag && arg.some(rarg => player.Data.tag == rarg);
                        },
                        arg: arg.split('|').map(rarg => rarg.trim())
                    })
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player, timestamp) => player.Timestamp == timestamp,
                        arg: arg.toLowerCase()
                    });
                    this.recalculate = true;
                } else if (key == 'e') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        terms.push({
                            test: (arg, player, timestamp, compare) => arg.eval(new ExpressionScope().with(player, compare)),
                            arg: ast
                        });
                    }
                } else if (key == 'sr') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        this.autosort = (player, compare) => ast.eval(new ExpressionScope().with(player, compare));
                    }
                } else if (key == 'f') {
                    entryLimit = isNaN(arg) ? 1 : Math.max(1, Number(arg));
                } else if (key == 'r') {
                    this.recalculate = true;
                } else if (key == 'h') {
                    this.shidden = true;
                } else if (key == 'o') {
                    terms.push({
                        test: (arg, player, timestamp) => DatabaseManager.getPlayer(player.Identifier).Own
                    });
                    this.recalculate = true;
                    this.shidden = true;
                } else if (key == 'q' && typeof(arg) == 'string' && arg.length) {
                    this.tableQEnabled = true;
                    this.recalculate = true;

                    // Clear original sort
                    this.table.clearSorting();

                    this.table = this.tableQ;
                    this.table.setScript(`category${ arg.split(',').reduce((c, a) => c + `\nheader ${ a.trim() }`, '') }`);
                } else if (key == 'qc' && typeof(arg) == 'string' && arg.length) {
                    this.table.selectCategories(arg.split(',').map(x => x.trim()));
                } else if (key == 't' && typeof(arg) == 'string' && arg.length) {
                    let script = await this.tryGetSettings(arg.trim());
                    if (script) {
                        this.tableQEnabled = true;
                        this.recalculate = true;

                        // Clear original sort
                        this.table.clearSorting();

                        this.table = this.tableQ;
                        this.table.setScript(script);
                    }
                }
            }

            if (!this.tableQEnabled) {
                this.table = this.tableBase;
            }

            const entries = new BrowseTableArray({
                entryLimit,
                timestamp: _safeInt(this.timestamp),
                reference: _safeInt(this.reference),
                externalSort: this.autosort,
                suppressUpdate: !this.recalculate
            });

            for (const [identifier, { List: list }] of Object.entries(DatabaseManager.Players)) {
                const hidden = DatabaseManager.isIdentifierHidden(identifier);
                if (this.hidden || this.shidden || !hidden) {
                    const currentPlayer = list.find((entry) => entry.Timestamp <= this.timestamp);
                    if (currentPlayer) {
                        const timestamp = currentPlayer.Timestamp;

                        const comparePlayer = list.concat().reverse().find((entry) => entry.Timestamp >= this.reference && entry.Timestamp <= timestamp) || currentPlayer;
                        const reference = comparePlayer.Timestamp;
                        
                        if (terms.every((term) => term.test(term.arg, DatabaseManager.loadPlayer(currentPlayer), this.timestamp, reference))) {
                            entries.add(
                                DatabaseManager.loadPlayer(currentPlayer),
                                DatabaseManager.loadPlayer(comparePlayer),
                                timestamp == this.timestamp,
                                hidden
                            )
                        }
                    }
                }
            }

            this.table.setEntries(entries);

            this.refresh();

            this.recalculate = false;
        });
    }

    async tryGetSettings (code) {
        if (typeof this.settingsRepo == 'undefined') {
            this.settingsRepo = {};
        }

        if (!(code in this.settingsRepo)) {
            this.settingsRepo[code] = (await SiteAPI.get('script_get', { key: code.trim() })).script.content;
        }

        return this.settingsRepo[code];
    }

    updateSelectors () {
        const timestamps = [];
        const references = [];

        for (const timestamp of DatabaseManager.PlayerTimestamps) {
            timestamps.push({
                name: _formatDate(timestamp),
                value: timestamp,
                selected: timestamp == this.timestamp
            });

            references.push({
                name: _formatDate(timestamp),
                value: timestamp,
                selected: timestamp == this.reference
            });
        }

        timestamps.sort((a, b) => b.value - a.value);
        references.sort((a, b) => b.value - a.value);

        this.$timestamp.dropdown('clear', true);
        this.$reference.dropdown('clear', true);

        DOM.dropdown(this.$timestamp.get(0), timestamps);
        DOM.dropdown(this.$reference.get(0), references);

        this.$timestamp.dropdown({
            onChange: (value) => {
                this.timestamp = value;
                this.recalculate = true;

                if (this.reference > this.timestamp) {
                    this.reference = value;
                }

                const subref = references.slice(references.findIndex(entry => entry.value == this.timestamp));
                for (let i = 0; i < subref.length; i++) {
                    subref[i].selected = subref[i].value == this.reference;
                }

                this.$reference.dropdown('clear', true);

                DOM.dropdown(this.$reference.get(0), subref);

                this.$reference.dropdown({
                    onChange: (value) => {
                        this.reference = value;
                        this.recalculate = true;
                        this.$filter.trigger('change');
                    }
                });
    
                this.$filter.trigger('change');
            }
        })

        this.$reference.dropdown({
            onChange: (value) => {
                this.reference = value;
                this.recalculate = true;
                this.$filter.trigger('change');
            }
        });
    }

    show (params) {
        const nonBrowseOrigin = params && params.origin !== UI.Browse;
        const nonUpdated = this.lastDatabaseChange === DatabaseManager.LastChange && this.lastScriptChange === ScriptManager.LastChange;

        if (nonBrowseOrigin && nonUpdated) {
            // If no update has happened, just do nothing and display previously rendered table
            return;
        } else {
            this.lastDatabaseChange = DatabaseManager.LastChange;
            this.lastScriptChange = ScriptManager.LastChange

            this.timestamp = DatabaseManager.LatestPlayer;
            this.reference = DatabaseManager.LatestPlayer;

            this.tableBase.resetInjector();
            this.tableQ.resetInjector();
    
            this.refreshTemplateDropdown();
            this.updateSelectors();
    
            this.load();
        }
    }

    load () {
        // Configuration indicator
        this.$configure.find('.item').removeClass('active');
        DOM.settingsButton(this.$configure.get(0), ScriptManager.exists('players'));

        this.table.setScript(ScriptManager.getContent('players', 'players', DefaultScripts.getContent('browse')));

        this.templateOverride = '';
        this.recalculate = true;
        this.$filter.trigger('change');
    }

    refreshTemplateDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            action: (value, text, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.templateOverride == value) {
                    this.templateOverride = '';

                    settings = ScriptManager.getContent('players', 'players', DefaultScripts.getContent('browse'));
                } else {
                    this.templateOverride = value;

                    $(element).addClass('active');
                    settings = TemplateManager.getContent(value);
                }

                this.table.setScript(settings);

                this.recalculate = true;
                this.$filter.trigger('change');
                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: intl('stats.templates.quick_swap'),
                    type: 'header',
                    class: 'header font-bold !text-center'
                },
                ... TemplateManager.sortedList().map(({ name }) => {
                    return {
                        value: name,
                        name
                    };
                })
            ]
        });
    }

    _toggleTable (table) {
        if (table === this.table) {
            table.element.style.display = '';
        } else {
            
            table.element.style.display = 'none';
        }
    }

    refresh () {
        this._toggleTable(this.tableBase);
        this._toggleTable(this.tableQ);

        this.table.refresh(undefined, (element) => {
            const clickableElements = Array.from(element.querySelectorAll('[data-id]'));
            for (const clickableElement of clickableElements) {
                clickableElement.addEventListener('click', (event) => {
                    if (event.ctrlKey) {
                        event.currentTarget.classList.toggle('css-op-select');
                    } else {
                        DialogController.open(PlayerDetailDialog, { identifier: event.currentTarget.dataset.id, timestamp: this.timestamp, reference: this.reference || this.timestamp })
                    }
                });

                clickableElement.addEventListener('mousedown', (event) => {
                    event.preventDefault();
                })
            }

            this.contextMenu.attach(clickableElements);
        });
    }

    reload () {
        this.refreshTemplateDropdown();
        this.load();
    }
}

// Groups View
class GroupsTab extends Tab {
    _prepareOption (operator, key, storeKey) {
        DOM.toggle({
            element: this.$parent.operator(operator).get(0),
            value: SiteOptions[storeKey],
            callback: (active) => {
                SiteOptions[storeKey] = (this[key] = active);
                this.show();
            }
        })

        return SiteOptions[storeKey];
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        // Toggles
        this.hidden = this._prepareOption('show-hidden', 'hidden', 'groups_hidden');
        this.others = this._prepareOption('show-other', 'others', 'groups_other');
        this.empty = this._prepareOption('show-empty', 'empty', 'groups_empty');

        // Observer
        this.loader = new DynamicLoader(this.$list.get(0));

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        DatabaseManager.hideIdentifier(source.dataset.id);
                        this.show();
                    }
                },
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        let group = DatabaseManager.getGroup(source.dataset.id).Latest;
                        copyJSON(group.Members.map(id => {
                            if (DatabaseManager.hasPlayer(id, group.Timestamp)) {
                                return ModelUtils.toSimulatorData(DatabaseManager.getPlayer(id, group.Timestamp));
                            } else {
                                return null;
                            }
                        }).filter(x => x));
                    }
                },
                {
                    label: intl('stats.share.title_short'),
                    action: (source) => {
                        const group = source.dataset.id;
                        const members = DatabaseManager.Groups[group].List.reduce((memo, g) => memo.concat(g.Members), []);

                        DialogController.open(
                            ExportFileDialog,
                            () => DatabaseManager.export([ group, ... _uniq(members) ]),
                            group
                        );
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        DatabaseManager.safeRemove({ identifiers: [ source.dataset.id ] }, () => this.show());
                    }
                }
            ]
        )

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _arrayToHash(
                ['g', 's', 'l', 'h', 'a', 'd'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change((event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b)(g|s|l|a|h|d):/);

            var terms = [
                {
                   test: function (arg, group) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (group.Name.toLowerCase().includes(subterm) || group.Prefix.toLowerCase().includes(subterm)) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            this.hidden_override = false;
            this.others_override = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'g') {
                    terms.push({
                        test: (arg, group) => {
                            for (var term of arg) {
                                if (group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, group) => {
                            for (var term of arg) {
                                if (group.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, group) => group.Timestamp == DatabaseManager.Latest,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'a') {
                    this.hidden_override = true;
                    this.others_override = true;
                } else if (key == 'h') {
                    this.hidden_override = true;
                } else if (key == 'd') {
                    this.others_override = true;
                }
            }

            this.entries = [];

            for (const group of Object.values(DatabaseManager.Groups)) {
                let matches = true;
                for (const term of terms) {
                    matches &= term.test(term.arg, group.Latest);
                }

                if (matches) {
                    this.entries.push(group);
                }
            }

            if (this.empty) {
                this.entries.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);
            } else {
                this.entries.sort((a, b) => b.LatestDisplayTimestamp - a.LatestDisplayTimestamp);
            }

            this.refresh();
        });
    }

    show () {
        const viewableGroups = Object.entries(DatabaseManager.Groups);
        if (viewableGroups.length == 1 && (SiteOptions.groups_empty || viewableGroups[0][1].List.filter((g) => g.MembersPresent).length > 0)) {
            UI.show(UI.GroupDetail, { identifier: viewableGroups[0][0] });
        } else {
            this.load();
        }
    }

    refresh () {
        this.$list.empty();

        const latestPlayerTimestamp = this.empty ? DatabaseManager.Latest : DatabaseManager.LatestPlayer;
        const filteredEntries = this.entries.filter(group => {
            const visible = !DatabaseManager.isIdentifierHidden(group.Latest.Identifier);
            const own = group.Own;

            return (visible || this.hidden || this.hidden_override) && (own || this.others || this.others_override) && (this.empty || group.LatestDisplayTimestamp);
        });

        const items = [];
        for (const group of filteredEntries) {
            items.push(`
                <div class="column">
                    <div class="ui basic ${latestPlayerTimestamp != (this.empty ? group.LatestTimestamp : group.LatestDisplayTimestamp) ? 'red' : 'grey'} inverted segment cursor-pointer !p-0 !border-radius-1 flex flex-col items-center ${ DatabaseManager.isIdentifierHidden(group.Latest.Identifier) ? 'opacity-50' : '' }" data-id="${ group.Latest.Identifier }">
                        <span class="text-85% my-2">${ _formatDate(this.empty ? group.LatestTimestamp : group.LatestDisplayTimestamp) }</span>
                        <img class="ui image" src="res/group.png" width="173" height="173">
                        <h3 class="ui grey header !m-0 !mt-2">${ group.Latest.Prefix }</h3>
                        <h3 class="ui inverted header !mt-0 !mb-1">${ group.Latest.Name }</h3>
                    </div>
                </div>
            `)
        }

        this.loader.start(() => {
            const blockClickable = $(items.splice(0, 20).join('')).appendTo(this.$list).find('[data-id]').click(function () {
                UI.show(UI.GroupDetail, { identifier: this.dataset.id });
            })

            this.contextMenu.attach(blockClickable.get());

            if (items.length == 0) {
                this.loader.stop();
            }
        });
    }

    load () {
        this.$filter.trigger('change');
    }
}

// Players View
class PlayersTab extends Tab {
    _prepareOption (operator, key, storeKey) {
        DOM.toggle({
            element: this.$parent.operator(operator).get(0),
            value: SiteOptions[storeKey],
            callback: (active) => {
                SiteOptions[storeKey] = (this[key] = active);
                this.show();
            }
        })

        return SiteOptions[storeKey];
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        // Toggles
        this.hidden = this._prepareOption('show-hidden', 'hidden', 'players_hidden');
        this.others = this._prepareOption('show-other', 'others', 'players_other');
        
        // Observer
        this.loader = new DynamicLoader(this.$list.get(0));

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        DatabaseManager.hideIdentifier(source.dataset.id);
                        this.show();
                    }
                },
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(source.dataset.id).Latest));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (source) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(source.dataset.id).Latest, true));
                    }
                },
                {
                    label: intl('stats.share.title_short'),
                    action: (source) => {
                        DialogController.open(
                            ExportFileDialog,
                            () => DatabaseManager.export([ source.dataset.id ]),
                            source.dataset.id
                        )
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        DatabaseManager.safeRemove({ identifiers: [ source.dataset.id ] }, () => this.show());
                    }
                }
            ]
        )

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _arrayToHash(
                ['c', 'p', 'g', 's', 'e', 'l', 'a', 'h', 'd'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change((event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b)(c|p|g|s|e|l|a|h|d):/);

            var terms = [
                {
                   test: function (arg, player) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.toLowerCase().includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            this.hidden_override = false;
            this.others_override = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'c') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (PLAYER_CLASS_SEARCH[player.Class] == term) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'p') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'g') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.hasGuild() && player.Group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player) => player.Timestamp == DatabaseManager.Latest,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'e') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        terms.push({
                            test: (arg, player) => arg.eval(new ExpressionScope().with(player, player).addSelf(player)),
                            arg: ast
                        });
                    }
                } else if (key == 'a') {
                    this.hidden_override = true;
                    this.others_override = true;
                } else if (key == 'h') {
                    this.hidden_override = true;
                } else if (key == 'd') {
                    this.others_override = true;
                }
            }

            this.entries = [];

            for (var player of Object.values(DatabaseManager.Players)) {
                var hidden = DatabaseManager.isIdentifierHidden(player.Latest.Identifier);
                if (this.hidden || !hidden || this.hidden_override) {
                    var matches = true;
                    for (var term of terms) {
                        matches &= term.test(term.arg, player.Latest, player.LatestTimestamp);
                    }

                    if (matches) {
                        this.entries.push(player);
                    }
                }
            }

            this.entries.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

            this.refresh();
        });
    }

    show () {
        let identitifiers = Object.keys(DatabaseManager.Players);
        if (identitifiers.length == 1) {
            UI.show(UI.PlayerDetail, { identifier: identitifiers[0] });
        } else {
            this.load();
        }
    }

    refresh () {
        this.$list.empty();

        const filteredEntries = this.entries.filter(player => {
            const visible = !DatabaseManager.isIdentifierHidden(player.Latest.Identifier);
            const own = player.Own;
            
            return (visible || this.hidden || this.hidden_override) && (own || this.others || this.others_override);
        })
        
        const items = [];
        for (const player of filteredEntries) {
            items.push(`
                <div class="column">
                    <div class="ui basic inverted ${DatabaseManager.Latest != player.LatestTimestamp ? 'red' : 'grey'} segment cursor-pointer !p-0 !border-radius-1 flex flex-col items-center ${ DatabaseManager.isIdentifierHidden(player.Latest.Identifier) ? 'opacity-50' : '' }" data-id="${ player.Latest.Identifier }">
                        <span class="text-85% my-2">${ _formatDate(player.LatestTimestamp) }</span>
                        <img class="ui image" src="${_classImageUrl(player.Latest.Class)}" width="173" height="173">
                        <h3 class="ui grey header !m-0 !mt-2">${ player.Latest.Prefix }</h3>
                        <h3 class="ui inverted header !mt-0 !mb-1">${ player.Latest.Name }</h3>
                    </div>
                </div>
            `);
        }

        this.loader.start(() => {
            const blockClickable = $(items.splice(0, 20).join('')).appendTo(this.$list).find('[data-id]').click(function () {
                UI.show(UI.PlayerDetail, { identifier: this.dataset.id });
            })

            this.contextMenu.attach(blockClickable.get());

            if (items.length == 0) {
                this.loader.stop();
            }
        });
    }

    load () {
        this.$filter.trigger('change');
    }
}

// Files View
class FilesTab extends Tab {
    // Export all to json file
    exportAll () {
        DialogController.open(
            ExportFileDialog,
            () => DatabaseManager.export(),
            'files'
        );
    }

    // Export selected to cloud
    exportSelected () {
        if (this.simple) {
            if (this.selectedFiles.size === 0) return;

            DialogController.open(
                ExportFileDialog,
                () => DatabaseManager.export(undefined, this.selectedFiles),
                'files'
            );
        } else {
            if (this.selectedEntries.size === 0) return;

            const players = [];
            const groups = [];
            for (const entry of this.selectedEntries.values()) {
                if (DatabaseManager.isPlayer(entry.identifier)) {
                    players.push(entry);
                } else {
                    groups.push(entry);
                }
            }

            DialogController.open(
                ExportFileDialog,
                () => ({ players, groups: DatabaseManager.relatedGroupData(players, groups, SiteOptions.export_bundle_groups) }),
                'files'
            );
        }
    }

    tagSelected () {
        if (this.simple && this.selectedFiles.size > 0) {
            DialogController.open(EditFileTagDialog, this.selectedFiles, () => this.show());
        }
    }

    // Delete all
    deleteAll () {
        DialogController.open(ConfirmationDialog, intl('dialog.delete_all.title'), intl('dialog.delete_all.notice'), () => {
            Loader.toggle(true);
            DatabaseManager.purge().then(() => this.show());
        }, () => {}, true, 2)
    }

    // Delete selected
    deleteSelected () {
        if (this.simple) {
            if (this.selectedFiles.size > 0) {
                DatabaseManager.safeRemove({ timestamps: Array.from(this.selectedFiles) }, () => this.show());
            }
        } else if (this.selectedEntries.size > 0) {
            DatabaseManager.safeRemove({ instances: Array.from(this.selectedEntries.values()) }, () => this.show());
        }
    }

    // Merge selected
    mergeSelected () {
        if (this.simple) {
            if (this.selectedFiles.size > 1) {
                Loader.toggle(true);
                DatabaseManager.merge(Array.from(this.selectedFiles)).then(() => this.show());
            }
        } else {
            const timestamps = _uniq(Array.from(this.selectedEntries.values()).map(entry => entry.timestamp));
            if (timestamps.length > 1) {
                Loader.toggle(true);
                DatabaseManager.merge(timestamps).then(() => this.show());
            }
        }
    }

    // Hide selected
    hideSelected () {
        Loader.toggle(true);
        if (this.simple) {
            DatabaseManager.hideTimestamps(... Array.from(this.selectedFiles)).then(() => this.show());
        } else {
            DatabaseManager.hide(Array.from(this.selectedEntries.values())).then(() => this.show());
        }
    }

    hideMigrate () {
        Loader.toggle(true);
        DatabaseManager.migrateHiddenFiles().then(() => this.show());
    }

    // Import file via har
    importJson (fileEvent) {
        Loader.toggle(true, { progress: true });

        const files = Array.from(fileEvent.currentTarget.files);

        let filesDone = 0;
        let filesCount = files.length;

        let promises = [];

        for (const file of files) {
            const promise = file.text().then(async (content) => {
                await DatabaseManager.import(content, file.lastModified).catch((e) => {
                    Toast.error(intl('database.import_error'), e.message);
                    Logger.error(e, 'Error occured while trying to import a file!');
                });

                Loader.progress(++filesDone / filesCount);
            });

            promises.push(promise);
        }

        Promise.all(promises).then(() => this.show());
    }

    // Import file via endpoint
    importEndpoint () {
        DialogController.open(EndpointDialog, false).then((actionSuccess) => {
            if (actionSuccess) {
                this.show();
            }
        });
    }

    // Import file via cloud
    importCloud () {
        DialogController.open(ImportFileDialog, () => this.show());
    }

    // Prepare checkbox
    prepareCheckbox (property, name) {
        this.$parent.find(`[data-op="checkbox-${ name }"]`).checkbox({
            onChecked: () => { SiteOptions[property] = true },
            onUnchecked: () => { SiteOptions[property] = false }
        }).checkbox(SiteOptions[property] ? 'set checked' : 'set unchecked');
    }

    constructor (parent) {
        super(parent);

        this.$fileCounter = this.$parent.find('[data-op="selected-counter"]');

        this.$parent.find('[data-op="export"]').click(() => this.exportAll());
        this.$parent.find('[data-op="export-partial"]').click(() => this.exportSelected());
        this.$parent.find('[data-op="delete-all"]').click(() => this.deleteAll());
        this.$parent.find('[data-op="delete"]').click(() => this.deleteSelected());
        this.$parent.find('[data-op="merge"]').click(() => this.mergeSelected());
        this.$parent.find('[data-op="hide"]').click(() => this.hideSelected());
        this.$parent.find('[data-op="upload"]').change(event => this.importJson(event));
        this.$parent.find('[data-op="endpoint"]').click(() => this.importEndpoint());
        this.$parent.find('[data-op="shared"]').click(() => this.importCloud());

        this.$migrateHidden = this.$parent.find('[data-op="hide-migrate"]').click(() => this.hideMigrate());
        this.$tags = this.$parent.find('[data-op="tags"]').click(() => this.tagSelected());
        this.$filters = this.$parent.find('[data-op="filters"]');

        this.$resultsAdvanced = this.$parent.find('[data-op="files-search-results"]');
        this.$resultsSimple = this.$parent.find('[data-op="files-search-results-simple"]');

        this.$parent.find('[data-op="mark-all"]').click(() => this.markAll());

        this.$advancedCenter = this.$parent.find('[data-op="advanced-center"]');
        this.$simpleCenter = this.$parent.find('[data-op="simple-center"]');

        this.simpleLoader = new DynamicLoader(this.$simpleCenter.find('table').get(0));
        this.advancedLoader = new DynamicLoader(this.$advancedCenter.find('table').get(0));

        this.prepareCheckbox('advanced', 'advanced');
        SiteOptions.onChange('advanced', enabled => this.setLayout(enabled));

        this.prepareCheckbox('hidden', 'hidden');
        SiteOptions.onChange('hidden', async () => {
            await DatabaseManager.reloadHidden();
            this.show({ forceUpdate: true });
        });

        this.prepareCheckbox('export_public_only', 'export-public-only');
        this.prepareCheckbox('export_bundle_groups', 'export-bundle-groups');

        this.$tagFilter = this.$parent.find('[data-op="simple-tags"]');
        this.tagFilter = undefined;

        this.ExpressionConfig = DEFAULT_EXPRESSION_CONFIG.clone();
        for (const name of ['timestamp', 'players', 'groups', 'version', 'tags']) {
            this.ExpressionConfig.register('accessor', 'none', name, (object) => object[name]);
        }

        this.setLayout(SiteOptions.advanced, true);
    }

    setLayout (advanced, supressUpdate = false) {
        window.scrollTo({ top: 0 });

        this.$advancedCenter.toggle(advanced);
        this.$simpleCenter.toggle(!advanced);
        this.simple = !advanced;
        if (!supressUpdate) this.show({ forceUpdate: true });
    }

    markAll () {
        if (this.simple) {
            let filesToMark = [];
            let filesToIgnore = [];

            for (const timestamp of _intKeys(this.currentFiles)) {
                if (this.selectedFiles.has(timestamp)) {
                    filesToIgnore.push(timestamp);
                } else {
                    filesToMark.push(timestamp);
                }
            }

            let visibleEntries = _arrayToHash(this.$resultsSimple.find('td[data-timestamp]').toArray(), (el) => [el.dataset.timestamp, el.children[0]]);

            let noneToMark = _empty(filesToMark);
            if (noneToMark && !_empty(filesToIgnore)) {
                for (let timestamp of filesToIgnore) {
                    this.selectedFiles.delete(timestamp);

                    if (visibleEntries[timestamp]) {
                        visibleEntries[timestamp].classList.add('outline');
                    }
                }
            } else if (!noneToMark) {
                for (let timestamp of filesToMark) {
                    this.selectedFiles.add(timestamp);

                    if (visibleEntries[timestamp]) {
                        visibleEntries[timestamp].classList.remove('outline');
                    }
                }
            }
        } else {
            let entriesToMark = [];
            let entriesToIgnore = [];

            for (let uuid of Object.keys(this.currentEntries)) {
                if (this.selectedEntries.has(uuid)) {
                    entriesToIgnore.push(uuid);
                } else {
                    entriesToMark.push(uuid);
                }
            }

            let visibleEntries = _arrayToHash(this.$resultsAdvanced.find('td[data-mark]').toArray(), (el) => [el.dataset.mark, el.children[0]]);

            let noneToMark = _empty(entriesToMark);
            if (noneToMark && !_empty(entriesToIgnore)) {
                for (let uuid of entriesToIgnore) {
                    this.selectedEntries.delete(uuid);

                    if (visibleEntries[uuid]) {
                        visibleEntries[uuid].classList.add('outline');
                    }
                }
            } else if (!noneToMark) {
                for (let uuid of entriesToMark) {
                    this.selectedEntries.set(uuid, this.currentEntries[uuid]);

                    if (visibleEntries[uuid]) {
                        visibleEntries[uuid].classList.remove('outline');
                    }
                }
            }
        }

        this.updateSelectedCounter();
    }

    updateSelectedCounter () {
        if (this.simple) {
            this.$fileCounter.html(this.selectedFiles.size === 0 ? intl('stats.files.selected.no') : this.selectedFiles.size);
        } else {
            this.$fileCounter.html(this.selectedEntries.size === 0 ? intl('stats.files.selected.no') : this.selectedEntries.size);
        }
    }

    updateEntrySearchResults () {
        this.updateSelectedCounter();

        const prefixes = this.$filter_prefix.dropdown('get value');
        const group_identifiers = this.$filter_group.dropdown('get value').map(value => value !== '0' ? value : undefined);
        const player_identifiers = this.$filter_player.dropdown('get value');
        const timestamps = this.$filter_timestamp.dropdown('get value').map(value => parseInt(value));
        const ownership = parseInt(this.$filter_ownership.dropdown('get value'));
        const hidden = this.$filter_hidden.dropdown('get value');
        const hidden_allowed = SiteOptions.hidden;
        const tags = this.$filter_tags.dropdown('get value');
        const type = parseInt(this.$filter_type.dropdown('get value'));

        const { players, groups } = DatabaseManager.getFile(null, null, (data) => {
            const isPlayer = DatabaseManager.isPlayer(data.identifier);

            const conditions = [
                // Prefix
                prefixes.length === 0 || prefixes.includes(data.prefix),
                // Player identifier
                player_identifiers.length === 0 || (isPlayer && player_identifiers.includes(data.identifier)),
                // Group identifiers
                group_identifiers.length === 0 || group_identifiers.includes(isPlayer ? data.group : data.identifier),
                // Timestamps
                timestamps.length === 0 || timestamps.includes(data.timestamp),
                // Tags
                tags.length === 0 || tags.includes(`${data.tag}`),
                // Ownership
                !ownership || data.own != ownership - 1,
                // Type
                !type || isPlayer != type - 1,
                // Hidden
                !hidden_allowed || hidden.length === 0 || (data.hidden && hidden.includes('yes')) || (!data.hidden && hidden.includes('no'))
            ];

            return conditions.reduce((acc, condition) => acc && condition, true);
        })

        const entries = players.concat(groups);

        // Save into current list
        this.currentEntries = entries.reduce((memo, entry) => {
            memo[_uuid(entry)] = entry;
            return memo;
        }, {});

        const displayEntries = entries.sort((a, b) => b.timestamp - a.timestamp).map((entry) => {
            const isPlayer = DatabaseManager.isPlayer(entry.identifier);

            return `
                <tr data-tr-mark="${_uuid(entry)}" ${entry.hidden ? 'style="color: gray;"' : ''}>
                    <td class="cursor-pointer !text-center" data-mark="${_uuid(entry)}"><i class="circle outline icon"></i></td>
                    <td class="!text-center">${ this.timeMap[entry.timestamp] }</td>
                    <td class="!text-center">${ this.prefixMap[entry.prefix] }</td>
                    <td class="!text-center"><i class="ui ${isPlayer ? 'blue user' : 'orange users'} icon"></i></td>
                    <td>${ entry.name }</td>
                    <td>${ isPlayer ? (this.groupMap[entry.group] || '') : '' }</td>
                    <td>${ entry.tag ? `<div class="ui horizontal label" style="background-color: ${_strToHSL(entry.tag)}; color: white;">${entry.tag}</div>` : '' }</td>
                </tr>
            `
        });

        this.$resultsAdvanced.empty();

        this.advancedLoader.start(() => {
            $(displayEntries.splice(0, 25).join('')).appendTo(this.$resultsAdvanced).find('[data-mark]').click((event) => {
                let uuid = event.currentTarget.dataset.mark;

                if (event.shiftKey && this.lastSelectedEntry && this.lastSelectedEntry != uuid) {
                    // Elements
                    const $startSelector = $(`tr[data-tr-mark="${this.lastSelectedEntry}"]`);
                    const $endSelector = $(`tr[data-tr-mark="${uuid}"]`);
                    // Element indexes
                    const startSelectorIndex = $startSelector.index();
                    const endSelectorIndex = $endSelector.index();
                    const selectDown = startSelectorIndex < endSelectorIndex;
                    const elementArray = selectDown ? $startSelector.nextUntil($endSelector) : $endSelector.nextUntil($startSelector);
                    // Get list of timestamps to be changed
                    const toChange = [ uuid, this.lastSelectedEntry ];
                    for (const obj of elementArray.toArray()) {
                        toChange.push(obj.dataset.trMark);
                    }

                    // Change all timestamps
                    if (this.selectedEntries.has(uuid)) {
                        for (const mark of toChange) {
                            $(`[data-mark="${mark}"] > i`).addClass('outline');
                            this.selectedEntries.delete(mark);
                        }
                    } else {
                        for (const mark of toChange) {
                            $(`[data-mark="${mark}"] > i`).removeClass('outline');
                            this.selectedEntries.set(mark, this.currentEntries[mark]);
                        }
                    }
                } else {
                    if ($(`[data-mark="${uuid}"] > i`).toggleClass('outline').hasClass('outline')) {
                        this.selectedEntries.delete(uuid);
                    } else {
                        this.selectedEntries.set(uuid, this.currentEntries[uuid]);
                    }
                }

                this.lastSelectedEntry = uuid;
                this.updateSelectedCounter();
            }).each((index, element) => {
                if (this.selectedEntries.has(element.dataset.mark)) {
                    element.children[0].classList.remove('outline');
                }
            });

            if (displayEntries.length == 0) {
                this.advancedLoader.stop();
            }
        });
    }

    updateFileSearchResults () {
        let currentFilesAll = (SiteOptions.groups_empty ? Array.from(DatabaseManager.Timestamps.keys()) : DatabaseManager.PlayerTimestamps).map((ts) => {
            return {
                timestamp: ts,
                prettyDate: _formatDate(ts),
                playerCount: _lenWhere(Array.from(DatabaseManager.Timestamps.values(ts)), id => DatabaseManager.isPlayer(id)),
                groupCount: _lenWhere(Array.from(DatabaseManager.Timestamps.values(ts)), id => DatabaseManager.isGroup(id)),
                version: DatabaseManager.findDataFieldFor(ts, 'version'),
                tags: (() => {
                    const tagMap = DatabaseManager.findUsedTags([ts]);
                    const tagEntries = _sortDesc(Object.entries(tagMap), ([, a]) => a);

                    let tagContent = '';
                    for (const [name, count] of tagEntries) {
                        const countText = tagEntries.length > 1 ? ` (${count})` : '';

                        if (name === 'undefined') {
                            if (tagEntries.length > 1) {
                                tagContent += `
                                    <div class="ui grey horizontal label">${intl('stats.files.tags.none')}${countText}</div>
                                `;
                            }
                        } else {
                            tagContent += `
                                <div class="ui horizontal label" style="background-color: ${_strToHSL(name)}; color: white;">${name}${countText}</div>
                            `;
                        }
                    }

                    return {
                        tagList: Object.keys(tagMap),
                        tagContent
                    };
                })()
            }
        }).filter(({ tags: { tagList } }) => {
            return typeof this.tagFilter === 'undefined' || tagList.includes(this.tagFilter) || (tagList.includes('undefined') && this.tagFilter === '');
        });

        if (this.expressionFilter && this.expressionFilter.isValid()) {
            currentFilesAll = currentFilesAll.filter(({ tags: { tagList }, timestamp, version }) => {
                return this.expressionFilter.eval(new ExpressionScope().addSelf(
                    Object.assign(
                        DatabaseManager.getFile(null, [ timestamp ]),
                        {
                            timestamp,
                            version,
                            tags: tagList
                        }
                    )
                ));
            });
        }

        this.currentFiles = _arrayToHash(currentFilesAll, file => [file.timestamp, file]);
        this.$resultsSimple.empty();

        const entries = _sortDesc(Object.entries(this.currentFiles), v => v[0]).map(([timestamp, { prettyDate, playerCount, groupCount, version, tags: { tagContent } }]) => {
            const hidden = DatabaseManager.isHidden({ timestamp });

            return `
                <tr data-tr-timestamp="${timestamp}" ${hidden ? 'style="color: gray;"' : ''}>
                    <td class="cursor-pointer !text-center" data-timestamp="${timestamp}"><i class="circle outline icon"></i></td>
                    <td class="!text-center">${ prettyDate }</td>
                    <td class="!text-center">${ playerCount }</td>
                    <td class="!text-center">${ groupCount }</td>
                    <td>${ tagContent }</td>
                    <td class="!text-center">${ version || 'Not known' }</td>
                    <td class="!text-center"></td>
                    <td class="cursor-pointer !text-center" data-edit="${timestamp}"><i class="wrench icon"></i></td>
                </tr>
            `;
        });

        this.simpleLoader.start(() => {
            let $entries = $(entries.splice(0, 25).join('')).appendTo(this.$resultsSimple);

            $entries.find('[data-timestamp]').click((event) => {
                const timestamp = parseInt(event.currentTarget.dataset.timestamp);

                if (event.shiftKey && this.lastSelectedTimestamp && this.lastSelectedTimestamp != timestamp) {
                    // Elements
                    const $startSelector = $(`tr[data-tr-timestamp="${this.lastSelectedTimestamp}"]`);
                    const $endSelector = $(`tr[data-tr-timestamp="${timestamp}"]`);
                    // Element indexes
                    const startSelectorIndex = $startSelector.index();
                    const endSelectorIndex = $endSelector.index();
                    const selectDown = startSelectorIndex < endSelectorIndex;
                    const elementArray = selectDown ? $startSelector.nextUntil($endSelector) : $endSelector.nextUntil($startSelector);
                    // Get list of timestamps to be changed
                    const toChange = [ timestamp, this.lastSelectedTimestamp ];
                    for (const obj of elementArray.toArray()) {
                        toChange.push(parseInt(obj.dataset.trTimestamp));
                    }

                    // Change all timestamps
                    if (this.selectedFiles.has(timestamp)) {
                        for (const ts of toChange) {
                            $(`[data-timestamp="${ts}"] > i`).addClass('outline');
                            this.selectedFiles.delete(ts);
                        }
                    } else {
                        for (const ts of toChange) {
                            $(`[data-timestamp="${ts}"] > i`).removeClass('outline');
                            this.selectedFiles.add(ts);
                        }
                    }
                } else {
                    if ($(`[data-timestamp="${timestamp}"] > i`).toggleClass('outline').hasClass('outline')) {
                        this.selectedFiles.delete(timestamp);
                    } else {
                        this.selectedFiles.add(timestamp);
                    }
                }

                this.lastSelectedTimestamp = timestamp;
                this.updateSelectedCounter();
            }).each((index, element) => {
                if (this.selectedFiles.has(parseInt(element.dataset.timestamp))) {
                    element.children[0].classList.remove('outline');
                }
            });

            $entries.find('[data-edit]').click((event) => {
                const timestamp = parseInt(event.currentTarget.dataset.edit);
                DialogController.open(FileEditDialog, timestamp, () => this.show());
            });

            if (entries.length == 0) {
                this.simpleLoader.stop();
            }
        });
    }

    updateTagFilterButtons () {
        const selector = `[data-tag="${ typeof this.tagFilter === 'undefined' ? '*' : this.tagFilter }"]`;

        this.$tagFilter.find('[data-tag]').addClass('basic inverted').css('color', '').css('background-color', '');

        const $tag = this.$tagFilter.find(selector);
        if ($tag.length > 0) {
            $tag.removeClass('basic inverted');

            if ($tag.data('color')) {
                $tag.css('background-color', $tag.data('color')).css('color', 'white');
            }
        }
    }

    updateFileList () {
        // Tag filters
        let currentTags = Object.keys(DatabaseManager.findUsedTags(undefined));
        if (currentTags.length > 1 || (currentTags.length == 1 && currentTags[0] !== 'undefined')) {
            let content = `
                <div data-tag="*" class="ui basic inverted tiny button" style="margin-bottom: 0.5rem;">${intl('stats.files.tags.all')}</div>
                <div data-tag="" class="ui basic inverted tiny button" style="margin-bottom: 0.5rem;">${intl('stats.files.tags.none')}</div>
            `;

            for (const name of currentTags) {
                if (name !== 'undefined') {
                    content += `
                        <div data-tag="${name}" class="ui basic inverted tiny button" data-color="${_strToHSL(name)}" style="margin-bottom: 0.5rem">${name}</div>
                    `;
                }
            }

            this.$tagFilter.html(content);
            this.$tagFilter.show();

            if (this.tagFilter !== '' && this.tagFilter !== undefined && !currentTags.includes(this.tagFilter)) {
                this.tagFilter = undefined;
            }

            this.updateTagFilterButtons();

            this.$parent.find('[data-tag]').click((event) => {
                const tag = event.currentTarget.dataset.tag;
                const tagToFilter = tag === '*' ? undefined : tag;

                if (tagToFilter !== this.tagFilter) {
                    this.tagFilter = tagToFilter;

                    this.updateTagFilterButtons();
                    this.updateFileSearchResults();
                } else if (typeof tagToFilter !== 'undefined') {
                    this.$parent.find('[data-tag="*"]').click();
                }
            });
        } else {
            this.$tagFilter.hide();
            this.tagFilter = undefined;
        }

        // Expression filter
        this.$filters.html(`
            <div class="field">
                <label>${intl('stats.files.filters.expression')}</label>
                <div class="ta-wrapper">
                    <div class="ui inverted input">
                        <input class="ta-area" style="padding-left: 1em !important;" type="text" placeholder="${intl('stats.files.filters.expression_placeholder')}">
                    </div>
                    <div class="ta-content" style="width: 100%; margin-top: calc(-1em - 16px); margin-left: 1em;"></div>
                </div>
            </div>
        `);

        let $field = this.$filters.find('.ta-area');
        let $parent = $field.closest('.field');

        $field.on('input change', (event) => {
            let content = event.currentTarget.value;

            this.expressionFilter = Expression.create(content);
            this.$filters.find('.ta-content').html(
                Highlighter.expression(content, undefined, this.ExpressionConfig).text
            );

            if (!content || this.expressionFilter) {
                $parent.removeClass('error');
            } else {
                $parent.addClass('error');
            }

            if (event.type === 'change') {
                this.updateFileSearchResults();
            }
        }).val(this.expressionFilter ? this.expressionFilter.string : '').trigger('change');
    }

    updateEntryLists () {
        this.prefixMap = _arrayToHash(DatabaseManager.Prefixes, (prefix) => [prefix, _formatPrefix(prefix)]);
        this.timeMap = _arrayToHash(Array.from(DatabaseManager.Timestamps.keys()), (ts) => [ts, _formatDate(ts)]);
        this.playerMap = DatabaseManager.PlayerNames;
        this.groupMap = Object.assign({ 0: intl('stats.files.filters.none') }, DatabaseManager.GroupNames);

        this.timeArray = Object.entries(this.timeMap).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
        this.tagsArray = Object.keys(DatabaseManager.findUsedTags()).filter(tag => tag !== 'undefined');

        const playerNameFrequency = {};
        for (const name of Object.values(this.playerMap)) {
            if (name in playerNameFrequency) {
                playerNameFrequency[name]++;
            } else {
                playerNameFrequency[name] = 1;
            }
        }

        const groupNameFrequency = {};
        for (const name of Object.values(this.groupMap)) {
            if (name in groupNameFrequency) {
                groupNameFrequency[name]++;
            } else {
                groupNameFrequency[name] = 1;
            }
        }

        this.$filters.html(`
            <div class="field">
                <label>${intl('stats.files.filters.type')}</label>
                <select class="ui fluid search selection inverted dropdown" data-op="files-search-type">
                    <option value="0">${intl('stats.files.filters.any')}</option>
                    <option value="1">${intl('stats.files.filters.player')}</option>
                    <option value="2">${intl('stats.files.filters.group')}</option>
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.timestamp')} (<span data-op="unique-timestamp"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-timestamp">
                    ${ this.timeArray.map(([timestamp, value]) => `<option value="${ timestamp }">${ value }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.player')} (<span data-op="unique-player"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-player">
                    ${ Object.entries(this.playerMap).map(([player, value]) => `<option value="${ player }">${ value }${ playerNameFrequency[value] > 1 ? ` - ${_formatPrefix(player)}` : '' }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.group')} (<span data-op="unique-group"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-group">
                    ${ Object.entries(this.groupMap).map(([group, value]) => `<option value="${ group }">${ value }${ groupNameFrequency[value] > 1 ? ` - ${_formatPrefix(group)}` : '' }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.prefix')} (<span data-op="unique-prefix"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-prefix">
                    ${ Object.entries(this.prefixMap).map(([prefix, value]) => `<option value="${ prefix }">${ value }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.tags')} (<span data-op="unique-tags"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-tags">
                    <option value="undefined">${intl('stats.files.tags.none')}</option>
                    ${ this.tagsArray.map((tag) => `<option value="${ tag }">${ tag }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.ownership')}</label>
                <select class="ui fluid search selection inverted dropdown" data-op="files-search-ownership">
                    <option value="0">${intl('stats.files.filters.ownership_all')}</option>
                    <option value="1">${intl('stats.files.filters.ownership_own')}</option>
                    <option value="2">${intl('stats.files.filters.ownership_other')}</option>
                </select>
            </div>
            <div class="field" ${ SiteOptions.hidden ? '' : 'style="display: none;"' }>
                <label>${intl('stats.files.filters.hidden')}</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-hidden">
                    <option value="yes">${intl('general.yes')}</option>
                    <option value="no">${intl('general.no')}</option>
                </select>
            </div>
        `);

        this.$filter_timestamp = this.$parent.find('[data-op="files-search-timestamp"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_player = this.$parent.find('[data-op="files-search-player"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_group = this.$parent.find('[data-op="files-search-group"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_prefix = this.$parent.find('[data-op="files-search-prefix"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_hidden = this.$parent.find('[data-op="files-search-hidden"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_tags = this.$parent.find('[data-op="files-search-tags"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_ownership = this.$parent.find('[data-op="files-search-ownership"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this)
        });

        this.$filter_type = this.$parent.find('[data-op="files-search-type"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this)
        });

        this.$parent.find('[data-op="unique-timestamp"]').html(Object.keys(this.timeMap).length);
        this.$parent.find('[data-op="unique-player"]').html(Object.keys(this.playerMap).length);
        this.$parent.find('[data-op="unique-group"]').html(Object.keys(this.groupMap).length - 1);
        this.$parent.find('[data-op="unique-prefix"]').html(Object.keys(this.prefixMap).length);
        this.$parent.find('[data-op="unique-tags"]').html(this.tagsArray.length);

        this.updateEntrySearchResults();
    }

    show (params) {
        this.selectedEntries = new Map();
        this.selectedFiles = new Set();

        this.lastSelectedTimestamp = null;
        this.lastSelectedEntry = null;

        Loader.toggle(false);

        this.$tags.toggle(this.simple);
        this.$migrateHidden.toggle(!this.simple && SiteOptions.hidden);

        // Set counters
        if (this.lastChange != DatabaseManager.LastChange || (params && params.forceUpdate)) {
            this.lastChange = DatabaseManager.LastChange;
            if (this.simple) {
                this.updateFileList();
            } else {
                this.updateEntryLists();
            }
            this.updateSelectedCounter();
        } else {
            this.$resultsAdvanced.find('[data-mark] > i').addClass('outline');
            this.$resultsSimple.find('[data-timestamp] > i').addClass('outline');
        }
    }
}

class ScriptsTab extends Tab {
    constructor (parent) {
        super(parent);

        // Reserved script names
        this.reservedScripts = ['players', 'me', 'guilds'];

        // Left sidebar
        this.$list = this.$parent.operator('list');

        this.$selectorDropdown = this.$parent.operator('selector-dropdown');

        // Right sidebar
        this.$helpWiki = this.$parent.operator('help-wiki');
        this.$helpWiki.click(() => {
            window.open('https://github.com/HafisCZ/sf-tools/wiki', '_blank');
        });

        this.$helpManual = this.$parent.operator('help-manual');
        this.$helpManual.click(() => {
            DialogController.open(ScriptManualDialog);
        });

        this.$libraryScripts = this.$parent.operator('library-scripts');
        this.$libraryScripts.click(() => {
            DialogController.open(ScriptRepositoryDialog, (content) => this.editor.content = content);
        });

        this.$libraryTemplates = this.$parent.operator('library-templates');
        this.$libraryTemplates.click(() => {
            DialogController.open(TemplateManageDialog, this.script.parent, () => this._updateSidebars());
        });
 
        // Actions
        this.$copy = this.$parent.operator('copy');
        this.$copy.click(() => {
            copyText(this.editor.content);
        });

        this.$export = this.$parent.operator('export');
        this.$export.click(() => {
            Exporter.txt(this.editor.content, `script_${Exporter.time}`);
        });

        this.$import = this.$parent.operator('import');
        this.$import.change(async (event) => {
            const text = await _dig(event, 'currentTarget', 'files', 0).text();
 
            this.editor.content = text;
        })

        // Archive
        this.$libraryArchive = this.$parent.operator('library-archive');
        this.$libraryArchive.click((event) => {
            if (event.ctrlKey && this._hasArchivedPreviousVersion()) {
                this.editor.content = ScriptArchive.find('overwrite_script', this.script.name, this.script.version - 1).content;

                this._updateSidebars();
            } else {
                DialogController.open(ScriptArchiveDialog, (content) => {
                    if (content === true) {
                        this._updateSidebars();
                    } else {
                        this.editor.content = content;
                    }
                });
            }
        });

        // Button handling
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.returnTo();
        });

        this.$reset = this.$parent.operator('reset');
        this.$reset.click(() => {
            this.hide();
            this.show({ key: this.script.name });
        });

        this.$save = this.$parent.operator('save');
        this.$save.click((event) => {
            this.save();
            if (event.ctrlKey && this.returnTo) {
                this.returnTo();
            }
        });

        this.$remove = this.$parent.operator('remove');
        this.$remove.click(() => {
            DialogController.open(
                ConfirmationDialog,
                intl('dialog.delete_script.title'),
                intl('dialog.delete_script.notice'),
                () => this.remove(),
                null
            );
        });

        this.$saveTemplate = this.$parent.operator('save-template');
        this.$saveTemplate.click((event) => {
            if (event.ctrlKey && this.returnTo && this.script.parent) {
                this.save();

                TemplateManager.save(this.script.parent, this.editor.content);

                this.returnTo();
            } else {
                DialogController.open(
                    TemplateSaveDialog,
                    this.script.parent,
                    (name) => {
                        TemplateManager.save(name, this.editor.content);
    
                        this.script.parent = name;
    
                        this._contentChanged(true, 'parent');
                        this._updateSidebars();
                    }
                )
            }
        })

        this.editor = new ScriptEditor(
            this.$parent,
            ScriptType.Table,
            (value) => this._contentChanged(this.script && value !== this.script.content, 'content')
        )

        // React to CTRL presses
        this.ctrlDown = false;
        this._updateButtons();

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Control' && !this.ctrlDown) {
                this.ctrlDown = true;
                this._updateButtons();
            }
        });

        window.addEventListener('keyup', (event) => {
            if (event.key === 'Control' && this.ctrlDown) {
                this.ctrlDown = false;
                this._updateButtons();
            }
        });
    }

    _updateButtons () {
        if (UI.current !== this) {
            return;
        }

        if (this.ctrlDown && this.returnTo) {
            this.$save.find('i').removeClass('save').addClass('reply')
            
            if (this.script.parent) {
                this.$saveTemplate.find('i').removeClass('save').addClass('reply')
            }
        } else {
            this.$save.find('i').removeClass('reply').addClass('save')
            this.$saveTemplate.find('i').removeClass('reply').addClass('save')
        }

        if (this.ctrlDown && this._hasArchivedPreviousVersion()) {
            this.$libraryArchive.find('i').removeClass('archive').addClass('box open');

            const version = this.script.version - 1;
            this.$libraryArchive.find('span').text(intl('stats.scripts.sidebar.recover', { version }));
        } else {
            this.$libraryArchive.find('i').addClass('archive').removeClass('box open');
            this.$libraryArchive.find('span').text(intl('stats.scripts.sidebar.archive'));
        }
    }

    _hasArchivedPreviousVersion () {
        return this.script && !isNaN(this.script.version) && this.script.version > 1 && ScriptArchive.find('overwrite_script', this.script.name, this.script.version - 1);
    }

    // Returns default key for specified key
    _defaultKey (value) {
        if (value === 'players' || value === 'me') {
            return value;
        } else if (value.includes('_p')) {
            return 'me';
        } else {
            return 'guilds';
        }
    }

    // Returns default template for specified key
    _defaultContent (value) {
        return DefaultScripts.getContent({ players: 'browse', me: 'players', guilds: 'groups' }[this._defaultKey(value)]);
    }

    remove () {
        ScriptManager.remove(this.script.name);
        if (this.returnTo) {
            this.returnTo();
        } else {
            this.show({});
        }
    }

    show ({ origin, key }) {
        if ([UI.Browse, UI.GroupDetail, UI.PlayerDetail].includes(origin)) {
            this.returnTo = () => UI.returnTo(origin);
        } else if (typeof origin !== 'undefined') {
            this.returnTo = null;
        }

        this._setScript(key || _dig(origin, 'identifier') || 'players');
        this._updateSidebars();
    }

    _setScript (key) {
        this.script = Object.assign({
            name: key,
            content: this._defaultContent(key),
            parent: null
        }, ScriptManager.get(key, this._defaultKey(key)) || {});

        this.editor.content = this.script.content;
        this.editor.scrollTop();

        this._contentChanged(false);
    }

    save () {
        this.script.content = this.editor.content;
        this.script.version = ScriptManager.save(this.script.name, this.script.content, this.script.parent);

        this._updateSidebars();
        this._contentChanged(false);
    }

    _contentChanged (valueChanged, ...changes) {
        if (typeof this.changes === 'undefined') {
            this.changes = {};
        }

        if (!valueChanged && changes.length === 0) {
            this.changes = {};
        } else {
            for (const change of changes) {
                if (valueChanged) {
                    this.changes[change] = true;
                } else {
                    delete this.changes[change];
                }
            }
        }

        const wasChanged = Object.keys(this.changes).length > 0;
        const wasSaved = this.script ? (this.reservedScripts.includes(this.script.name) || ScriptManager.exists(this.script.name)) : false;

        if (wasChanged) {
            this.$reset.removeClass('disabled');
        } else {
            this.$reset.addClass('disabled');
        }
        
        if (wasSaved && !wasChanged) {
            this.$save.removeClass('yellow').addClass('disabled inverted');
        } else {
            this.$save.addClass('yellow').removeClass('disabled inverted');
        }

        if (this.script) {
            this.$parent.find('[data-template-name]').removeClass('background-light');
            this.$parent.find(`[data-template-name="${this.script.parent}"]`).addClass('background-light');
        }
    }

    hide () {
        if (Object.keys(this.changes).length > 0) {
            ScriptArchive.add('discard_script', this.script.name, this.script.version || 1, this.editor.content);
        }
    }

    _getFormattedScriptName (script) {
        const name = this._getScriptName(script.name);
        const icon = this._getScriptIcon(script.name);
        return `
            <div>
                <i class="ui ${icon} icon"></i>
                <span>${name}</span>
                ${isNaN(script.version) ? '' : `<span class="script-version text-gray">v${script.version}</span>`}
            </div>
        `;
    }

    _getScriptName (value) {
        if (this.reservedScripts.includes(value)) {
            return intl(`stats.scripts.types.${value}`);
        } else {
            return DatabaseManager.PlayerNames[value] || DatabaseManager.GroupNames[value] || value;
        }
    }

    _updateSidebars () {
        // Template list
        let content = '';
        for (const { name, version, timestamp } of TemplateManager.sortedList()) {
            content += `
                <div data-template-name="${name}" class="!border-radius-1 border-gray p-4 background-dark background-light:hover cursor-pointer flex gap-2 items-center ${this.script && this.script.parent === name ? 'background-light' : ''}">
                    <div>
                        <div>${name}</div>
                        <div class="text-gray">v${isNaN(version) ? 1 : version} - ${_formatDate(timestamp)}</div>
                    </div>
                </div>
            `;
        }

        this.$list.html(content);
        this.$list.find('[data-template-name]').click((event) => {
            const name = event.currentTarget.dataset.templateName;

            this.editor.content = TemplateManager.getContent(name);

            if (this.script.parent !== name) {
                this.script.parent = name;
                this._contentChanged(true, 'parent');
            }
        });

        if (this.returnTo) {
            this.$close.show();
        } else {
            this.$close.hide();
        }

        const values = [
            ...this.reservedScripts.map((name) => {
                const script = Object.assign({ name }, ScriptManager.get(name, this._defaultKey(name)) || {});

                return {
                    name: this._getFormattedScriptName(script),
                    value: name
                }
            }),
            ...ScriptManager.list().filter((script) => !this.reservedScripts.includes(script.name)).map((script) => ({
                name: this._getFormattedScriptName(script),
                value: script.name
            }))
        ]

        if (values.every(({ value }) => this.script.name !== value)) {
            // if there is no script for current, add it
            values.push({
                name: this._getFormattedScriptName(this.script),
                value: this.script.name
            })
        }

        this.$selectorDropdown.dropdown({ values })
        this.$selectorDropdown.dropdown('set selected', this.script.name);
        this.$selectorDropdown.dropdown('setting', 'onChange', (value) => {
            if (this.script.name === value) {
                // Ignore if identical
                return;
            }

            if (this.returnTo) {
                this.returnTo = null;
                this._updateSidebars();
            }

            this._setScript(value);
        })

        if (ScriptManager.exists(this.script.name)) {
            this.$remove.removeClass('disabled');
        } else {
            this.$remove.addClass('disabled');
        }

        if (ScriptArchive.empty()) {
            this.$libraryArchive.addClass('disabled');
        } else {
            this.$libraryArchive.removeClass('disabled');
        }

        this._updateButtons();
    }

    _getScriptIcon (value) {
        if (this.reservedScripts.includes(value)) {
            return { players: 'database', me: 'user', guilds: 'archive' }[value];
        } else if (DatabaseManager.isPlayer(value)) {
            return 'user';
        } else {
            return 'archive';
        }
    }
}

class SettingsTab extends Tab {
    constructor (parent) {
        super(parent)

        this.$dropdownTab = this.$parent.find('[data-op="dropdown-tab"]');
        this.$dropdownTab.dropdown();
        this.$dropdownTab.dropdown('set selected', SiteOptions.tab);
        this.$dropdownTab.dropdown('setting', 'onChange', (value) => {
            SiteOptions.tab = value;
        });

        this.$dropdownPreloadRows = this.$parent.find('[data-op="dropdown-load-rows"]');
        this.$dropdownPreloadRows.dropdown();
        this.$dropdownPreloadRows.dropdown('set selected', SiteOptions.load_rows);
        this.$dropdownPreloadRows.dropdown('setting', 'onChange', (value) => {
            SiteOptions.load_rows = parseInt(value) || SiteOptions.default('load_rows');
        });

        this.prepareCheckbox('always_prev', 'alwaysprev');
        this.prepareCheckbox('unsafe_delete', 'unsafe-delete');
        this.prepareCheckbox('terms_accepted', 'terms');
        this.prepareCheckbox('table_sticky_header', 'table-sticky-header')

        SiteOptions.onChange('terms_accepted', enabled => {
            if (enabled) {
                this.$parent.find(`[data-op="checkbox-terms"]`).checkbox('set checked');
            } else {
                DialogController.open(TermsAndConditionsDialog);
            }
        });

        this.$save = this.$parent.find('[data-op="save"]').click(() => {
            Actions.setScript(this.editor.content);

            DatabaseManager.refreshTrackers();

            this.$save.addClass('disabled');
            this.$reset.addClass('disabled');
        });

        this.$reset = this.$parent.find('[data-op="discard"]').click(() => {
            this.editor.content = Actions.getScript();
        });

        this.editor = new ScriptEditor(this.$parent, ScriptType.Action, val => {
            if (val === Actions.getScript()) {
                this.$save.addClass('disabled');
                this.$reset.addClass('disabled');
            } else {
                this.$save.removeClass('disabled');
                this.$reset.removeClass('disabled');
            }
        });

        // recovery
        this.$recoveryExport = this.$parent.find('[data-op="export"]');
        this.$recoveryImport = this.$parent.find('[data-op="import"]');

        this.$recoveryExport.click(() => this.exportDumpFile());
        this.$recoveryImport.change((event) => this.importDumpFile(event));
    }

    async exportDumpFile () {
        Loader.toggle(true);

        Exporter.json(
            await Site.dump(),
            `recovery_dump_${Exporter.time}`
        );

        Loader.toggle(false);
    }

    importDumpFile (fileEvent) {
        DialogController.open(ConfirmationDialog, intl('stats.settings.recovery.title'), intl('stats.settings.recovery.notice'), async function () {
            Loader.toggle(true);

            Toast.info(intl('stats.settings.recovery.title'), intl('stats.settings.recovery.toast'));

            let data = await _dig(fileEvent, 'currentTarget', 'files', 0).text().then(fileContent => JSON.parse(fileContent));
            await Site.recover(data);

            window.location.href = window.location.href;
        }, () => {}, true, 2)
    }

    // Prepare checkbox
    prepareCheckbox (property, name) {
        this.$parent.find(`[data-op="checkbox-${ name }"]`).checkbox({
            onChecked: () => { SiteOptions[property] = true },
            onUnchecked: () => { SiteOptions[property] = false }
        }).checkbox(SiteOptions[property] ? 'set checked' : 'set unchecked');
    }

    show () {
        this.editor.content = Actions.getScript();
    }
}

class ProfilesTab extends Tab {
    static get PLAYER_EXPRESSION_CONFIG () {
        delete this.PLAYER_EXPRESSION_CONFIG;
 
        const config = DEFAULT_EXPRESSION_CONFIG.clone();
        for (const name of ['timestamp', 'identifier', 'prefix', 'tag', 'version', 'own', 'name', 'identifier', 'group', 'groupname', 'save']) {
            config.register('accessor', 'none', name, (object) => object[name]);
        }

        return (this.PLAYER_EXPRESSION_CONFIG = config);
    }

    static get GROUP_EXPRESSION_CONFIG () {
        delete this.GROUP_EXPRESSION_CONFIG;
 
        const config = DEFAULT_EXPRESSION_CONFIG.clone();
        for (const name of ['timestamp', 'identifier', 'prefix', 'own', 'name', 'identifier', 'save']) {
            config.register('accessor', 'none', name, (object) => object[name]);
        }

        return (this.GROUP_EXPRESSION_CONFIG = config);
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]')
    }

    show () {
        let content = '';
        for (const [key, profile] of ProfileManager.getProfiles()) {
            const { name, primary, secondary, primary_g, secondary_g } = profile;

            content += `
                <div class="row" style="margin-top: 1em; border: 1px solid grey; border-radius: .25em;">
                    <div class="four wide column">
                        <h3 class="ui inverted ${ key == ProfileManager.getActiveProfileName() ? 'orange' : '' } header">
                            <span data-key="${key}" class="cursor-pointer">${name}</span><br/>
                            ${ profile.slot ? `<span style="font-size: 90%;">Slot ${profile.slot}</span><br>` : '' }
                            <span style="font-size: 90%;">(${key})</span>
                        </h3>
                        ${
                            ProfileManager.isEditable(key) ? `
                                <div style="position: absolute; left: 1em; bottom: 0;">
                                    <i class="cursor-pointer trash alternate outline icon !text-red:hover" data-delete="${key}"></i>
                                    <i class="cursor-pointer wrench icon" style="margin-left: 1em;" data-edit="${key}"></i>
                                </div>
                            ` : ''
                        }
                    </div>
                    <div class="twelve wide column">
                        <table class="ui basic black inverted table" style="table-layout: fixed;">
                            <tr>
                                <td style="width: 20%;"></td>
                                <td style="width: 40%;">${intl('stats.profiles.players')}</td>
                                <td style="width: 40%;">${intl('stats.profiles.groups')}</td>
                            </tr>
                            <tr>
                                <td>${intl('stats.profiles.primary')}</td>
                                <td>${ this.showRules(primary) }</td>
                                <td>${ this.showRules(primary_g) }</td>
                            </tr>
                            <tr>
                                <td>${intl('stats.profiles.secondary')}</td>
                                <td>${ secondary ? Highlighter.expression(secondary, undefined, ProfilesTab.PLAYER_EXPRESSION_CONFIG).text : `<b>${intl('stats.profiles.none')}</b>` }</td>
                                <td>${ secondary_g ? Highlighter.expression(secondary_g, undefined, ProfilesTab.GROUP_EXPRESSION_CONFIG).text : `<b>${intl('stats.profiles.none')}</b>` }</td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        }

        content += `
            <div class="row" style="margin-top: 1em;">
                <div class="sixteen wide column" style="padding: 0;">
                    <div class="ui fluid basic inverted button" data-op="create" style="margin: -1em; padding: 1em; margin-left: 0; line-height: 2em;">${intl('stats.profiles.create')}</div>
                </div>
            </div>
        `

        this.$list.html(content);
        this.$parent.find('[data-key]').click(event => {
            const key = event.currentTarget.dataset.key;
            ProfileManager.setActiveProfile(key);
            window.location.href = window.location.href;
        });

        this.$parent.find('[data-delete]').click((event) => {
            const key = event.currentTarget.dataset.delete;
            ProfileManager.removeProfile(key);
            this.show();
        });

        this.$parent.find('[data-edit]').click((event) => {
            const key = event.currentTarget.dataset.edit;
            DialogController.open(ProfileCreateDialog, () => this.show(), key);
        });

        this.$parent.find('[data-op="create"]').click(() => {
            this.addProfile();
            this.show();
        });
    }

    addProfile () {
        DialogController.open(ProfileCreateDialog, () => this.show());
    }

    showRules (rule) {
        if (rule) {
            const { name, mode, value } = rule;
            if (mode == 'between') {
                return `<b>${name}</b> ${intl('stats.profiles.between')} ${Highlighter.expression(value[0], undefined, DEFAULT_EXPRESSION_CONFIG).text} ${intl('stats.profiles.and')} ${Highlighter.expression(value[1], undefined, DEFAULT_EXPRESSION_CONFIG).text}`;
            } else {
                return `<b>${name}</b> ${this.stringifyMode(mode)} ${value ? value.map(v => Highlighter.expression(v, undefined, DEFAULT_EXPRESSION_CONFIG).text).join('<br/>') : ''}`;
            }
        } else {
            return `<b>${intl('stats.profiles.none')}</b>`;
        }
    }

    stringifyMode (v) {
        return {
            'above': '>',
            'below': '<',
            'equals': '='
        }[v] || '??';
    }
}

Site.ready(null, function (urlParams) {
    let profile = ProfileManager.getProfile(urlParams.get('profile'));
    if (urlParams.has('temp')) {
        Store.temporary();

        $('.css-temporary').show();

        profile = {
            temporary: true
        };
    } else if (urlParams.has('slot')) {
        profile['slot'] = urlParams.get('slot');
    }

    Loader.toggle(true);
    DatabaseManager.load(profile).then(function () {
        UI.register({
            Players: {
                tab: new PlayersTab('view-players'),
                buttonId: 'show-players'
            },
            PlayerDetail: {
                tab: new PlayerDetailTab('view-player-detail'),
                buttonId: 'show-players',
                buttonClickable: false
            },
            Groups: {
                tab: new GroupsTab('view-groups'),
                buttonId: 'show-groups'
            },
            GroupDetail: {
                tab: new GroupDetailTab('view-group-detail'),
                buttonId: 'show-groups',
                buttonClickable: false
            },
            Browse: {
                tab: new BrowseTab('view-browse'),
                buttonId: 'show-browse'
            },
            Scripts: {
                tab: new ScriptsTab('view-scripts'),
                buttonId: 'show-scripts'
            },
            Files: {
                tab: new FilesTab('view-files'),
                buttonId: 'show-files'
            },
            Settings: {
                tab: new SettingsTab('view-settings'),
                buttonId: 'show-settings'
            },
            Profiles: {
                tab: new ProfilesTab('view-profiles'),
                buttonId: 'show-profiles',
                buttonDisabled: urlParams.has('temp')
            }
        });

        Loader.toggle(false);

        const defaultTab = urlParams.has('temp') ? UI.Files : ({
            'players': UI.Players,
            'groups': UI.Groups,
            'browse': UI.Browse,
            'scripts': UI.Scripts,
            'files': UI.Files
        }[urlParams.get('tab') || SiteOptions.tab] || UI.Groups)

        UI.show(defaultTab);

        if (urlParams.has('template')) {
            DialogController.open(SaveOnlineScriptDialog, urlParams.get('template'));
        }
    }).catch(function (e) {
        Loader.toggle(false);
        DialogController.open(ErrorDialog, `<h4 class="ui inverted header text-center">${intl('database.fatal_error#')}</h4><br>${e.message}`);
        Logger.error(e, 'Database could not be opened!');
    });
});