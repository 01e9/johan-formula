(function($){
    var increment = 0,
        outputTimeouts = {};

    var classes = {
        /**
         * Main class that holds everything
         * @param {Object} [opts]
         * @constructor
         */
        Formula: function (opts) {
            opts = opts || {};

            /**
             * @type {number}
             * @readonly
             */
            this.id = ++increment;

            /**
             * @type {classes.Element[]}
             * @readonly
             */
            this.elements = [];

            /**
             * View element
             * All events are triggered on it
             * @type {jQuery}
             * @readonly
             */
            this.$el = (opts.$el ? $(opts.$el) : $('<div></div>'))
                .addClass('johan-formula')
                .attr('id', 'johan-formula-'+ this.id);

            /**
             * Stores the JSON value
             * @type {jQuery}
             * @readonly
             */
            this.$output = opts.$output ? $(opts.$output) : $('<input type="hidden" value="[]">');

            /**
             * User input
             * @type {classes.Input}
             * @readonly
             */
            this.input = new classes.Input(this);

            /**
             * @type {Object}
             * @readonly
             */
            this.types = $.extend({}, opts.elementTypes || {}, elementTypes);

            this.$el
                // Click on root wrapper
                .on('click', function (e) {
                    if (e.target !== this.$el[0]) {
                        return;
                    }

                    this.input.$input.focus();
                }.bind(this))
                // Click on element
                .on('click', '.formula-element', function(e){
                    var $element = $(e.target);

                    if (!$element.hasClass('formula-element')) {
                        return;
                    }

                    if ($.isArray($element.data('johanFormula').elements)) {
                        if (e.offsetX < $element.width() / 2) {
                            // clicked on first half of the element
                            $element.prepend(this.input.$el);
                        } else {
                            $element.append(this.input.$el);
                        }
                    } else {
                        if (e.offsetX < $element.width() / 2) {
                            // clicked on first half of the element
                            $element.before(this.input.$el);
                        } else {
                            $element.after(this.input.$el);
                        }
                    }

                    this.input.$input.focus();
                }.bind(this))
                .append(this.input.$el);

            this.$el.data('johanFormula', this);

            this.render();

            if (this.$output.val().length) {
                try {
                    this.setFormula(JSON.parse(this.$output.val()));
                } catch (e) {
                    console.error('[Johan Formula] Restore failed');
                    console.trace(e.stack);
                }
            }
        },
        /**
         * Formula element
         * @param {classes.Formula} formula
         * @param {String} type
         * @param {String} value
         * @param {Object} [attr]
         * @constructor
         */
        Element: function (formula, type, value, attr) {
            /**
             * @type {number}
             * @readonly
             */
            this.id = ++increment;

            /**
             * @type {classes.Formula}
             * @readonly
             */
            this.formula = formula;

            /**
             * @type {String}
             * @readonly
             */
            this.type = type;

            /**
             * @type {String}
             * @readonly
             */
            this.value = value;

            /**
             * Custom attributes depending on type
             * @type {Object}
             * @readonly
             */
            this.attr = attr;

            /**
             * Nested elements (if current type supports)
             * @type {classes.Element[]|null} [] - if container, null - otherwise
             * @readonly
             */
            this.elements = null;

            /**
             * View element
             * All events are triggered on it
             * @type {jQuery}
             * @readonly
             */
            this.$el = $('<div class="formula-element type-'+ this.type +'" id="formula-element-'+ this.id +'"></div>');

            if (typeof this.formula.types[this.type] === 'undefined') {
                throw 'Invalid type: '+ this.type;
            } else {
                $.extend(this, this.formula.types[this.type]);
            }

            if (typeof this.init === 'function') {
                this.init();
            }

            this.$el.data('johanFormula', this);

            this.render();

            this.formula.output();
        },
        Input: function (formula) {
            /**
             * @type {classes.Formula}
             * @readonly
             */
            this.formula = formula;

            /**
             * @type {jQuery}
             */
            this.$el = $(
                '<div class="formula-input">'+
                /**/'<input type="text" maxlength="30">'+
                '</div>'
            );

            /**
             * @type {jQuery}
             */
            this.$input = this.$el.find('input:first');

            this.$input
                .on('keydown keyup jf:update-width', this.updateWidth.bind(this))
                .on('keypress', function (e) {
                    if (e.which === 13) {
                        e.preventDefault(); // Prevent form submit
                    }
                })
                .on('keyup', function (e) {
                    var value = $.trim(this.$input.val()),
                        type = this.matchType(value);

                    if (e.which === 13 || e.which === 32) {
                        if (type) {
                            this.$input.val('').trigger('jf:update-width');
                            this.formula.addElementAtCursor(type, value);
                        } else {
                            this.setState('error');
                        }
                    } else {
                        if (type) {
                            this.setState('match');
                        }
                    }
                }.bind(this))
                // Move input on arrow keys press
                .on('keydown', function(e){
                    if ($.trim(this.$input.val()).length !== 0) {
                        return;
                    }

                    switch (e.which) {
                        case 37: // left
                            if (this.$el.prev().length) {
                                if ($.isArray(this.$el.prev().data('johanFormula').elements)) {
                                    // go inside if element is container
                                    this.$el.prev().append(this.$el);
                                } else {
                                    this.$el.prev().before(this.$el);
                                }
                            } else if (this.$el.parent().closest('.formula-element').length) {
                                this.$el.parent().closest('.formula-element').before(this.$el);
                            }
                            break;
                        case 39: // right
                            if (this.$el.next().length) {
                                if ($.isArray(this.$el.next().data('johanFormula').elements)) {
                                    // go inside if element is container
                                    this.$el.next().prepend(this.$el);
                                } else {
                                    this.$el.next().after(this.$el);
                                }
                            } else if (this.$el.parent().closest('.formula-element').length) {
                                this.$el.parent().closest('.formula-element').after(this.$el);
                            }
                            break;
                        case 8: // backspace
                            if (this.$el.prev().length) {
                                this.$el.prev().data('johanFormula').destroy();
                            }
                            break;
                        case 46: // delete
                            if (this.$el.next().length) {
                                this.$el.next().data('johanFormula').destroy();
                            }
                            break;
                        default:
                            return;
                    }

                    this.$input.focus();
                }.bind(this));
        }
    };

    classes.Formula.prototype = {
        increment: 0,
        /**
         * @returns {Array}
         */
        getFormula: function () {
            function recursiveReadElements(element) {
                var result = {
                    type: element.type,
                    value: element.value
                };

                if (!$.isEmptyObject(element.attr)) {
                    result.attr = element.attr;
                }

                if ($.isArray(element.elements)) {
                    result.elements = [];

                    for (var i = 0; i < element.elements.length; i++) {
                        result.elements.push(recursiveReadElements(element.elements[i]));
                    }
                }

                return result;
            }

            var result = [];
            for (var i = 0; i < this.elements.length; i++) {
                result.push(recursiveReadElements(this.elements[i]));
            }

            // destroy references
            result = JSON.parse(JSON.stringify(result));

            return result;
        },
        /**
         * Reload everything from the given object
         * @param {Array} formula
         */
        setFormula: function (formula) {
            while (this.elements.length) {
                this.elements[this.elements.length - 1].destroy();
            }

            var recursiveCreateElements = function (parent, element) {
                var instance = new classes.Element(this, element.type, element.value, element.attr || {});
                parent.elements.push(instance);
                parent.$el.append(instance.$el);

                if ($.isArray(element.elements)) {
                    for (var i = 0; i < element.elements.length; i++) {
                        recursiveCreateElements(instance, element.elements[i]);
                    }
                }
            }.bind(this);
            for (var i = 0; i < formula.length; i++) {
                recursiveCreateElements(this, formula[i]);
            }

            this.$el.append(this.input.$el);
        },
        output: function () {
            clearTimeout(outputTimeouts[this.id]);
            outputTimeouts[this.id] = setTimeout(function(){
                if (this.isValid()) {
                    this.$output.val(JSON.stringify(this.getFormula())).trigger('change');
                }
            }.bind(this), 0);
        },
        render: function () {
            this.renderElements();
        },
        addElementAtCursor: function (type, value, attr) {
            var element = new classes.Element(this, type, value, attr || {}),
                parentEl = this.input.$el.closest('.formula-element, .johan-formula').data('johanFormula'),
                pos;

            if (-1 !== (pos = this.input.$el.prev().index())) {
                pos++;
            } else if (-1 !== (pos = this.input.$el.next().index())) {
                pos--;
            } else {
                pos = parentEl.elements.length
            }

            parentEl.elements.splice(pos, 0, element);
            this.input.$el.before(element.$el);
            parentEl.render();

            if (typeof element.afterAdd === 'function') {
                element.afterAdd();
            }

            this.input.$input.focus();
        },
        isValid: function () {
            function recursiveFindInvalid(prevEl, el, nextEl) {
                if (el.isValid(prevEl, nextEl)) {
                    el.$el.removeClass('is-invalid');
                } else {
                    el.$el.addClass('is-invalid');
                    throw el;
                }

                if ($.isArray(el.elements)) {
                    for (var i = 0; i < el.elements.length; i++) {
                        recursiveFindInvalid(
                            (i !== 0)
                                ? el.elements[i - 1]
                                : null,
                            el.elements[i],
                            (i + 1 !== el.elements.length)
                                ? el.elements[i + 1]
                                : null
                        );
                    }
                }
            }

            try {
                for (var i = 0; i < this.elements.length; i++) {
                    recursiveFindInvalid(
                        (i !== 0)
                            ? this.elements[i - 1]
                            : null,
                        this.elements[i],
                        (i + 1 !== this.elements.length)
                            ? this.elements[i + 1]
                            : null
                    );
                }
            } catch (e) {
                if (e instanceof classes.Element) {
                    return false;
                } else {
                    throw e;
                }
            }

            return true;
        }
    };

    classes.Element.prototype = {
        /**
         * Elements can have different types but be in the same category (return type for example)
         * This is used in validation
         * @returns {String}
         */
        getCategory: function () {
            return 'number';
        },
        render: function () {
            this.$el.text(this.value);
        },
        /**
         * @private Do not overwrite this. Create onDestroy() method for garbage collection
         */
        destroy: function () {
            if ($.isArray(this.elements)) {
                while (this.elements.length) {
                    this.elements[this.elements.length - 1].destroy();
                }
            }

            if (typeof this.onDestroy === 'function') {
                this.onDestroy();
            }

            var parent = this.$el.parent().closest('.formula-element, .johan-formula').data('johanFormula'),
                index = $.inArray(this, parent.elements);
            if (index !== -1) {
                parent.elements.splice(index, 1);
            }

            this.$el.remove();

            this.formula.output();
        },
        /**
         * Check if the element is valid and its neighbors are supported (it's in the right position)
         * @param {null|classes.Element} prevEl
         * @param {null|classes.Element} nextEl
         * @return {Boolean}
         */
        isValid: function(prevEl, nextEl) {
            return (
                (!prevEl || prevEl.getCategory() === 'operator')
                &&
                (!nextEl || nextEl.getCategory() === 'operator')
            );
        }
    };

    classes.Input.prototype = {
        updateWidth: function () {
            this.$input.css('width', (this.$input.val().length + 2) +'ch');
        },
        setState: function (state) {
            this.$el.removeClass('has-error has-match');

            switch (state) {
                case 'error':
                case 'match':
                    this.$el
                        .addClass('has-'+ state)
                        // Clear state on next key press
                        .off('.clearState').one('keydown.clearState', this.setState.bind(this));
                    break;
            }
        },
        /**
         * Find a type that accepts this value format
         * @param {String} value
         * @returns {string}
         */
        matchType: function (value) {
            var winnerMatch = {
                type: '',
                priority: 0
            };

            value = $.trim(value);
            if (!value.length) {
                return winnerMatch.type;
            }

            for (var type in this.formula.types) {
                if (
                    !this.formula.types.hasOwnProperty(type) ||
                    typeof this.formula.types[type].match === 'undefined'
                ) {
                    continue;
                }

                var match = this.formula.types[type].match(value);
                if (match && match > winnerMatch.priority) {
                    winnerMatch.type = type;
                    winnerMatch.priority = match;
                }
            }

            return winnerMatch.type;
        }
    };

    /**
     * Available types
     */
    var elementTypes = {
        operator: {
            getCategory: function () {
                return 'operator';
            },
            init: function () {
                this.elements = null;
            },
            match: function(value) {
                return $.inArray(value, ['+', '-', '*', '/']) !== -1;
            },
            isValid: function(prevEl, nextEl) {
                return (
                    (prevEl && prevEl.getCategory() === 'number')
                    &&
                    (nextEl && nextEl.getCategory() === 'number')
                );
            }
        },
        number: {
            init: function () {
                this.elements = null;
            },
            match: function(value) {
                return /^\d*\.?\d+$/.test(value);
            }
        },
        parentheses: {
            init: function () {
                this.elements = [];
                this.value = null;
            },
            match: function(value) {
                return value === '(';
            },
            render: function() {
                //
            },
            afterAdd: function () {
                this.$el.append(this.formula.input.$el);
                this.formula.input.$input.focus();
            },
            isValid: function(prevEl, nextEl) {
                return (
                    this.elements.length
                    &&
                    (!prevEl || prevEl.getCategory() === 'operator')
                    &&
                    (!nextEl || nextEl.getCategory() === 'operator')
                );
            }
        }
    };

    var commonTrait = {
        renderElements: function () {
            var $input = this.$el.find('> .formula-input'),
                inputIndex = $input.index(),
                isFocus = $input.find('input:focus'),
                $cursor;

            for (var i = 0; i < this.elements.length; i++) {
                if (i === 0) {
                    this.$el.prepend(this.elements[i].$el);
                } else {
                    $cursor.after(this.elements[i].$el);
                }
                $cursor = this.elements[i].$el;
            }

            // Restore input position
            if (inputIndex !== -1 && $input.index() !== inputIndex) {
                this.$el.find('> :nth-child('+ inputIndex +')').after($input);

                if (isFocus) {
                    $input.find('input').focus();
                }
            }
        }
    };
    $.extend(classes.Formula.prototype, commonTrait);
    $.extend(classes.Element.prototype, commonTrait);

    $.fn.johanFormula = function (opts) {
        this.each(function(){
            if (!$(this).data('johanFormula')) {
                new classes.Formula(
                    $.extend({}, opts, {$el: $(this)})
                );
            }
        });

        return this;
    };
})(jQuery);