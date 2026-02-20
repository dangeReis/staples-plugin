'use strict';

const DEFAULT_OPTIONS = {
  max: 200,
  skipBlankLines: true,
  skipComments: true
};

/**
 * Utility to build a set of comment line numbers for efficient lookup.
 * @param {import('eslint').SourceCode} sourceCode
 * @returns {Set<number>}
 */
function buildCommentLineSet(sourceCode) {
  const commentLines = new Set();

  for (const comment of sourceCode.getAllComments()) {
    const { start, end } = comment.loc;
    for (let line = start.line; line <= end.line; line += 1) {
      commentLines.add(line);
    }
  }

  return commentLines;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when files grow beyond the soft line limit',
      recommended: false
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'integer',
            minimum: 1
          },
          skipBlankLines: {
            type: 'boolean'
          },
          skipComments: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      exceed: 'File has {{actual}} significant lines which exceeds the soft limit of {{max}} lines.'
    }
  },
  create(context) {
    const options = { ...DEFAULT_OPTIONS, ...(context.options[0] || {}) };
    const { max, skipBlankLines, skipComments } = options;

    return {
      Program(node) {
        const sourceCode = context.getSourceCode();
        const commentLines = skipComments ? buildCommentLineSet(sourceCode) : new Set();
        const lines = sourceCode.lines;

        let count = 0;

        for (let index = 0; index < lines.length; index += 1) {
          const lineNumber = index + 1;
          const text = lines[index];
          const isBlank = text.trim().length === 0;
          const isComment = commentLines.has(lineNumber);

          if ((skipBlankLines && isBlank) || (skipComments && isComment)) {
            continue;
          }

          count += 1;
        }

        if (count > max) {
          context.report({
            node,
            loc: { line: max + 1, column: 0 },
            messageId: 'exceed',
            data: { max, actual: count }
          });
        }
      }
    };
  }
};
