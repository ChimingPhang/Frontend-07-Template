const css = require('css')

const EOF = Symbol('EOF');


let currentToken = null;
let currentAttribute = null;
let stack = [{type: "document", children:[]}]

let rules = []
function addCSSRules(text) {
  var ast = css.parse(text)
  rules.push(...ast.stylesheet.rules)
}

function match(element, selector) {
  if(!selector || !element.attributes)
    return false

  if(selector.charAt(0) == "#") {
    var attr = element.attributes.filter(attr => attr.name === 'id')[0]
    if(attr && attr.value === selector.replace("#", ""))
      return true
  } else if(selector.charAt(0) == ".") {
    var attr = element.attributes.filter(attr => attr.name === 'class')[0]
    if(attr && attr.value === selector.replace(".", ""))
      return true
  } else {
    if(element.tagName === selector)
      return true
  }
  return false
}

function specificity(selector) {
  var p = [0,0,0,0]
  var selectorParts = selector.split(" ")
  for (let part of selectorParts) {
    if(parseFloat.charAt(0) == '#') {
      p[1] += 1
    } else if(part.charAt(0) == '.') {
      p[2] += 1
    } else {
      p[3] += 1
    }
  }
  return p
}

function compare(sp1, sp2) {
  if(sp1[0] - sp2[0])
    return sp1[0] - sp2[0]
  if(sp1[1] - sp2[1])
    return sp1[1] - sp2[1]
  if(sp1[2] - sp2[2])
    return sp1[2] - sp2[2]

  return sp1[3] - sp2[3]
}

function computeCss(element) {
  var elements = stack.slice().reverse()
  if(!element.computedStyle)
    element.computedStyle = {}

  for (let rule of rules) {
    var selectorParts = rule.selectors[0].splice(" ").reverse()
    if(!match(element, selectorParts[0]))
      continue

    let matched = false

    var j = 1
    for (let i = 0; i < elements.length; i++) {
      if(match(elements[i], selectorParts[j])) {
        j++
      }
    }
    if (j >= selectorParts.length)
      matched = true

    if (matched) {
      var sp = specificity(rule.selectors[0])
      var computedStyle = element.computedStyle
      for (let declaration of rule.declarations) {
        if(!computedStyle[declaration.property])
        computedStyle[declaration.property] = {}

        if(!computedStyle[declaration.property].specificity) {
          computedStyle[declaration.property].value = declaration.value
          computedStyle[declaration.property].specificity = sp
        } else if(compare(computedStyle[declaration.property].specificity, sp) < 0) {
          computedStyle[declaration.property].value = declaration.value
          computedStyle[declaration.property].specificity = sp
        }
      }
    }
  }
}

function emit(token) {
    if (token.type === "text")
        return
    let top = stack[stack.length - 1]

    if (token.type == 'startTag') {
        let element = {
            type: 'element',
            children: [],
            attributes: []
        }

        element.tagName = token.tagName

        for (let p in token) {
            if (p != 'type' && p != 'tagName')
                element.attributes.push({
                    name: p,
                    value: token[p]
                })
        }

        computeCss(element)

        top.children.push(element)
        element.parent = top

        if (!token.isSelfClosing)
            stack.push(element)

        currentTextNode = null

    } else if (token.type == 'endTag') {
        if (top.tagName != token.tagName) {
            throw new Error('Tag start end doesn`t match')
        } else {
            if (top.tagName === 'style') {
                addCSSRules(top.children[0].content)
            }
            stack.pop()
        }
        currentTextNode = null
    } else if (token.type == 'text') {
        if (currentTextNode == null) {
            currentTextNode = {
                type: 'text',
                content: ''
            }
            top.children.push(currentTextNode)
        }
        currentTextNode.content += token.content
    }
}

function start(c) {
    if (c === '<') {
        return tagOpen;
    } else if (c == EOF) {
        emit({
            type: 'EOF'
        })
        return;
    } else {
        emit({
            type: 'text',
            content: c
        })
        return start;
    }
}

