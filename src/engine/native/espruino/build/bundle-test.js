E.on('init', () => {
  g.clear();
  Terminal.println(process.memory().free);
  Terminal.println(process.memory().usage);
  Terminal.println(process.memory().total);
  Terminal.println(process.memory().history);
});
