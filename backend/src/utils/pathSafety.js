const path = require('path');

function normalizeRoot(rootPath) {
  return path.resolve(rootPath);
}

/**
 * Resolve relativePath under rootPath. Returns null if the path escapes root.
 */
function resolvePathWithinRoot(rootPath, relativePath) {
  const root = normalizeRoot(rootPath);
  const resolved = path.resolve(root, relativePath || '.');
  if (resolved === root) return resolved;

  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (!resolved.startsWith(prefix)) return null;
  return resolved;
}

/**
 * Ensure an absolute path stays within rootPath.
 */
function assertPathWithinRoot(rootPath, absolutePath) {
  const root = normalizeRoot(rootPath);
  const resolved = path.resolve(absolutePath);
  if (resolved === root) return resolved;

  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (!resolved.startsWith(prefix)) return null;
  return resolved;
}

function shouldSkipEntry(entry) {
  return typeof entry.isSymbolicLink === 'function' && entry.isSymbolicLink();
}

module.exports = {
  normalizeRoot,
  resolvePathWithinRoot,
  assertPathWithinRoot,
  shouldSkipEntry,
};
