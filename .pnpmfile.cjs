const DROPPED = new Set(["devDependencies", "scripts"]);

const beforePacking = (pkg = {}) =>
	Object.fromEntries(Object.entries(pkg).filter(([key]) => !DROPPED.has(key)));

module.exports = { hooks: { beforePacking } };
