const css = require('css');

let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;

let rules = [];

let stack = [{ type: "document", children: [] }];

// Make use the uniqueness of Symbol instances
// Used as the last input to the state machine 
const EOF = Symbol("EOF");  // EOF: end of file

function data(c) {
    if (c === "<") {
        // A tag starts with a "<"
        // indicates the start of an HTML tag
        // there can be 3 possible tags: open, end, and self-closing

        // -> existing info cannot determine the type of tag, therefore emit nothing
        return tagOpen;
    } else if (c === EOF) {
        // End state

        emit({
            type: "EOF"
        });
        return;
    } else {
        // Treat everything else as text nodes

        emit({
            type: "text",
            content: c  // the first char of the text 
        });
        return data;
    }
}

function emit(token) {
    // Get top of the stack
    let top = stack[stack.length - 1];

    if (token.type === "startTag") {
        // Create an element instance 
        let element = {
            type: "element",
            children: [],
            attributes: []
        };

        element.tagName = token.tagName;

        // Copy all attributes, except "type" and "tagName", from the current tag
        for (let p in token) {
            if (p !== "type" || p !== "tagName") {
                element.attributes.push({
                    name: p,
                    value: token[p]
                });
            }
        }

        computeCSS(element);

        top.children.push(element);
        element.parent = top;

        if (!token.isSelfClosing) {
            stack.push(element);
        }

        currentTextNode = null;
    } else if (token.type === "endTag") {
        if (top.tagName !== token.tagName) {
            throw new Error("Tag start end doesn't match!");
        } else {
            if (top.tagName === "style") {
                addCSSRules(top.children[0].content);
            }
            stack.pop();
        }
        currentTextNode = null;
    } else if (token.type === "text") {
        if (currentTextNode === null) {
            currentTextNode = {
                type: "text",
                content: ""
            };
            top.children.push(currentTextNode);
        }
        currentTextNode.content += token.content;
    }
}

function addCSSRules(text) {
    var ast = css.parse(text);
    rules.push(...ast.stylesheet.rules);
}

function computeCSS(element) {
    var elements = stack.slice().reverse();
    if (!element.computedStyle) {
        element.computedStyle = {};
    }

    for (let rule of rules) {
        var selectorParts = rule.selectors[0].split(" ").reverse();

        console.log(selectorParts);
        console.log(match(element, selectorParts[0]));

        if (!match(element, selectorParts[0])) {
            continue;
        }

        let matched = false;

        var j = 1;  // current selector position
        for (var i = 0; i < elements.length; i++) { // for each element
            if (match(elements[i], selectorParts[j])) {
                j++;
            }
        }

        if (j >= selectorParts.length) {
            matched = true;
        }

        console.log(matched);

        if (matched) {
            console.log("Element", element, "matched rule", rule);
            var sp = specificity(rule.selectors[0]);
            var computedStyle = element.computedStyle;
            for (var declaration of rule.declarations) {
                if (!computedStyle[declaration.property]) {
                    computedStyle[declaration.property] = {};
                }

                if (!computedStyle[declaration.property].specificity) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                }
            }
            console.log(element.computedStyle);
        }
    }
}

// Assuming all selectors are simple selectors
function match(element, selector) {
    console.log("match", element.tagName, selector);
    if (!selector || !element.attributes) { // use .attributes to determine if the current elemenet is a text node
        return false;
    }

    if (selector.charAt(0) === "#") {
        var attr = element.attributes.filter(attr => attr.name === "id")[0];
        if (attr && attr.value === selector.replace("#", "")) {
            return true;
        }
    } else if (selector.charAt(0) === ".") {
        var attr = element.attributes.filter(attr => attr.name === "class")[0];
        if (attr && attr.value === selector.replace(".", "")) {
            return true;
        }
    } else {
        if (element.tagName === selector) {
            return true;
        }
    }
    return false;
}

function specificity(selector) {
    var p = [0, 0, 0, 0];
    var selectorParts = selector.split(" ");
    for (var part of selectorParts) {
        if (part.charAt(0) === "#") {
            p[1] += 1;
        } else if (part.charAt(0) === ".") {
            p[2] += 1;
        } else {
            p[3] += 1;
        }
    }
    return p;
}

function compare(sp1, sp2) {
    if (sp1[0] - sp2[0]) {
        return sp1[0] - sp2[0];
    }
    if (sp1[1] - sp2[1]) {
        return sp1[1] - sp2[1];
    }
    if (sp1[2] - sp2[2]) {
        return sp1[2] - sp2[2];
    }
    return sp1[3] - sp2[3];
}

