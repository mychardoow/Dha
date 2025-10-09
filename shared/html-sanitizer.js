function sanitizeHtml(str) {
  return str.replace(/[&<>"']/g, function(match) {
    const char2entity = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return char2entity[match];
  });
}

function fixInvalidTagNames(template) {
  return template
    .replace(/id="doc(\d+)"/g, (_, num) => `id="document${num}"`)
    .replace(/id='doc(\d+)'/g, (_, num) => `id='document${num}'`);
}

module.exports = {
  sanitizeHtml,
  fixInvalidTagNames
};