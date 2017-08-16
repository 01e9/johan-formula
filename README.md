# Johan Formula

Simple, nice looking formula builder.

## Usage

```html
<div class="formula"></div>
<input type="hidden" name="formula"> 
```

```javascript
$('.formula').johanFormula({
    // Save JSON in this input
    $output: $('input[name="formula"]'),

    // Define new element types
    elementTypes: {
        // Note: All methods are optional
        typeName: {
            init: function () {
                // [] - if element is a container (can hold other elements)
                // null - if element can't hold other elements
                this.elements = null;
            },
            // Check if user input matches your value format
            match: function(value) {
                return 'SpecialValueFormat' === value;
            },
            // Custom render
            render: function() {
                this.$el.text('~'+ this.value +'~');
            },
            // Check if the element is valid and its neighbors are supported
            isValid: function(prevEl, nextEl) {
                // ... see plugin code
            },
            // After the element has been added after user input
            afterAdd: function () {},
            // Before element remove from parent.elements[] and $el.remove()
            onDestroy: function() {}
        }
    }
});
``` 