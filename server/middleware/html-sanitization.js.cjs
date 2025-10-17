import { sanitizeHtml, fixInvalidTagNames } from '../shared/html-sanitizer.js';

export async function htmlSanitizationMiddleware(req, res, next) {
  const originalSend = res.send;

  res.send = function(body) {
    if (typeof body === 'string' && (body.includes('<!DOCTYPE html>') || body.includes('<html'))) {
      // Handle HTML content
      const sanitized = fixInvalidTagNames(sanitizeHtml(body));
      return originalSend.call(this, sanitized);
    }
    return originalSend.call(this, body);
  };

  next();
}