function tagOpen(c) {
    if (c === "/") {
        // If the immediate char following the "<" is "/", then it's an end tag
        return endTagOpen;
    } else if (c.match(/^[a-zA-Z]$/)) {
        // Get the tag name

        // only update the current token instance
        currentToken = {
            type: "startTag",
            tagName: "" // do not put in the first char of the text 
        };
        return tagName(c);  // send the first char to the `tagName` state
    } else {
        return;
    }
}

function endTagOpen(c) {
    if (c.match(/^[a-zA-Z]$/)) {
        // Get the tag name for the end tag

        // only update the current token instance
        currentToken = {
            type: "endTag",
            tagName: "" // do not put in the first char of the text
        };
        return tagName(c);  // send the first char to the `tagName` state
    } else if (c === ">") {
        // Error syntax "</>"
    } else if (c === EOF) {
        // Error syntax "</EOF"
    } else {
        // Error syntax "</"
    }
}

function tagName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        // Matching spaces
        return beforeAttributeName;
    } else if (c === "/") {
        // If the char following the tag name is "/", then it's a self-closing tag
        // <name/>
        return selfClosingStartTag;
    } else if (c.match(/^[a-zA-Z]$/)) {
        // if the current char is still a non-spacing char
        currentToken.tagName += c;  // concatenate tag name
        return tagName;
    } else if (c === ">") {
        // The ">" char marks the end of the current token, i.e., by seeing a ">", all necessary data in `currentToken` should have been populated
        emit(currentToken);
        return data;
    } else {
        return tagName;
    }
}

function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        // consuming spacing chars
        return beforeAttributeName;
    } else if (c === "/" || c === ">" || c === EOF) {
        return afterAttributeName(c);
    } else if (c === "=") {
        // Invalid syntax
    } else {
        // only update the current attribute instance
        currentAttribute = {
            name: "",
            value: ""
        };
        return attributeName(c);
    }
}

function afterAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return afterAttributeName;
    } else if (c === "/") {
        return selfClosingStartTag;
    } else if (c === "=") {
        return beforeAttributeValue;
    } else if (c === ">") {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
        }
        emit(currentToken);
        return data;
    } else if (c === EOF) {

    } else {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
        }

        currentAttribute = {
            name: "",
            value: ""
        };
        return attributeName(c);
    }
}

function attributeName(c) {
    if (c.match(/^[\t\n\f ]$/) || c === "/" || c === ">" || c === EOF) {
        return afterAttributeName(c);
    } else if (c === "=") {
        return beforeAttributeValue;
    } else if (c === "\u0000") {

    } else if (c === "\"" || c === "'" || c === "<") {

    } else {
        currentAttribute.name += c; // concatenate attribute name
        return attributeName;
    }
}

function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/) || c === "/" || c === ">" || c === EOF) {
        return beforeAttributeValue;
    } else if (c === "\"") {
        return doubleQuotedAttributeValue;
    } else if (c === "\'") {
        return singleQuotedAttributeValue;
    } else if (c === ">") {

    } else {
        return UnquotedAttributeValue(c);
    }
}

function doubleQuotedAttributeValue(c) {
    if (c === "\"") {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
            currentAttribute = {
                name: "",
                value: ""
            };
        }
        return afterQuotedAttributeValue;
    } else if (c === "\u0000") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}

function singleQuotedAttributeValue(c) {
    if (c === "\'") {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
            currentAttribute = {
                name: "",
                value: ""
            };
        }
        return afterQuotedAttributeValue;
    } else if (c === "\u0000") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return singleQuotedAttributeValue;
    }
}

function afterQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === "/") {
        return selfClosingStartTag;
    } else if (c === ">") {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
            currentAttribute = {
                name: "",
                value: ""
            };
        }
        emit(currentToken);
        return data;
    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return afterQuotedAttributeValue;
    }
}

function UnquotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
            currentAttribute = {
                name: "",
                value: ""
            };
        }
        return beforeAttributeName;
    } else if (c === "/") {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
            currentAttribute = {
                name: "",
                value: ""
            };
        }
        return selfClosingStartTag;
    } else if (c === ">") {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
            currentAttribute = {
                name: "",
                value: ""
            };
        }
        emit(currentToken);
        return data;
    } else if (c === "\u0000") {

    } else if (c === "\"" || c === "'" || c === "<" || c === "=" || c === "`") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return UnquotedAttributeValue;
    }
}

function selfClosingStartTag(c) {
    if (c === ">") {
        if (currentAttribute && currentAttribute.name) {
            currentToken[currentAttribute.name] = currentAttribute.value;
            currentAttribute = {
                name: "",
                value: ""
            };
        }
        currentToken.isSelfClosing = true;  // set flag
        emit(currentToken);
        return data;
    } else if (c === "EOF") {

    } else {

    }
}


module.exports.parseHTML = function (html) {
    let state = data;
    for (let c of html) {
        state = state(c);
    }
    state = state(EOF);
    console.log(stack[0]);
    return stack[0];
};