function tagOpen(c) {
    if (c == '/') {
        return endTagOpen;
    } else if (c.match(/^[a-zA-Z]$/)) {
        // <div
        currentToken = {
            type: 'startTag',
            tagName: ""
        }
        return tagName(c);
    } else {
        return;
    }
}

function endTagOpen(c) {
    if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: ''
        }
        return tagName(c);
    } else if (c == '>') {

    } else if (c == EOF) {

    } else {

    }
}

function tagName(c) {
    // 空白符: tab, 换行符, 禁止符和空格
    if (c.match(/^[\t\n\f ]$/)) { // <p name='xx' 
        return beforeAttributeName;  // 进入解析属性
    } else if (c == '/') { // <input />
        return selfClosingStartTag; // 进入自封闭标签
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken.tagName += c;
        return tagName;
    } else if (c == '>') { // <xxx>data  
        emit(currentToken);
        return start; // 进入解析下一个标签
    } else {
        return tagName;
    }
}

function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c == '>' || c == "/" || c == EOF) {
        return afterAttributeName(c)
    } else if (c == '=') {
        return beforeAttributeName
    } else {
        currentAttribute = {
            name: "",
            value: ""
        }
        return attributeName(c)
    }
}


function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/) || c == "/" || c == ">" || c == EOF) {
        return beforeAttributeValue;  // 进入解析下一个属性
    } else if (c == "\"") {
        return doubleQuoteAttributeValue(c);
    } else if (c == "\'") {
        return singleQuoteAttributeValue(c);
    } else if (c == '>') {
        return start;
    } else {
        return unQuotedAttributeValue(c);
    }
}

// 解析双引号
function doubleQuoteAttributeValue(c) {
    if (c == "\"") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c == "\u0000") {

    } else if (c == EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuoteAttributeValue;
    }
}

// 解析单引号
function singleQuoteAttributeValue(c) {
    if (c == "\'") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c == "\u0000") {

    } else if (c == EOF) {

    } else {
        currentAttribute.value += c;
        return singleQuoteAttributeValue;
    }
}

function afterQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c == "/") {
        return selfClosingStartTag
    } else if (c == " >") {
        currentToken[currentAttribute.name] = currentToken.value
        emit(currentToken)
        return start
    } else if (c == EOF) {

    } else {
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}


function unQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c == '/') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    } else if (c == '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return start;
    } else if (c == "\u0000") {

    } else if (c == "\"" || c == "'" || c == "=" || c == "`") {

    } else if (c == EOF) {

    } else {
        currentAttribute.value += c;
        return unQuotedAttributeValue;
    }
}

function attributeName(c) {
    if (c.match(/^[\t\n\f ]$/) || c == '/' || c == '>' || c == EOF) {
        return afterAttributeName(c);
    } else if (c == '=') {
        return beforeAttributeValue;
    } else if (c == "\u0000") {

    } else if (c == '\"' || c == "'" || c == "<") {

    } else {
        currentAttribute.name += c;
        return attributeName;
    }
}

function afterAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c == "/") {
        return selfClosingStartTag
    } else if (c == " >") {
        currentToken[currentAttribute.name] = currentToken.value
        emit(currentToken)
        return start
    } else if (c == EOF) {

    } else {
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function doubleQuotedAttributeValue(c) {
    if (c == "\"") {
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterQuotedAttributeValue
    } else if (c == "\u0000") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function selfClosingStartTag(c) {
    if (c == '>') {
        currentToken.isSelfCloing = true; // 当前自封闭标签已经结束
        return start;
    } else if (c == EOF) {
        return;
    } else {

    }
}

module.exports.parseHTML = function (html) {
    let state = start;
    for (let c of html) {
        state = state(c);
    }

    state = state(EOF);
    return stack[0]
};
