'use strict'

var assert = require('assert')

var castArr = require('cast-array')

module.exports = parseFields

/**
 * parse fields has two signatures:
 * 1)
 * @param {Object} info - graphql resolve info
 * @param {Boolean} [keepRoot] default: true
 * @return {Object} fieldTree
 * 2)
 * @param {Array} asts - ast array
 * @param {Object} [fragments] - optional fragment map
 * @param {Object} [fieldTree] - optional initial field tree
 * @return {Object} fieldTree
 */
function parseFields (/* dynamic */) {
  var tree
  var info = arguments[0]
  var keepRoot = arguments[1]
  var fieldNodes = info && (info.fieldASTs || info.fieldNodes)
  if (fieldNodes) {
    // (info, keepRoot)
    tree = fieldTreeFromAST(fieldNodes, info.fragments)
    if (!keepRoot) {
      var key = firstKey(tree)
      tree = tree[key]
    }
  } else {
    // (asts, fragments, fieldTree)
    const tree = fieldTreeFromAST.apply(this, arguments)
  }
  return tree
}

function fieldTreeFromAST (asts, fragments, init) {
  init = init || {}
  fragments = fragments || {}
  asts = castArr(asts)
  return asts.reduce(function (tree, val) {
    var kind = val.kind
    var name = val.name && val.name.value
    var fragment
    if (kind === 'Field') {
      if(val.arguments){
        tree[name] = tree[name] || {}
        tree[name].arguments = tree[name].arguments || {}
        val.arguments.forEach( arg => { tree[name].arguments[arg.name.value] = arg.value.value } )
      }
      if (val.selectionSet) {
        tree[name] = tree[name] || {}
        tree[name].fields = tree[name].fields || {}
        fieldTreeFromAST(val.selectionSet.selections, fragments, tree[name].fields)
      } else {
        tree[name].key = true
      }
    } else if (kind === 'FragmentSpread') {
      fragment = fragments[name]
      assert(fragment, 'unknown fragment "' + name + '"')
      fieldTreeFromAST(fragment.selectionSet.selections, fragments, tree)
    } else if (kind === 'InlineFragment') {
      fragment = val
      fieldTreeFromAST(fragment.selectionSet.selections, fragments, tree)
    } // else ignore
    return tree
  }, init)
}

function firstKey (obj) {
  for (var key in obj) {
    return key
  }
}
