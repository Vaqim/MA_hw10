module.exports = (message) => {
  console.error(`FATAL: ${message}`);
  process.exit(1);
};
